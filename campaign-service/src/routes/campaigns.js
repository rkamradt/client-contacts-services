'use strict';

const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { validateResult } = require('../middleware/validate');
const campaignService = require('../services/campaigns');

const router = Router();

// ---------------------------------------------------------------------------
// GET /campaigns — List campaigns with filtering
// ---------------------------------------------------------------------------
router.get(
  '/campaigns',
  [
    query('status')
      .optional()
      .isIn(['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'])
      .withMessage('Invalid status value'),
    query('type')
      .optional()
      .isIn(['email_blast', 'drip_sequence', 'newsletter', 'promotional'])
      .withMessage('Invalid type value'),
    query('ownerId').optional().isString().withMessage('ownerId must be a string'),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const { status, type, ownerId, page, limit } = req.query;
      const result = await campaignService.listCampaigns({ status, type, ownerId, page, limit });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /campaigns — Create a new campaign
// ---------------------------------------------------------------------------
router.post(
  '/campaigns',
  [
    body('name').notEmpty().withMessage('name is required'),
    body('type')
      .notEmpty()
      .isIn(['email_blast', 'drip_sequence', 'newsletter', 'promotional'])
      .withMessage('type must be one of: email_blast, drip_sequence, newsletter, promotional'),
    body('ownerId').notEmpty().withMessage('ownerId is required'),
    body('status')
      .optional()
      .isIn(['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'])
      .withMessage('Invalid status value'),
    body('description').optional().isString(),
    body('autoEnroll').optional().isBoolean(),
    body('schedule').optional().isObject(),
    body('settings').optional().isObject(),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const campaign = await campaignService.createCampaign(req.body);
      res.status(201).json({ campaign });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /campaigns/:id — Retrieve campaign details and metrics
// ---------------------------------------------------------------------------
router.get(
  '/campaigns/:id',
  [param('id').notEmpty().withMessage('id is required')],
  async (req, res, next) => {
    try {
      validateResult(req);
      const campaign = await campaignService.getCampaign(req.params.id);
      res.json({ campaign });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /campaigns/:id — Update campaign settings or status
// ---------------------------------------------------------------------------
router.put(
  '/campaigns/:id',
  [
    param('id').notEmpty().withMessage('id is required'),
    body('name').optional().isString().notEmpty().withMessage('name must not be empty'),
    body('type')
      .optional()
      .isIn(['email_blast', 'drip_sequence', 'newsletter', 'promotional'])
      .withMessage('Invalid type'),
    body('status')
      .optional()
      .isIn(['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'])
      .withMessage('Invalid status'),
    body('description').optional().isString(),
    body('autoEnroll').optional().isBoolean(),
    body('schedule').optional().isObject(),
    body('settings').optional().isObject(),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const campaign = await campaignService.updateCampaign(req.params.id, req.body);
      res.json({ campaign });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /campaigns/:id/contacts — Add contacts to a campaign
// ---------------------------------------------------------------------------
router.post(
  '/campaigns/:id/contacts',
  [
    param('id').notEmpty().withMessage('id is required'),
    body('contactIds')
      .optional()
      .isArray()
      .withMessage('contactIds must be an array'),
    body('contactIds.*').optional().isString().withMessage('Each contactId must be a string'),
    body('segmentId').optional().isString(),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);

      const { contactIds, segmentId } = req.body;
      if ((!contactIds || contactIds.length === 0) && !segmentId) {
        const err = new Error('Provide at least one contactId or a segmentId');
        err.status = 400;
        throw err;
      }

      const result = await campaignService.addContacts(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /campaigns/:id/contacts/:contactId — Remove contact from campaign
// ---------------------------------------------------------------------------
router.delete(
  '/campaigns/:id/contacts/:contactId',
  [
    param('id').notEmpty().withMessage('id is required'),
    param('contactId').notEmpty().withMessage('contactId is required'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const result = await campaignService.removeContact(req.params.id, req.params.contactId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /campaigns/:id/contacts — List contacts enrolled in a campaign
// ---------------------------------------------------------------------------
router.get(
  '/campaigns/:id/contacts',
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
      const result = await campaignService.listCampaignContacts(req.params.id, { page, limit });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /campaigns/:id/send — Execute campaign send
// ---------------------------------------------------------------------------
router.post(
  '/campaigns/:id/send',
  [
    param('id').notEmpty().withMessage('id is required'),
    body('sendAt').optional().isISO8601().withMessage('sendAt must be a valid ISO 8601 date'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const result = await campaignService.sendCampaign(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /campaigns/:id/analytics — Get campaign performance metrics
// ---------------------------------------------------------------------------
router.get(
  '/campaigns/:id/analytics',
  [param('id').notEmpty().withMessage('id is required')],
  async (req, res, next) => {
    try {
      validateResult(req);
      const analytics = await campaignService.getCampaignAnalytics(req.params.id);
      res.json(analytics);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
