'use strict';

const { Router } = require('express');
const { param } = require('express-validator');
const { validateResult } = require('../middleware/validate');
const contactsService = require('../services/contacts');

const router = Router();

// ─── GET /contacts/:contactId/timeline ───────────────────────────────────────
// Get chronological activity timeline for a contact

router.get(
  '/contacts/:contactId/timeline',
  [
    param('contactId')
      .isUUID()
      .withMessage('contactId must be a valid UUID'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const result = await contactsService.getContactTimeline(req.params.contactId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
