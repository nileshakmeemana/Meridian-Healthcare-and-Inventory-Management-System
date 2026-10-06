require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const { connectDB } = require('./config/db');
const { createViews } = require('./database/views');

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
    await createViews(mongoose.connection.db);   // keeps views in sync with the code on every boot
    const server = app.listen(PORT, () => console.log(`🚀 Meridian API → http://localhost:${PORT}/api`));
    const shutdown = async () => { server.close(); await mongoose.disconnect(); process.exit(0); };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
  }
})();
