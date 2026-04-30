'use strict';

const opportunitiesService = require('./opportunities');

/**
 * List all opportunities for a specific account with optional filtering and
 * pagination.
 *
 * This service does not maintain its own account store — accounts are owned by
 * ContactService. Here we simply query the opportunity store by accountId,
 * which is the foreign key stored on each opportunity record.
 *
 * @param {string} accountId
 * @param {{ stage?, page?, limit? }} filters
 * @returns {{ data: object[], total: number, page: number, limit: number }}
 */
async function listOpportunitiesByAccount(accountId, filters = {}) {
  if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
    const err = new Error('accountId is required');
    err.status = 400;
    throw err;
  }

  const { stage, page = 1, limit = 20 } = filters;

  return opportunitiesService.listOpportunities({
    accountId,
    stage,
    page,
    limit,
  });
}

module.exports = {
  listOpportunitiesByAccount,
};
