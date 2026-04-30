'use strict';

const { Router } = require('express');
const { param } = require('express-validator');
const { validateResult } = require('../middleware/validate');
const territoriesService = require('../services/territories');

const router = Router();

// ---------------------------------------------------------------------------
// GET /territories/:id/users — List all users assigned to a territory
// ---------------------------------------------------------------------------
router.get(
  '/territories/:id/users',
  [
    param('id')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Territory id is required'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const result = await territoriesService.listUsersInTerritory(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
