'use strict';

const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { validateResult } = require('../middleware/validate');
const userService = require('../services/users');

const router = Router();

// ---------------------------------------------------------------------------
// GET /users — Search and list users with filtering
// ---------------------------------------------------------------------------
router.get(
  '/users',
  [
    query('territoryId').optional().isString().trim(),
    query('role').optional().isString().trim(),
    query('managerId').optional().isString().trim(),
    query('isActive').optional().isIn(['true', 'false']),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const { territoryId, role, managerId, isActive } = req.query;
      const result = await userService.listUsers({ territoryId, role, managerId, isActive });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /users/:id — Retrieve user profile and business context
// ---------------------------------------------------------------------------
router.get(
  '/users/:id',
  [param('id').isString().trim().notEmpty().withMessage('User id is required')],
  async (req, res, next) => {
    try {
      validateResult(req);
      const user = await userService.getUserById(req.params.id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /users/:id — Update user profile information
// ---------------------------------------------------------------------------
router.put(
  '/users/:id',
  [
    param('id').isString().trim().notEmpty().withMessage('User id is required'),
    body('firstName').optional().isString().trim().notEmpty().withMessage('firstName must be a non-empty string'),
    body('lastName').optional().isString().trim().notEmpty().withMessage('lastName must be a non-empty string'),
    body('email').optional().isEmail().withMessage('email must be a valid email address'),
    body('phone').optional().isString().trim(),
    body('title').optional().isString().trim(),
    body('managerId').optional({ nullable: true }).isString().trim(),
    body('avatarUrl').optional().isURL().withMessage('avatarUrl must be a valid URL'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const user = await userService.updateUser(req.params.id, req.body);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /users/:id/territory — Get user's sales territory assignment
// ---------------------------------------------------------------------------
router.get(
  '/users/:id/territory',
  [param('id').isString().trim().notEmpty().withMessage('User id is required')],
  async (req, res, next) => {
    try {
      validateResult(req);
      const territory = await userService.getUserTerritory(req.params.id);
      res.json(territory);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /users/:id/territory — Assign user to a different sales territory
// ---------------------------------------------------------------------------
router.put(
  '/users/:id/territory',
  [
    param('id').isString().trim().notEmpty().withMessage('User id is required'),
    body('territoryId')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('territoryId is required'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const user = await userService.assignUserTerritory(req.params.id, req.body.territoryId);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /users/:id/subordinates — Get team members reporting to this user
// ---------------------------------------------------------------------------
router.get(
  '/users/:id/subordinates',
  [param('id').isString().trim().notEmpty().withMessage('User id is required')],
  async (req, res, next) => {
    try {
      validateResult(req);
      const result = await userService.getUserSubordinates(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /users/:id/role — Update user's role and permissions
// ---------------------------------------------------------------------------
router.put(
  '/users/:id/role',
  [
    param('id').isString().trim().notEmpty().withMessage('User id is required'),
    body('role')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('role is required')
      .isIn(['admin', 'sales_manager', 'sales_rep', 'sdr', 'marketing', 'viewer'])
      .withMessage('role must be one of: admin, sales_manager, sales_rep, sdr, marketing, viewer'),
    body('permissions')
      .optional()
      .isArray()
      .withMessage('permissions must be an array of strings'),
    body('permissions.*')
      .optional()
      .isString()
      .withMessage('each permission must be a string'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const user = await userService.updateUserRole(req.params.id, {
        role: req.body.role,
        permissions: req.body.permissions,
      });
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
