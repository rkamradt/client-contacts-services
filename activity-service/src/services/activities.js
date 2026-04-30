'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * In-memory store for activities.
 * Shape of each record:
 * {
 *   id:              string (uuid)
 *   contactId:       string (uuid)
 *   type:            'call' | 'email' | 'meeting' | 'note'
 *   subject:         string
 *   description:     string
 *   status:          'scheduled' | 'completed' | 'cancelled'
 *   scheduledAt:     string (ISO8601) | null
 *   completedAt:     string (ISO8601) | null
 *   durationMinutes: number | null
 *   outcome:         string | null
 *   ownerId:         string (uuid)
 *   createdAt:       string (ISO8601)
 *   updatedAt:       string (ISO8601)
 * }
 */
const store = new Map();

// ─── Event publisher stub ────────────────────────────────────────────────────
// In production this would publish to a message broker (Kafka, RabbitMQ, etc.)
function publishEvent(topic, payload) {
  console.info(`[Event:${topic}]`, JSON.stringify(payload));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function now() {
  return new Date().toISOString();
}

function applyFilters(activities, { contactId, type, status, dateFrom, dateTo, ownerId }) {
  return activities.filter((a) => {
    if (contactId && a.contactId !== contactId) return false;
    if (type && a.type !== type) return false;
    if (status && a.status !== status) return false;
    if (ownerId && a.ownerId !== ownerId) return false;

    if (dateFrom) {
      const from = new Date(dateFrom);
      const ref = a.scheduledAt ? new Date(a.scheduledAt) : new Date(a.createdAt);
      if (ref < from) return false;
    }

    if (dateTo) {
      const to = new Date(dateTo);
      const ref = a.scheduledAt ? new Date(a.scheduledAt) : new Date(a.createdAt);
      if (ref > to) return false;
    }

    return true;
  });
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * List activities with optional filtering and pagination.
 *
 * @param {object} filters
 * @param {string} [filters.contactId]
 * @param {string} [filters.type]
 * @param {string} [filters.status]
 * @param {string} [filters.dateFrom]
 * @param {string} [filters.dateTo]
 * @param {string} [filters.ownerId]
 * @param {number} [filters.page=1]
 * @param {number} [filters.limit=20]
 * @returns {Promise<{ data: object[], total: number, page: number, limit: number }>}
 */
async function listActivities(filters = {}) {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));

  const all = Array.from(store.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  const filtered = applyFilters(all, filters);
  const total = filtered.length;
  const data = filtered.slice((page - 1) * limit, page * limit);

  return { data, total, page, limit };
}

/**
 * Get a single activity by ID.
 *
 * @param {string} id
 * @returns {Promise<object>}
 */
async function getActivity(id) {
  const activity = store.get(id);
  if (!activity) {
    const err = new Error(`Activity not found: ${id}`);
    err.status = 404;
    throw err;
  }
  return activity;
}

/**
 * Create a new activity.
 *
 * @param {object} data
 * @param {string} data.contactId
 * @param {string} data.type
 * @param {string} data.subject
 * @param {string} data.description
 * @param {string} [data.scheduledAt]
 * @param {string} [data.completedAt]
 * @param {number} [data.durationMinutes]
 * @param {string} [data.outcome]
 * @param {string} data.ownerId
 * @param {string} [data.status]
 * @returns {Promise<object>}
 */
async function createActivity(data) {
  const timestamp = now();
  const activity = {
    id: uuidv4(),
    contactId: data.contactId,
    type: data.type,
    subject: data.subject,
    description: data.description || '',
    status: data.status || (data.scheduledAt ? 'scheduled' : 'completed'),
    scheduledAt: data.scheduledAt || null,
    completedAt: data.completedAt || null,
    durationMinutes: data.durationMinutes != null ? Number(data.durationMinutes) : null,
    outcome: data.outcome || null,
    ownerId: data.ownerId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.set(activity.id, activity);

  publishEvent('activity.logged', {
    eventType: 'activity.logged',
    activityId: activity.id,
    contactId: activity.contactId,
    type: activity.type,
    subject: activity.subject,
    ownerId: activity.ownerId,
    status: activity.status,
    createdAt: activity.createdAt,
  });

  return activity;
}

/**
 * Update an existing activity.
 *
 * @param {string} id
 * @param {object} updates
 * @returns {Promise<object>}
 */
async function updateActivity(id, updates) {
  const existing = await getActivity(id);
  const wasCompleted = existing.status === 'completed';

  const updatedActivity = {
    ...existing,
    subject: updates.subject !== undefined ? updates.subject : existing.subject,
    description: updates.description !== undefined ? updates.description : existing.description,
    status: updates.status !== undefined ? updates.status : existing.status,
    scheduledAt: updates.scheduledAt !== undefined ? updates.scheduledAt : existing.scheduledAt,
    completedAt: updates.completedAt !== undefined ? updates.completedAt : existing.completedAt,
    durationMinutes:
      updates.durationMinutes !== undefined
        ? Number(updates.durationMinutes)
        : existing.durationMinutes,
    outcome: updates.outcome !== undefined ? updates.outcome : existing.outcome,
    updatedAt: now(),
  };

  store.set(id, updatedActivity);

  // Publish activity.completed when status transitions to completed
  if (!wasCompleted && updatedActivity.status === 'completed') {
    publishEvent('activity.completed', {
      eventType: 'activity.completed',
      activityId: updatedActivity.id,
      contactId: updatedActivity.contactId,
      type: updatedActivity.type,
      subject: updatedActivity.subject,
      completedAt: updatedActivity.completedAt || updatedActivity.updatedAt,
      durationMinutes: updatedActivity.durationMinutes,
      outcome: updatedActivity.outcome,
      ownerId: updatedActivity.ownerId,
    });
  }

  return updatedActivity;
}

/**
 * Get chronological timeline of activities for a specific contact.
 *
 * @param {string} contactId
 * @returns {Promise<object[]>}
 */
async function getContactTimeline(contactId) {
  const all = Array.from(store.values());
  const timeline = all
    .filter((a) => a.contactId === contactId)
    .sort((a, b) => {
      const dateA = a.scheduledAt || a.createdAt;
      const dateB = b.scheduledAt || b.createdAt;
      return new Date(dateA) - new Date(dateB);
    });
  return timeline;
}

/**
 * Create a system-generated activity (used internally by event consumers).
 * Bypasses normal validation since data is trusted from internal events.
 *
 * @param {object} data
 * @returns {Promise<object>}
 */
async function createSystemActivity(data) {
  return createActivity(data);
}

module.exports = {
  listActivities,
  getActivity,
  createActivity,
  updateActivity,
  getContactTimeline,
  createSystemActivity,
};
