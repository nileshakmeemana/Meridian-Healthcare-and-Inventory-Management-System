// JWT authentication + role-based access control
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const { User } = require('../models');

const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  return process.env.JWT_SECRET;
};

const signToken = (payload) => jwt.sign(payload, secret(), { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

/** Verifies the Bearer token and re-checks the account is still active */
async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) throw ApiError.unauthorized('Sign in to continue');
    let decoded;
    try {
      decoded = jwt.verify(header.slice(7), secret());
    } catch (e) {
      throw ApiError.unauthorized(e.name === 'TokenExpiredError' ? 'Your session expired. Sign in again.' : 'Invalid session token');
    }
    const user = await User.findById(decoded.sub).select('role isActive').lean();
    if (!user) throw ApiError.unauthorized('Account no longer exists');
    if (!user.isActive) throw ApiError.forbidden('This account is deactivated. Contact the administrator.');
    req.user = { id: decoded.sub, role: user.role, profileId: decoded.profileId };
    next();
  } catch (err) {
    next(err);
  }
}

/** authorize('admin','pharmacist') */
const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
  return next();
};

module.exports = { authenticate, authorize, signToken };
