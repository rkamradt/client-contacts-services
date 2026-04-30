'use strict';

const { Router } = require('express');
const { param } = require('express-validator');
const { validateResult } = require('../middleware/validate');
const dashboardsSvc = require('../services/dashboards');

const router = Router();

// ---------------------------------------------------------------------------
// GET /dashboards/:userId
// ---------------------------------------------------------------------------
router.get(
  '/dashboards/:userId',
  [
    param('userId').isString().trim().notEmpty().withMessage('userId path parameter is required'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const { userId } = req.params;
      const dashboard = await dashboardsSvc.getDashboard(userId);
      return res.status(200).json(dashboard);
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
