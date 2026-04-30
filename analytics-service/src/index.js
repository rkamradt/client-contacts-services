'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const reportsRouter    = require('./routes/reports');
const dashboardsRouter = require('./routes/dashboards');
const metricsRouter    = require('./routes/metrics');
const analyticsRouter  = require('./routes/analytics');
const errorHandler     = require('./middleware/errorHandler');

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
  res.json({ ok: true, service: 'analytics-service' });
});

// ---------------------------------------------------------------------------
// Domain routes
// ---------------------------------------------------------------------------
app.use(reportsRouter);
app.use(dashboardsRouter);
app.use(metricsRouter);
app.use(analyticsRouter);

// ---------------------------------------------------------------------------
// Error handler (must be last)
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`[analytics-service] Listening on port ${PORT}`);
});

module.exports = app;
