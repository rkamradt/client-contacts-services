'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const usersRouter = require('./routes/users');
const territoriesRouter = require('./routes/territories');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'user-service' });
});

// ---------------------------------------------------------------------------
// Domain routes
// ---------------------------------------------------------------------------
app.use(usersRouter);
app.use(territoriesRouter);

// ---------------------------------------------------------------------------
// Centralised error handler — MUST be last
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.info(`[user-service] listening on port ${PORT}`);
});

module.exports = app; // export for testing
