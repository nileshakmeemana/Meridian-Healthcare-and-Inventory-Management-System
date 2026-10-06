const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { auditPlugin } = require('../database/triggers');

const ROLES = ['admin', 'doctor', 'pharmacist', 'supplier', 'patient'];

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true, minlength: 3, maxlength: 50 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
  },
  { timestamps: true }
);

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};
userSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, 12);

userSchema.plugin(auditPlugin, { collectionName: 'users' });

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
