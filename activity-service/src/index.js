'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const activitiesRouter = require('./routes/activities');
const contactsRouter = require('./routes/contacts');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ─── Global middleware ────────────────────────────────────────────────────────
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'activity-service' });
});

// ─── Domain routes ────────────────────────────────────────────────────────────
app.use(activitiesRouter);
app.use(contactsRouter);

// ─── 404 catch-all ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}`, details: [] });
});

// ─── Error handler (must be last) ────────────────────────────────────────────
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.info(`[activity-service] Listening on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
});

module.exports = app;
