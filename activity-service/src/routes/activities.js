'use strict';

const { Router } = require('express');
const { body, query, param } = require('express-validator');
const { validateResult } = require('../middleware/validate');
const activitiesService = require('../services/activities');

const router = Router();

const VALID_TYPES = ['call', 'email', 'meeting', 'note'];
const VALID_STATUSES = ['scheduled', 'completed', 'cancelled'];

// ─── POST /activities ─────────────────────────────────────────────────────────
// Log a new activity (call, email, meeting, note)

router.post(
  '/activities',
  [
    body('contactId')
      .notEmpty()
      .withMessage('contactId is required')
      .isUUID()
      .withMessage('contactId must be a valid UUID'),
    body('type')
      .notEmpty()
      .withMessage('type is required')
      .isIn(VALID_TYPES)
      .withMessage(`type must be one of: ${VALID_TYPES.join(', ')}`),
    body('subject')
      .notEmpty()
      .withMessage('subject is required')
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('subject must not exceed 500 characters'),
    body('description')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 5000 })
      .withMessage('description must not exceed 5000 characters'),
    body('ownerId')
      .notEmpty()
      .withMessage('ownerId is required')
      .isUUID()
      .withMessage('ownerId must be a valid UUID'),
    body('status')
      .optional()
      .isIn(VALID_STATUSES)
      .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
    body('scheduledAt')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('scheduledAt must be a valid ISO 8601 date-time'),
    body('completedAt')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('completedAt must be a valid ISO 8601 date-time'),
    body('durationMinutes')
      .optional({ nullable: true })
      .isInt({ min: 0 })
      .withMessage('durationMinutes must be a non-negative integer'),
    body('outcome')
      .optional({ nullable: true })
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('outcome must not exceed 1000 characters'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const activity = await activitiesService.createActivity(req.body);
      res.status(201).json(activity);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /activities ──────────────────────────────────────────────────────────
// Retrieve activities with filtering by contact, type, date range

router.get(
  '/activities',
  [
    query('contactId').optional().isUUID().withMessage('contactId must be a valid UUID'),
    query('type')
      .optional()
      .isIn(VALID_TYPES)
      .withMessage(`type must be one of: ${VALID_TYPES.join(', ')}`),
    query('status')
      .optional()
      .isIn(VALID_STATUSES)
      .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
    query('ownerId').optional().isUUID().withMessage('ownerId must be a valid UUID'),
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('dateFrom must be a valid ISO 8601 date-time'),
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('dateTo must be a valid ISO 8601 date-time'),
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
      const result = await activitiesService.listActivities(req.query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── PUT /activities/:id ──────────────────────────────────────────────────────
// Update activity details or completion status

router.put(
  '/activities/:id',
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    body('subject')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('subject must be between 1 and 500 characters'),
    body('description')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 5000 })
      .withMessage('description must not exceed 5000 characters'),
    body('status')
      .optional()
      .isIn(VALID_STATUSES)
      .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
    body('scheduledAt')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('scheduledAt must be a valid ISO 8601 date-time'),
    body('completedAt')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('completedAt must be a valid ISO 8601 date-time'),
    body('durationMinutes')
      .optional({ nullable: true })
      .isInt({ min: 0 })
      .withMessage('durationMinutes must be a non-negative integer'),
    body('outcome')
      .optional({ nullable: true })
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('outcome must not exceed 1000 characters'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const activity = await activitiesService.updateActivity(req.params.id, req.body);
      res.status(200).json(activity);
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
