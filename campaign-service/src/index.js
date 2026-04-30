'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const campaignRoutes = require('./routes/campaigns');
const segmentRoutes = require('./routes/segments');
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
  res.json({ ok: true, service: 'campaign-service' });
});

// ---------------------------------------------------------------------------
// Domain routes
// ---------------------------------------------------------------------------
app.use(campaignRoutes);
app.use(segmentRoutes);

// ---------------------------------------------------------------------------
// Error handler — must be mounted LAST
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`[campaign-service] Listening on port ${PORT}`);
});

module.exports = app;
