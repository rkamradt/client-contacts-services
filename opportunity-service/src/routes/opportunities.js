'use strict';

const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { validateResult } = require('../middleware/validate');
const svc = require('../services/opportunities');

const router = Router();

// ---------------------------------------------------------------------------
// POST /opportunities — Create a new sales opportunity
// ---------------------------------------------------------------------------
router.post(
  '/opportunities',
  [
    body('title').isString().trim().notEmpty().withMessage('title is required'),
    body('accountId').isString().trim().notEmpty().withMessage('accountId is required'),
    body('ownerId').isString().trim().notEmpty().withMessage('ownerId is required'),
    body('value')
      .isFloat({ min: 0 })
      .withMessage('value must be a non-negative number'),
    body('currency')
      .optional()
      .isString()
      .isLength({ min: 3, max: 3 })
      .withMessage('currency must be a 3-character ISO code'),
    body('stage')
      .optional()
      .isIn(svc.PIPELINE_STAGES)
      .withMessage(`stage must be one of: ${svc.PIPELINE_STAGES.join(', ')}`),
    body('probability')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('probability must be between 0 and 100'),
    body('expectedCloseDate')
      .isISO8601()
      .withMessage('expectedCloseDate must be a valid ISO 8601 date'),
    body('contactId').optional().isString().trim(),
    body('description').optional().isString(),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const opportunity = await svc.createOpportunity(req.body);
      res.status(201).json(opportunity);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /opportunities — List / query opportunities
// ---------------------------------------------------------------------------
router.get(
  '/opportunities',
  [
    query('stage')
      .optional()
      .isIn(svc.PIPELINE_STAGES)
      .withMessage(`stage must be one of: ${svc.PIPELINE_STAGES.join(', ')}`),
    query('ownerId').optional().isString().trim(),
    query('accountId').optional().isString().trim(),
    query('fromDate').optional().isISO8601().withMessage('fromDate must be ISO 8601'),
    query('toDate').optional().isISO8601().withMessage('toDate must be ISO 8601'),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const result = await svc.listOpportunities(req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /opportunities/:id — Retrieve opportunity details
// ---------------------------------------------------------------------------
router.get(
  '/opportunities/:id',
  [param('id').isString().trim().notEmpty().withMessage('id is required')],
  async (req, res, next) => {
    try {
      validateResult(req);
      const opportunity = await svc.getOpportunity(req.params.id);
      res.json(opportunity);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /opportunities/:id — Update opportunity details
// ---------------------------------------------------------------------------
router.put(
  '/opportunities/:id',
  [
    param('id').isString().trim().notEmpty().withMessage('id is required'),
    body('title').optional().isString().trim().notEmpty(),
    body('value').optional().isFloat({ min: 0 }).withMessage('value must be a non-negative number'),
    body('currency')
      .optional()
      .isString()
      .isLength({ min: 3, max: 3 })
      .withMessage('currency must be a 3-character ISO code'),
    body('expectedCloseDate').optional().isISO8601().withMessage('expectedCloseDate must be ISO 8601'),
    body('probability')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('probability must be between 0 and 100'),
    body('description').optional().isString(),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const opportunity = await svc.updateOpportunity(req.params.id, req.body);
      res.json(opportunity);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /opportunities/:id/stage — Update opportunity pipeline stage
// ---------------------------------------------------------------------------
router.put(
  '/opportunities/:id/stage',
  [
    param('id').isString().trim().notEmpty().withMessage('id is required'),
    body('stage')
      .isIn(svc.PIPELINE_STAGES)
      .withMessage(`stage must be one of: ${svc.PIPELINE_STAGES.join(', ')}`),
    body('lossReason').optional().isString().trim(),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const result = await svc.updateStage(
        req.params.id,
        req.body.stage,
        req.body.lossReason
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /opportunities/:id/forecast — Weighted revenue forecast
// ---------------------------------------------------------------------------
router.get(
  '/opportunities/:id/forecast',
  [param('id').isString().trim().notEmpty().withMessage('id is required')],
  async (req, res, next) => {
    try {
      validateResult(req);
      const forecast = await svc.getForecast(req.params.id);
      res.json(forecast);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
