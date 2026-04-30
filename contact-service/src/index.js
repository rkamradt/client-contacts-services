'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const contactsRouter = require('./routes/contacts');
const accountsRouter = require('./routes/accounts');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Global middleware ──────────────────────────────────────────────────────────
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'contact-service' });
});

// ── Domain routes ──────────────────────────────────────────────────────────────
app.use(contactsRouter);
app.use(accountsRouter);

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// ── Central error handler (MUST be last) ──────────────────────────────────────
app.use(errorHandler);

// ── Start server ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`[contact-service] Listening on port ${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
});

module.exports = app; // export for testing
