'use strict';

const { validationResult } = require('express-validator');

/**
 * Reads express-validator results from the request and throws a structured
 * error if any validation rules failed.  Call this at the top of every
 * route handler that performs validation.
 *
 * @param {import('express').Request} req
 * @throws {{ status: 400, message: string, errors: object[] }}
 */
function validateResult(req) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const err = new Error('Validation failed');
    err.status = 400;
    err.errors = result.array();
    throw err;
  }
}

module.exports = { validateResult };
