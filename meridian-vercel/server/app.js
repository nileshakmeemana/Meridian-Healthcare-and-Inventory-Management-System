const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { mongoSanitize } = require('./middleware/security');
const { notFound, errorHandler } = require('./middleware/error');

require('./models'); // register every schema (and its triggers) before routes run

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1); // behind Vercel's proxy — lets the rate limiter see the real client IP
app.use(helmet());
// Same-origin on Vercel (frontend and API share a domain); FRONTEND_URL only matters if the API is called from elsewhere
app.use(cors({ origin: (process.env.FRONTEND_URL || 'http://localhost:3000').split(','), credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '1mb' }));
app.use(mongoSanitize);
if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (_req, res) => res.json({
  status: 'ok', app: 'Meridian API', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
}));
app.use('/api', require('./routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
