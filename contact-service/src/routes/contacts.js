'use strict';

const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { validateResult } = require('../middleware/validate');
const contactsService = require('../services/contacts');

const router = Router();

// ─── POST /contacts — Create a new contact ────────────────────────────────────
router.post(
  '/contacts',
  [
    body('firstName').trim().notEmpty().withMessage('firstName is required'),
    body('lastName').trim().notEmpty().withMessage('lastName is required'),
    body('email').trim().isEmail().withMessage('A valid email is required'),
    body('phone').optional({ nullable: true }).trim(),
    body('title').optional({ nullable: true }).trim(),
    body('accountId').optional({ nullable: true }).isUUID().withMessage('accountId must be a valid UUID'),
    body('type')
      .optional()
      .isIn(['lead', 'contact', 'customer'])
      .withMessage('type must be one of: lead, contact, customer'),
    body('source').optional({ nullable: true }).trim(),
    body('tags').optional().isArray().withMessage('tags must be an array'),
    body('tags.*').optional().isString().withMessage('each tag must be a string'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const contact = await contactsService.createContact(req.body);
      res.status(201).json(contact);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /contacts — Search and list contacts with filtering ──────────────────
router.get(
  '/contacts',
  [
    query('email').optional().trim().isEmail().withMessage('email filter must be a valid email'),
    query('accountId').optional().isUUID().withMessage('accountId must be a valid UUID'),
    query('type')
      .optional()
      .isIn(['lead', 'contact', 'customer'])
      .withMessage('type must be one of: lead, contact, customer'),
    query('source').optional().trim(),
    query('search').optional().trim(),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const result = await contactsService.listContacts(req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /contacts/:id — Retrieve contact details ─────────────────────────────
router.get(
  '/contacts/:id',
  [param('id').isUUID().withMessage('id must be a valid UUID')],
  async (req, res, next) => {
    try {
      validateResult(req);
      const contact = await contactsService.getContact(req.params.id);
      res.json(contact);
    } catch (err) {
      next(err);
    }
  }
);

// ─── PUT /contacts/:id — Update contact information ───────────────────────────
router.put(
  '/contacts/:id',
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    body('firstName').optional().trim().notEmpty().withMessage('firstName cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('lastName cannot be empty'),
    body('email').optional().trim().isEmail().withMessage('A valid email is required'),
    body('phone').optional({ nullable: true }).trim(),
    body('title').optional({ nullable: true }).trim(),
    body('accountId').optional({ nullable: true }).isUUID().withMessage('accountId must be a valid UUID'),
    body('type')
      .optional()
      .isIn(['lead', 'contact', 'customer'])
      .withMessage('type must be one of: lead, contact, customer'),
    body('source').optional({ nullable: true }).trim(),
    body('tags').optional().isArray().withMessage('tags must be an array'),
    body('tags.*').optional().isString().withMessage('each tag must be a string'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const contact = await contactsService.updateContact(req.params.id, req.body);
      res.json(contact);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
