// Runs a unit of work atomically. With a replica set / Atlas it uses a real
// multi-document transaction (BEGIN … COMMIT / ROLLBACK). On a standalone
// server it runs the work directly so local development still works.
const mongoose = require('mongoose');
const { dbState } = require('../config/db');

async function runInTransaction(work) {
  if (!dbState.supportsTransactions) return work(null);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => { result = await work(session); });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { runInTransaction };
