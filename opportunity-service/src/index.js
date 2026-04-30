'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const opportunitiesRouter = require('./routes/opportunities');
const accountsRouter = require('./routes/accounts');
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
  res.json({ ok: true, service: 'opportunity-service' });
});

// ---------------------------------------------------------------------------
// Domain routes
// ---------------------------------------------------------------------------
app.use(opportunitiesRouter);
app.use(accountsRouter);

// ---------------------------------------------------------------------------
// Error handler — MUST be last
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`[opportunity-service] listening on port ${PORT}`);
});

module.exports = app;
