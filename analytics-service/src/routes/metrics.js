'use strict';

const { Router } = require('express');
const { query } = require('express-validator');
const { validateResult } = require('../middleware/validate');
const metricsSvc = require('../services/metrics');

const router = Router();

// ---------------------------------------------------------------------------
// GET /metrics/kpis
// ---------------------------------------------------------------------------
router.get(
  '/metrics/kpis',
  [
    query('territory').optional().isString().trim(),
    query('userId').optional().isString().trim(),
    query('period').optional().isIn(['current', 'mtd', 'qtd', 'ytd', 'last-30d', 'last-90d'])
      .withMessage('period must be one of: current, mtd, qtd, ytd, last-30d, last-90d'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const { territory, userId, period } = req.query;
      const kpis = await metricsSvc.getKpis({ territory, userId, period });
      return res.status(200).json(kpis);
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
