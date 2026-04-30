'use strict';

const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { validateResult } = require('../middleware/validate');
const accountsService = require('../services/accounts');
const contactsService = require('../services/contacts');

const router = Router();

// ─── POST /accounts — Create a new account/company ───────────────────────────
router.post(
  '/accounts',
  [
    body('name').trim().notEmpty().withMessage('name is required'),
    body('industry').optional({ nullable: true }).trim(),
    body('website')
      .optional({ nullable: true })
      .trim()
      .isURL({ require_protocol: true })
      .withMessage('website must be a valid URL including protocol'),
    body('phone').optional({ nullable: true }).trim(),
    body('description').optional({ nullable: true }).trim(),
    body('address').optional({ nullable: true }).isObject().withMessage('address must be an object'),
    body('address.street').optional({ nullable: true }).trim(),
    body('address.city').optional({ nullable: true }).trim(),
    body('address.state').optional({ nullable: true }).trim(),
    body('address.postalCode').optional({ nullable: true }).trim(),
    body('address.country').optional({ nullable: true }).trim(),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const account = await accountsService.createAccount(req.body);
      res.status(201).json(account);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /accounts/:id/contacts — List all contacts for an account ────────────
router.get(
  '/accounts/:id/contacts',
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      // Verify the account exists — throws 404 if not
      await accountsService.getAccount(req.params.id);
      const result = await contactsService.listContactsByAccount(req.params.id, req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
