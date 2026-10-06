// Serverless entry for the Express API (used by src/pages/api/[...path].ts).
// Keeps one Mongo connection per warm function instance instead of one per request.
// Views are NOT rebuilt here (that drops/recreates them) — run `npm run seed` or `npm run views` instead.
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');

const g = globalThis;
g.__meridian = g.__meridian || { app: null, ready: null };

async function getApp() {
  if (!g.__meridian.app) g.__meridian.app = require('./app'); // cached so dev reloads don't re-register models
  if (mongoose.connection.readyState !== 1) {
    if (!g.__meridian.ready) {
      g.__meridian.ready = connectDB().catch((err) => { g.__meridian.ready = null; throw err; });
    }
    await g.__meridian.ready;
  }
  return g.__meridian.app;
}

module.exports = { getApp };
