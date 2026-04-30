'use strict';

const { Router } = require('express');
const { param, query } = require('express-validator');
const { validateResult } = require('../middleware/validate');
const accountsSvc = require('../services/accounts');
const { PIPELINE_STAGES } = require('../services/opportunities');

const router = Router();

// ---------------------------------------------------------------------------
// GET /accounts/:accountId/opportunities
// List all opportunities for a specific account
// ---------------------------------------------------------------------------
router.get(
  '/accounts/:accountId/opportunities',
  [
    param('accountId')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('accountId is required'),
    query('stage')
      .optional()
      .isIn(PIPELINE_STAGES)
      .withMessage(`stage must be one of: ${PIPELINE_STAGES.join(', ')}`),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const { accountId } = req.params;
      const { stage, page, limit } = req.query;

      const result = await accountsSvc.listOpportunitiesByAccount(accountId, {
        stage,
        page,
        limit,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
