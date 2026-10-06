const { User, Patient } = require('../models');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok } = require('../utils/http');
const { signToken } = require('../middleware/auth');
const { runInTransaction } = require('../database/transaction');
const { PROFILE_MODELS, EDITABLE, pick, loadProfile, shapeUser } = require('../utils/profiles');

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw ApiError.badRequest('Enter your email and password');

  const identifier = String(email).toLowerCase().trim();
  const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] }).select('+passwordHash');
  if (!user || !(await user.verifyPassword(password))) throw ApiError.unauthorized('Email or password is incorrect');
  if (!user.isActive) throw ApiError.forbidden('This account is deactivated. Contact the administrator.');

  user.lastLogin = new Date();
  await User.updateOne({ _id: user._id }, { $set: { lastLogin: user.lastLogin } });

  const profile = await loadProfile(user);
  const token = signToken({ sub: String(user._id), role: user.role, profileId: profile ? String(profile._id) : null });
  ok(res, { token, user: shapeUser(user, profile) }, 'Signed in');
});

// POST /api/auth/register  — patient self-registration
exports.register = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName, dateOfBirth, gender, phone, address, bloodGroup } = req.body;
  if (!username || !email || !password || !firstName || !lastName || !dateOfBirth || !gender) {
    throw ApiError.badRequest('Fill in all required fields');
  }
  if (!PASSWORD_RULE.test(password)) throw ApiError.badRequest('Password needs at least 8 characters, including a letter and a number');

  const passwordHash = await User.hashPassword(password);
  await runInTransaction(async (session) => {
    const [user] = await User.create([{ username, email, passwordHash, role: 'patient' }], { session });
    await Patient.create([{ user: user._id, firstName, lastName, dateOfBirth, gender, phone, address, bloodGroup: bloodGroup || null }], { session });
  });
  ok(res, null, 'Account created. You can sign in now.', 201);
});

// GET /api/auth/me
exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  if (!user) throw ApiError.notFound('User');
  ok(res, shapeUser(user, await loadProfile(user)));
});

// PUT /api/auth/profile — every role edits its own profile
exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User');
  if (req.body.email && req.body.email !== user.email) user.email = req.body.email;
  user.$locals.auditActor = user._id;
  await user.save();

  const Model = PROFILE_MODELS[user.role];
  if (Model && req.body.profile) {
    await Model.findOneAndUpdate({ user: user._id }, { $set: pick(req.body.profile, EDITABLE[user.role]) }, { runValidators: true });
  }
  ok(res, shapeUser(user.toObject(), await loadProfile(user)), 'Profile saved');
});

// POST /api/auth/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!PASSWORD_RULE.test(newPassword || '')) throw ApiError.badRequest('New password needs at least 8 characters, including a letter and a number');
  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!user || !(await user.verifyPassword(currentPassword || ''))) throw ApiError.badRequest('Current password is incorrect');
  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();
  ok(res, null, 'Password changed');
});
