'use strict';

const { Router } = require('express');
const { body, query, param } = require('express-validator');
const { validateResult } = require('../middleware/validate');
const reportsSvc = require('../services/reports');

const router = Router();

// ---------------------------------------------------------------------------
// GET /reports/sales-pipeline
// ---------------------------------------------------------------------------
router.get(
  '/reports/sales-pipeline',
  [
    query('ownerId').optional().isString().trim(),
    query('territory').optional().isString().trim(),
    query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO 8601 date'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const { ownerId, territory, startDate, endDate } = req.query;
      const report = await reportsSvc.getSalesPipelineReport({ ownerId, territory, startDate, endDate });
      return res.status(200).json(report);
    } catch (err) {
      return next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /reports/activity-summary
// ---------------------------------------------------------------------------
router.get(
  '/reports/activity-summary',
  [
    query('userId').optional().isString().trim(),
    query('teamId').optional().isString().trim(),
    query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO 8601 date'),
    query('type').optional().isIn(['call', 'email', 'meeting', 'note']).withMessage('type must be call, email, meeting, or note'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const { userId, teamId, startDate, endDate, type } = req.query;
      const report = await reportsSvc.getActivitySummaryReport({ userId, teamId, startDate, endDate, type });
      return res.status(200).json(report);
    } catch (err) {
      return next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /reports/campaign-performance
// ---------------------------------------------------------------------------
router.get(
  '/reports/campaign-performance',
  [
    query('campaignId').optional().isString().trim(),
    query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO 8601 date'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const { campaignId, startDate, endDate } = req.query;
      const report = await reportsSvc.getCampaignPerformanceReport({ campaignId, startDate, endDate });
      return res.status(200).json(report);
    } catch (err) {
      return next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /reports/user-performance
// ---------------------------------------------------------------------------
router.get(
  '/reports/user-performance',
  [
    query('userId').optional().isString().trim(),
    query('teamId').optional().isString().trim(),
    query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO 8601 date'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const { userId, teamId, startDate, endDate } = req.query;
      const report = await reportsSvc.getUserPerformanceReport({ userId, teamId, startDate, endDate });
      return res.status(200).json(report);
    } catch (err) {
      return next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /reports/revenue-forecast
// ---------------------------------------------------------------------------
router.get(
  '/reports/revenue-forecast',
  [
    query('territory').optional().isString().trim(),
    query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO 8601 date'),
    query('groupBy').optional().isIn(['territory', 'period', 'owner']).withMessage('groupBy must be territory, period, or owner'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const { territory, startDate, endDate, groupBy } = req.query;
      const report = await reportsSvc.getRevenueForecast({ territory, startDate, endDate, groupBy });
      return res.status(200).json(report);
    } catch (err) {
      return next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /reports/:id/export
// ---------------------------------------------------------------------------
router.get(
  '/reports/:id/export',
  [
    param('id').isString().trim().notEmpty().withMessage('Report id is required'),
    query('format').optional().isIn(['csv', 'pdf', 'excel']).withMessage('format must be csv, pdf, or excel'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const { id } = req.params;
      const { format } = req.query;
      const result = await reportsSvc.exportReport(id, format || 'csv');
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /reports/custom
// ---------------------------------------------------------------------------
router.post(
  '/reports/custom',
  [
    body('name').isString().trim().notEmpty().withMessage('name is required'),
    body('entity').isIn(['opportunity', 'activity', 'contact', 'campaign', 'revenue']).withMessage('entity must be opportunity, activity, contact, campaign, or revenue'),
    body('filters').optional().isArray(),
    body('filters.*.field').optional().isString().notEmpty(),
    body('filters.*.operator').optional().isIn(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in']),
    body('filters.*.value').optional(),
    body('groupBy').optional().isString().trim(),
    body('metrics').optional().isArray().withMessage('metrics must be an array of strings'),
    body('metrics.*').optional().isString(),
    body('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO 8601 date'),
    body('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO 8601 date'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const { name, entity, filters, groupBy, metrics, startDate, endDate } = req.body;
      const report = await reportsSvc.createCustomReport({ name, entity, filters, groupBy, metrics, startDate, endDate });
      return res.status(201).json(report);
    } catch (err) {
      return next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /reports/schedule
// ---------------------------------------------------------------------------
router.post(
  '/reports/schedule',
  [
    body('reportType').isString().trim().notEmpty().withMessage('reportType is required'),
    body('frequency').isIn(['daily', 'weekly', 'monthly', 'quarterly']).withMessage('frequency must be daily, weekly, monthly, or quarterly'),
    body('recipients').isArray({ min: 1 }).withMessage('recipients must be a non-empty array'),
    body('recipients.*').isEmail().withMessage('each recipient must be a valid email address'),
    body('filters').optional().isObject(),
    body('format').optional().isIn(['csv', 'pdf', 'excel']).withMessage('format must be csv, pdf, or excel'),
    body('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO 8601 date'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const { reportType, frequency, recipients, filters, format, startDate } = req.body;
      const schedule = await reportsSvc.scheduleReport({ reportType, frequency, recipients, filters, format, startDate });
      return res.status(201).json(schedule);
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
