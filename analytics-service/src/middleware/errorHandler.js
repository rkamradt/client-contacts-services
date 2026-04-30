'use strict';

/**
 * Central Express error handler.
 * Must be mounted LAST with app.use(errorHandler).
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (status >= 500) {
    console.error('[ErrorHandler]', err);
  }

  return res.status(status).json({
    error: message,
    details: err.errors || [],
  });
}

module.exports = errorHandler;
