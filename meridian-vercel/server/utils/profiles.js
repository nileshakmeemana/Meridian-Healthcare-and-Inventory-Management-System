// Maps each role to its profile collection (users ⟶ doctors / patients / … is the "ISA" hierarchy)
const { Doctor, Patient, Pharmacist, Supplier } = require('../models');

const PROFILE_MODELS = { doctor: Doctor, patient: Patient, pharmacist: Pharmacist, supplier: Supplier };

// Fields a user may edit on their own profile, per role
const EDITABLE = {
  patient: ['firstName', 'lastName', 'dateOfBirth', 'gender', 'bloodGroup', 'phone', 'address', 'emergencyContact', 'emergencyPhone', 'allergies'],
  doctor: ['firstName', 'lastName', 'specialization', 'phone', 'experienceYears', 'availableDays', 'consultationFee', 'room', 'bio'],
  pharmacist: ['firstName', 'lastName', 'phone', 'shift'],
  supplier: ['companyName', 'contactPerson', 'phone', 'email', 'address'],
};
// Admin can also set licence numbers and ratings
const ADMIN_EDITABLE = {
  ...EDITABLE,
  doctor: [...EDITABLE.doctor, 'licenseNumber'],
  pharmacist: [...EDITABLE.pharmacist, 'licenseNumber'],
  supplier: [...EDITABLE.supplier, 'licenseNumber', 'rating'],
};

const pick = (obj = {}, keys = []) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

async function loadProfile(user) {
  const Model = PROFILE_MODELS[user.role];
  return Model ? Model.findOne({ user: user._id }).lean({ virtuals: true }) : null;
}

function displayName(user, profile) {
  if (!profile) return user.role === 'admin' ? 'System Administrator' : user.username;
  if (user.role === 'supplier') return profile.companyName;
  if (user.role === 'doctor') return `Dr. ${profile.firstName} ${profile.lastName}`;
  return `${profile.firstName} ${profile.lastName}`;
}

function shapeUser(user, profile) {
  return {
    id: String(user._id), username: user.username, email: user.email, role: user.role,
    isActive: user.isActive, lastLogin: user.lastLogin, createdAt: user.createdAt,
    profileId: profile ? String(profile._id) : null,
    displayName: displayName(user, profile),
    profile: profile || null,
  };
}

module.exports = { PROFILE_MODELS, EDITABLE, ADMIN_EDITABLE, pick, loadProfile, shapeUser, displayName };
