// config/database.js - Oracle DB connection pool
const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = false;

let pool;

const initPool = async () => {
  try {
    pool = await oracledb.createPool({
      user:          process.env.DB_USER     || 'meridian_user',
      password:      process.env.DB_PASSWORD || 'Meridian2026',
      connectString: process.env.DB_CONNECT  || 'localhost:1521/XEPDB1',
      poolMin:       2,
      poolMax:       10,
      poolIncrement: 2,
      poolTimeout:   60,
      queueTimeout:  60000,
    });
    console.log('✅ Oracle DB connection pool initialized');
    return pool;
  } catch (err) {
    console.error('❌ Oracle DB pool init failed:', err.message);
    throw err;
  }
};

const getConnection = async () => {
  if (!pool) await initPool();
  return pool.getConnection();
};

const closePool = async () => {
  if (pool) {
    await pool.close(10);
    console.log('Oracle DB pool closed');
  }
};

/**
 * Execute a query, auto-commit, release connection.
 * binds can be an array [] or object {}
 */
const query = async (sql, binds = [], options = {}) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      ...options,
    });
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    await conn.close();
  }
};

/**
 * Execute on an existing connection without committing (for transactions).
 */
const queryNoCommit = async (conn, sql, binds = [], options = {}) => {
  return conn.execute(sql, binds, {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
    ...options,
  });
};

module.exports = { initPool, getConnection, closePool, query, queryNoCommit, oracledb };
