const { User, Appointment, Sale, SupplyOrder, AuditLog } = require('../models');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, escapeRegex } = require('../utils/http');
const { runInTransaction } = require('../database/transaction');
const { PROFILE_MODELS, ADMIN_EDITABLE, pick, shapeUser } = require('../utils/profiles');

async function attachProfiles(users) {
  const byRole = {};
  users.forEach((u) => { (byRole[u.role] ||= []).push(u._id); });
  const profiles = new Map();
  await Promise.all(Object.entries(byRole).map(async ([role, ids]) => {
    const Model = PROFILE_MODELS[role];
    if (!Model) return;
    (await Model.find({ user: { $in: ids } }).lean({ virtuals: true })).forEach((p) => profiles.set(String(p.user), p));
  }));
  return users.map((u) => shapeUser(u, profiles.get(String(u._id))));
}

async function hasActivity(role, profileId) {
  const checks = {
    doctor: () => Appointment.exists({ doctor: profileId }),
    patient: () => Appointment.exists({ patient: profileId }),
    pharmacist: () => Sale.exists({ pharmacist: profileId }),
    supplier: () => SupplyOrder.exists({ supplier: profileId }),
  };
  return checks[role] ? Boolean(await checks[role]()) : false;
}

// GET /api/admin/users?role=&search=&status=
exports.listUsers = asyncHandler(async (req, res) => {
  const { role, search, status } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ username: rx }, { email: rx }];
  }
  const users = await User.find(filter).sort({ role: 1, createdAt: -1 }).lean();
  ok(res, await attachProfiles(users));
});

// POST /api/admin/users  { username, email, password, role, profile }
exports.createUser = asyncHandler(async (req, res) => {
  const { username, email, password, role, profile = {} } = req.body;
  if (role === 'admin') throw ApiError.badRequest('Meridian has exactly one administrator');
  const Model = PROFILE_MODELS[role];
  if (!Model) throw ApiError.badRequest('Choose a valid role');
  if (!password || password.length < 8) throw ApiError.badRequest('Temporary password needs at least 8 characters');

  const passwordHash = await User.hashPassword(password);
  const created = await runInTransaction(async (session) => {
    const [user] = await User.create([{ username, email, passwordHash, role }], { session });
    const [p] = await Model.create([{ user: user._id, ...pick(profile, ADMIN_EDITABLE[role]) }], { session });
    return shapeUser(user.toObject(), p.toObject({ virtuals: true }));
  });
  ok(res, created, 'User created', 201);
});

// PUT /api/admin/users/:id
exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User');
  ['username', 'email'].forEach((k) => { if (req.body[k]) user[k] = req.body[k]; });
  if (req.body.password) user.passwordHash = await User.hashPassword(req.body.password);
  user.$locals.auditActor = req.user.id;
  await user.save();
  const Model = PROFILE_MODELS[user.role];
  if (Model && req.body.profile) {
    await Model.findOneAndUpdate({ user: user._id }, { $set: pick(req.body.profile, ADMIN_EDITABLE[user.role]) }, { runValidators: true });
  }
  const [shaped] = await attachProfiles([user.toObject()]);
  ok(res, shaped, 'User updated');
});

// PATCH /api/admin/users/:id/toggle — activate / deactivate
exports.toggleActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User');
  if (user.role === 'admin') throw ApiError.badRequest('The administrator account cannot be deactivated');
  user.isActive = !user.isActive;
  user.$locals.auditActor = req.user.id;
  await user.save();
  ok(res, { id: user._id, isActive: user.isActive }, user.isActive ? 'User activated' : 'User deactivated');
});

// PATCH /api/admin/users/:id/role  { role, profile } — re-assign a role (only for accounts with no history)
exports.changeRole = asyncHandler(async (req, res) => {
  const { role, profile = {} } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User');
  if (user.role === 'admin' || role === 'admin') throw ApiError.badRequest('The administrator role cannot be reassigned');
  if (!PROFILE_MODELS[role]) throw ApiError.badRequest('Choose a valid role');
  if (role === user.role) throw ApiError.badRequest(`User is already a ${role}`);

  const OldModel = PROFILE_MODELS[user.role];
  const old = await OldModel.findOne({ user: user._id }).lean();
  if (old && await hasActivity(user.role, old._id)) {
    throw ApiError.conflict('This user has clinical or stock records. Deactivate the account and create a new one instead.');
  }
  await runInTransaction(async (session) => {
    if (old) await OldModel.deleteOne({ _id: old._id }, { session });
    await PROFILE_MODELS[role].create([{ user: user._id, ...pick({ firstName: old?.firstName, lastName: old?.lastName, phone: old?.phone, ...profile }, ADMIN_EDITABLE[role]) }], { session });
    await User.updateOne({ _id: user._id }, { $set: { role } }, { session });
  });
  ok(res, null, `Role changed to ${role}`);
});

// DELETE /api/admin/users/:id
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User');
  if (user.role === 'admin') throw ApiError.badRequest('The administrator account cannot be deleted');
  const Model = PROFILE_MODELS[user.role];
  const profile = Model ? await Model.findOne({ user: user._id }).lean() : null;
  if (profile && await hasActivity(user.role, profile._id)) {
    throw ApiError.conflict('This user has linked records. Deactivate the account instead of deleting it.');
  }
  await runInTransaction(async (session) => {
    if (profile) await Model.deleteOne({ _id: profile._id }, { session });
    await User.findOneAndDelete({ _id: user._id }, { session, actor: req.user.id });
  });
  ok(res, null, 'User deleted');
});

// GET /api/admin/audit-logs
exports.auditLogs = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(Number(req.query.limit) || 100)
    .populate('user', 'username role').lean();
  ok(res, logs);
});

