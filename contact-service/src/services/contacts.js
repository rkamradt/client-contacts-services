'use strict';

const { v4: uuidv4 } = require('uuid');
const { emit } = require('../events/emitter');

/**
 * In-memory store for contacts.
 * Schema:
 * {
 *   id: string (uuid),
 *   firstName: string,
 *   lastName: string,
 *   email: string,
 *   phone: string | null,
 *   title: string | null,
 *   accountId: string | null,
 *   type: 'lead' | 'contact' | 'customer',
 *   source: string | null,   e.g. 'web', 'referral', 'campaign'
 *   tags: string[],
 *   createdAt: string (ISO 8601),
 *   updatedAt: string (ISO 8601),
 * }
 */
const contactsStore = new Map();

/**
 * List / search contacts with optional filters and pagination.
 *
 * @param {{ email?: string, accountId?: string, type?: string, source?: string, search?: string, page?: number, limit?: number }} filters
 * @returns {Promise<{ data: object[], total: number, page: number, limit: number }>}
 */
async function listContacts({ email, accountId, type, source, search, page = 1, limit = 20 } = {}) {
  let results = Array.from(contactsStore.values());

  if (email) {
    const lower = email.toLowerCase();
    results = results.filter((c) => c.email.toLowerCase() === lower);
  }
  if (accountId) {
    results = results.filter((c) => c.accountId === accountId);
  }
  if (type) {
    results = results.filter((c) => c.type === type);
  }
  if (source) {
    results = results.filter((c) => c.source === source);
  }
  if (search) {
    const lower = search.toLowerCase();
    results = results.filter(
      (c) =>
        c.firstName.toLowerCase().includes(lower) ||
        c.lastName.toLowerCase().includes(lower) ||
        c.email.toLowerCase().includes(lower) ||
        (c.title && c.title.toLowerCase().includes(lower))
    );
  }

  const total = results.length;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const start = (pageNum - 1) * limitNum;
  const data = results.slice(start, start + limitNum);

  return { data, total, page: pageNum, limit: limitNum };
}

/**
 * Retrieve a single contact by ID.
 *
 * @param {string} id
 * @returns {Promise<object>}
 */
async function getContact(id) {
  const contact = contactsStore.get(id);
  if (!contact) {
    const err = new Error(`Contact not found: ${id}`);
    err.status = 404;
    throw err;
  }
  return contact;
}

/**
 * Create a new contact.
 *
 * @param {{ firstName: string, lastName: string, email: string, phone?: string, title?: string, accountId?: string, type?: string, source?: string, tags?: string[] }} data
 * @returns {Promise<object>}
 */
async function createContact({ firstName, lastName, email, phone, title, accountId, type, source, tags }) {
  // Enforce unique email
  const duplicate = Array.from(contactsStore.values()).find(
    (c) => c.email.toLowerCase() === email.toLowerCase()
  );
  if (duplicate) {
    const err = new Error(`A contact with email "${email}" already exists`);
    err.status = 409;
    throw err;
  }

  const now = new Date().toISOString();
  const contact = {
    id: uuidv4(),
    firstName,
    lastName,
    email,
    phone: phone || null,
    title: title || null,
    accountId: accountId || null,
    type: type || 'lead',
    source: source || null,
    tags: Array.isArray(tags) ? tags : [],
    createdAt: now,
    updatedAt: now,
  };

  contactsStore.set(contact.id, contact);

  emit('contact.created', {
    eventType: 'contact.created',
    contactId: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    accountId: contact.accountId,
    type: contact.type,
    createdAt: contact.createdAt,
  });

  return contact;
}

/**
 * Update an existing contact.
 *
 * @param {string} id
 * @param {{ firstName?: string, lastName?: string, email?: string, phone?: string, title?: string, accountId?: string, type?: string, source?: string, tags?: string[] }} data
 * @returns {Promise<object>}
 */
async function updateContact(id, { firstName, lastName, email, phone, title, accountId, type, source, tags }) {
  const existing = await getContact(id);

  // Enforce unique email when changing it
  if (email && email.toLowerCase() !== existing.email.toLowerCase()) {
    const duplicate = Array.from(contactsStore.values()).find(
      (c) => c.id !== id && c.email.toLowerCase() === email.toLowerCase()
    );
    if (duplicate) {
      const err = new Error(`A contact with email "${email}" already exists`);
      err.status = 409;
      throw err;
    }
  }

  const previousType = existing.type;
  const now = new Date().toISOString();
  const updatedFields = [];

  if (firstName !== undefined && firstName !== existing.firstName) { existing.firstName = firstName; updatedFields.push('firstName'); }
  if (lastName !== undefined && lastName !== existing.lastName) { existing.lastName = lastName; updatedFields.push('lastName'); }
  if (email !== undefined && email !== existing.email) { existing.email = email; updatedFields.push('email'); }
  if (phone !== undefined && phone !== existing.phone) { existing.phone = phone; updatedFields.push('phone'); }
  if (title !== undefined && title !== existing.title) { existing.title = title; updatedFields.push('title'); }
  if (accountId !== undefined && accountId !== existing.accountId) { existing.accountId = accountId; updatedFields.push('accountId'); }
  if (type !== undefined && type !== existing.type) { existing.type = type; updatedFields.push('type'); }
  if (source !== undefined && source !== existing.source) { existing.source = source; updatedFields.push('source'); }
  if (tags !== undefined) { existing.tags = Array.isArray(tags) ? tags : []; updatedFields.push('tags'); }

  existing.updatedAt = now;
  contactsStore.set(id, existing);

  if (updatedFields.length > 0) {
    emit('contact.updated', {
      eventType: 'contact.updated',
      contactId: id,
      updatedFields,
      updatedAt: now,
    });

    // Emit conversion event when type transitions from lead → contact
    if (updatedFields.includes('type') && previousType === 'lead' && existing.type !== 'lead') {
      emit('contact.converted', {
        eventType: 'contact.converted',
        contactId: id,
        previousType,
        convertedAt: now,
      });
    }
  }

  return existing;
}

/**
 * List contacts belonging to a specific account with pagination.
 *
 * @param {string} accountId
 * @param {{ page?: number, limit?: number }} options
 * @returns {Promise<{ data: object[], total: number, page: number, limit: number }>}
 */
async function listContactsByAccount(accountId, { page = 1, limit = 20 } = {}) {
  return listContacts({ accountId, page, limit });
}

module.exports = {
  listContacts,
  getContact,
  createContact,
  updateContact,
  listContactsByAccount,
};
