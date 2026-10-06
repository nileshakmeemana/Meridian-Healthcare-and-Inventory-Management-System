// config/db.js — MongoDB connection (replaces the Oracle connection pool)
const dns = require('dns');
const mongoose = require('mongoose');

// On Windows / environments with IPv6 link-local DNS, Node c-ares can fail SRV queries.
// Use public DNS there so the Atlas SRV record resolves. Skipped on Vercel/Linux, where the default resolver works.
if (process.platform === 'win32' || process.env.MONGODB_DNS_SERVERS) {
  try {
    dns.setServers((process.env.MONGODB_DNS_SERVERS || '8.8.8.8,1.1.1.1').split(','));
  } catch {
    // ignore
  }
}

const state = { supportsTransactions: false };

async function connectDB(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is not set. Copy .env.example to .env (or set it in Vercel → Settings → Environment Variables).');
  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 });

  // Transactions (used by the stored-procedure layer) need a replica set or Atlas.
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    state.supportsTransactions = Boolean(hello.setName || hello.msg === 'isdbgrid');
  } catch {
    state.supportsTransactions = false;
  }

  console.log(`✅ MongoDB connected → ${mongoose.connection.name}`);
  if (!state.supportsTransactions) {
    console.warn('⚠️  Standalone MongoDB detected: procedures will run without multi-document transactions.');
  }
  return mongoose.connection;
}

module.exports = { connectDB, dbState: state };
