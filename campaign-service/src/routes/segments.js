'use strict';

const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { validateResult } = require('../middleware/validate');
const segmentService = require('../services/segments');

const router = Router();

// ---------------------------------------------------------------------------
// POST /segments — Create a contact segment based on criteria
// ---------------------------------------------------------------------------
router.post(
  '/segments',
  [
    body('name').notEmpty().withMessage('name is required'),
    body('criteria').notEmpty().isObject().withMessage('criteria is required and must be an object'),
    body('criteria.filters')
      .notEmpty()
      .isArray({ min: 1 })
      .withMessage('criteria.filters must be a non-empty array'),
    body('criteria.filters.*.field')
      .notEmpty()
      .isString()
      .withMessage('Each filter must have a field string'),
    body('criteria.filters.*.operator')
      .notEmpty()
      .isIn(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'not_contains', 'in', 'not_in'])
      .withMessage(
        'Each filter operator must be one of: eq, neq, gt, gte, lt, lte, contains, not_contains, in, not_in'
      ),
    body('criteria.filters.*.value').exists().withMessage('Each filter must have a value'),
    body('criteria.logic')
      .optional()
      .isIn(['AND', 'OR'])
      .withMessage('criteria.logic must be AND or OR'),
    body('description').optional().isString(),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const segment = await segmentService.createSegment(req.body);
      res.status(201).json({ segment });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /segments/:id/contacts — Preview contacts matching segment criteria
// ---------------------------------------------------------------------------
router.get(
  '/segments/:id/contacts',
  [
    param('id').notEmpty().withMessage('id is required'),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const { page, limit } = req.query;
      const result = await segmentService.previewSegmentContacts(req.params.id, { page, limit });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
