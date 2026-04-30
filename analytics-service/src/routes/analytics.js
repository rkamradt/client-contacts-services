'use strict';

const { Router } = require('express');
const { query } = require('express-validator');
const { validateResult } = require('../middleware/validate');
const analyticsSvc = require('../services/analytics');

const router = Router();

// ---------------------------------------------------------------------------
// GET /analytics/trends
// ---------------------------------------------------------------------------
router.get(
  '/analytics/trends',
  [
    query('domain')
      .optional()
      .isIn(['opportunity', 'activity', 'campaign', 'contact', 'revenue'])
      .withMessage('domain must be one of: opportunity, activity, campaign, contact, revenue'),
    query('metric').optional().isString().trim(),
    query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO 8601 date'),
    query('granularity')
      .optional()
      .isIn(['day', 'week', 'month', 'quarter'])
      .withMessage('granularity must be one of: day, week, month, quarter'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const { domain, metric, startDate, endDate, granularity } = req.query;
      const trends = await analyticsSvc.getTrends({ domain, metric, startDate, endDate, granularity });
      return res.status(200).json(trends);
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
