'use strict';

const { v4: uuidv4 } = require('uuid');
const { emit } = require('../events/emitter');

/**
 * In-memory store for accounts (companies).
 * Schema:
 * {
 *   id: string (uuid),
 *   name: string,
 *   industry: string | null,   e.g. 'Technology', 'Finance', 'Healthcare'
 *   website: string | null,
 *   phone: string | null,
 *   address: {
 *     street: string | null,
 *     city: string | null,
 *     state: string | null,
 *     postalCode: string | null,
 *     country: string | null,
 *   } | null,
 *   description: string | null,
 *   createdAt: string (ISO 8601),
 *   updatedAt: string (ISO 8601),
 * }
 */
const accountsStore = new Map();

/**
 * List accounts with optional pagination.
 *
 * @param {{ page?: number, limit?: number }} options
 * @returns {Promise<{ data: object[], total: number, page: number, limit: number }>}
 */
async function listAccounts({ page = 1, limit = 20 } = {}) {
  const results = Array.from(accountsStore.values());
  const total = results.length;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const start = (pageNum - 1) * limitNum;
  const data = results.slice(start, start + limitNum);
  return { data, total, page: pageNum, limit: limitNum };
}

/**
 * Retrieve a single account by ID.
 *
 * @param {string} id
 * @returns {Promise<object>}
 */
async function getAccount(id) {
  const account = accountsStore.get(id);
  if (!account) {
    const err = new Error(`Account not found: ${id}`);
    err.status = 404;
    throw err;
  }
  return account;
}

/**
 * Create a new account/company.
 *
 * @param {{ name: string, industry?: string, website?: string, phone?: string, address?: object, description?: string }} data
 * @returns {Promise<object>}
 */
async function createAccount({ name, industry, website, phone, address, description }) {
  const now = new Date().toISOString();

  const account = {
    id: uuidv4(),
    name,
    industry: industry || null,
    website: website || null,
    phone: phone || null,
    address: address
      ? {
          street: address.street || null,
          city: address.city || null,
          state: address.state || null,
          postalCode: address.postalCode || null,
          country: address.country || null,
        }
      : null,
    description: description || null,
    createdAt: now,
    updatedAt: now,
  };

  accountsStore.set(account.id, account);

  emit('account.created', {
    eventType: 'account.created',
    accountId: account.id,
    name: account.name,
    industry: account.industry,
    createdAt: account.createdAt,
  });

  return account;
}

/**
 * Update an existing account.
 *
 * @param {string} id
 * @param {{ name?: string, industry?: string, website?: string, phone?: string, address?: object, description?: string }} data
 * @returns {Promise<object>}
 */
async function updateAccount(id, { name, industry, website, phone, address, description }) {
  const existing = await getAccount(id);
  const now = new Date().toISOString();

  if (name !== undefined) existing.name = name;
  if (industry !== undefined) existing.industry = industry;
  if (website !== undefined) existing.website = website;
  if (phone !== undefined) existing.phone = phone;
  if (description !== undefined) existing.description = description;
  if (address !== undefined) {
    existing.address = {
      street: (address && address.street) || null,
      city: (address && address.city) || null,
      state: (address && address.state) || null,
      postalCode: (address && address.postalCode) || null,
      country: (address && address.country) || null,
    };
  }

  existing.updatedAt = now;
  accountsStore.set(id, existing);

  return existing;
}

module.exports = {
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
};
