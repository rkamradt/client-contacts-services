'use strict';

const { v4: uuidv4 } = require('uuid');

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

/** @type {Map<string, object>} */
const segments = new Map();

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

(function seed() {
  const now = new Date().toISOString();

  const s1 = {
    id: 'segment-seed-001',
    name: 'High-Value Technology Leads',
    description: 'Contacts in the technology sector with a lead score of 80 or above.',
    criteria: {
      filters: [
        { field: 'industry', operator: 'eq', value: 'Technology' },
        { field: 'leadScore', operator: 'gte', value: 80 },
      ],
      logic: 'AND',
    },
    createdAt: now,
    updatedAt: now,
  };

  const s2 = {
    id: 'segment-seed-002',
    name: 'New Enterprise Accounts',
    description: 'Contacts belonging to enterprise accounts created in the last 90 days.',
    criteria: {
      filters: [
        { field: 'accountType', operator: 'eq', value: 'enterprise' },
        { field: 'contactCreatedDaysAgo', operator: 'lte', value: 90 },
      ],
      logic: 'AND',
    },
    createdAt: now,
    updatedAt: now,
  };

  segments.set(s1.id, s1);
  segments.set(s2.id, s2);
})();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function notFound(id) {
  const err = new Error(`Segment not found: ${id}`);
  err.status = 404;
  return err;
}

/**
 * Evaluate a single filter rule against a contact object.
 * Supports operators: eq, neq, gt, gte, lt, lte, contains, not_contains, in, not_in.
 * @param {object} contact
 * @param {{ field: string, operator: string, value: any }} filter
 * @returns {boolean}
 */
function evaluateFilter(contact, filter) {
  const { field, operator, value } = filter;
  const contactVal = contact[field];

  switch (operator) {
    case 'eq':
      return contactVal === value;
    case 'neq':
      return contactVal !== value;
    case 'gt':
      return contactVal > value;
    case 'gte':
      return contactVal >= value;
    case 'lt':
      return contactVal < value;
    case 'lte':
      return contactVal <= value;
    case 'contains':
      return typeof contactVal === 'string' && contactVal.includes(value);
    case 'not_contains':
      return typeof contactVal === 'string' && !contactVal.includes(value);
    case 'in':
      return Array.isArray(value) && value.includes(contactVal);
    case 'not_in':
      return Array.isArray(value) && !value.includes(contactVal);
    default:
      return false;
  }
}

/**
 * Evaluate all criteria filters against a contact.
 * @param {object} contact
 * @param {{ filters: object[], logic: 'AND'|'OR' }} criteria
 * @returns {boolean}
 */
function matchesCriteria(contact, criteria) {
  const { filters = [], logic = 'AND' } = criteria;
  if (filters.length === 0) return true;

  if (logic === 'OR') {
    return filters.some((f) => evaluateFilter(contact, f));
  }
  return filters.every((f) => evaluateFilter(contact, f));
}

/**
 * Generate a synthetic contact list for segment preview.
 * In production this would query the contact-service; here we return
 * a small set of representative mock contacts to demonstrate criteria filtering.
 */
