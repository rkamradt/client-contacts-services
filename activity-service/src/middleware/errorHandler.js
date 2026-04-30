'use strict';

/**
 * Central Express error handler.
 * Must be mounted LAST in the middleware chain (4-argument signature).
 *
 * @param {Error & { status?: number; errors?: any[] }} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  if (status >= 500) {
    console.error(`[ErrorHandler] ${req.method} ${req.path} → ${status}`, err);
  }

  res.status(status).json({
    error: err.message || 'Internal Server Error',
    details: err.errors || [],
  });
}

module.exports = errorHandler;
