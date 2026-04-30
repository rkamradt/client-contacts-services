'use strict';

/**
 * Central Express error-handling middleware.
 * Must be mounted LAST (after all routes).
 *
 * @param {Error & { status?: number; errors?: any[] }} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (status === 500) {
    console.error('[ErrorHandler]', err);
  }

  res.status(status).json({
    error: message,
    details: err.errors || [],
  });
}

module.exports = errorHandler;