function getMockContactPool() {
  return [
    {
      id: 'contact-mock-001',
      firstName: 'Alice',
      lastName: 'Nguyen',
      email: 'alice.nguyen@techcorp.com',
      industry: 'Technology',
      accountType: 'enterprise',
      leadScore: 92,
      contactCreatedDaysAgo: 15,
      title: 'VP of Engineering',
    },
    {
      id: 'contact-mock-002',
      firstName: 'Bob',
      lastName: 'Martinez',
      email: 'bob.martinez@retailco.com',
      industry: 'Retail',
      accountType: 'mid_market',
      leadScore: 55,
      contactCreatedDaysAgo: 45,
      title: 'Procurement Manager',
    },
    {
      id: 'contact-mock-003',
      firstName: 'Carol',
      lastName: 'Singh',
      email: 'carol.singh@cloudware.io',
      industry: 'Technology',
      accountType: 'enterprise',
      leadScore: 85,
      contactCreatedDaysAgo: 30,
      title: 'CTO',
    },
    {
      id: 'contact-mock-004',
      firstName: 'David',
      lastName: 'Chen',
      email: 'david.chen@manufact.com',
      industry: 'Manufacturing',
      accountType: 'enterprise',
      leadScore: 70,
      contactCreatedDaysAgo: 10,
      title: 'Director of Operations',
    },
    {
      id: 'contact-mock-005',
      firstName: 'Eva',
      lastName: 'Johansson',
      email: 'eva.johansson@saas.com',
      industry: 'Technology',
      accountType: 'smb',
      leadScore: 62,
      contactCreatedDaysAgo: 120,
      title: 'Sales Lead',
    },
    {
      id: 'contact-mock-006',
      firstName: 'Frank',
      lastName: 'Okafor',
      email: 'frank.okafor@fintech.io',
      industry: 'Financial Services',
      accountType: 'enterprise',
      leadScore: 88,
      contactCreatedDaysAgo: 5,
      title: 'CFO',
    },
  ];
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * List all segments.
 * @param {{ page?: number, limit?: number }} options
 */
async function listSegments({ page = 1, limit = 20 } = {}) {
  const all = Array.from(segments.values());
  const total = all.length;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const start = (pageNum - 1) * limitNum;
  const paged = all.slice(start, start + limitNum);
  return { segments: paged, total, page: pageNum, limit: limitNum };
}

/**
 * Get a single segment by id.
 * @param {string} id
 */
async function getSegment(id) {
  const segment = segments.get(id);
  if (!segment) throw notFound(id);
  return segment;
}

/**
 * Create a new segment.
 * @param {{ name: string, criteria: object, description?: string }} data
 */
async function createSegment(data) {
  const now = new Date().toISOString();
  const segment = {
    id: uuidv4(),
    name: data.name,
    description: data.description || '',
    criteria: {
      filters: data.criteria.filters || [],
      logic: data.criteria.logic || 'AND',
    },
    createdAt: now,
    updatedAt: now,
  };
  segments.set(segment.id, segment);
  return segment;
}

/**
 * Update an existing segment.
 * @param {string} id
 * @param {object} updates
 */
async function updateSegment(id, updates) {
  const segment = segments.get(id);
  if (!segment) throw notFound(id);

  if (updates.name !== undefined) segment.name = updates.name;
  if (updates.description !== undefined) segment.description = updates.description;
  if (updates.criteria !== undefined) {
    segment.criteria = {
      filters: updates.criteria.filters || segment.criteria.filters,
      logic: updates.criteria.logic || segment.criteria.logic,
    };
  }
  segment.updatedAt = new Date().toISOString();
  segments.set(id, segment);
  return segment;
}

/**
 * Delete a segment.
 * @param {string} id
 */
async function deleteSegment(id) {
  if (!segments.has(id)) throw notFound(id);
  segments.delete(id);
  return { message: `Segment ${id} deleted` };
}

/**
 * Preview contacts that match a segment's criteria.
 * In production this would call the contact-service; here we evaluate
 * criteria against the local mock contact pool.
 *
 * @param {string} segmentId
 * @param {{ page?: number, limit?: number }} options
 */
async function previewSegmentContacts(segmentId, { page = 1, limit = 20 } = {}) {
  const segment = segments.get(segmentId);
  if (!segment) throw notFound(segmentId);

  const pool = getMockContactPool();
  const matched = pool.filter((contact) => matchesCriteria(contact, segment.criteria));

  const total = matched.length;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const start = (pageNum - 1) * limitNum;
  const paged = matched.slice(start, start + limitNum);

  return {
    segmentId,
    segmentName: segment.name,
    contacts: paged,
    total,
    page: pageNum,
    limit: limitNum,
  };
}

/**
 * Check which segment ids a given contact matches.
 * Used by the contact.updated event handler to update enrollments.
 * @param {object} contact — contact object with field values
 * @returns {string[]} matched segment ids
 */
async function evaluateContactAgainstAllSegments(contact) {
  const matched = [];
  for (const [id, segment] of segments.entries()) {
    if (matchesCriteria(contact, segment.criteria)) {
      matched.push(id);
    }
  }
  return matched;
}

module.exports = {
  listSegments,
  getSegment,
  createSegment,
  updateSegment,
  deleteSegment,
  previewSegmentContacts,
  evaluateContactAgainstAllSegments,
};
