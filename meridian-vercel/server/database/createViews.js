// Standalone script: npm run views
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const { createViews } = require('./views');

(async () => {
  await connectDB();
  const names = await createViews(mongoose.connection.db);
  console.log('Views created:', names.join(', '));
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
