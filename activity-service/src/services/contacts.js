'use strict';

const activitiesService = require('./activities');

/**
 * This module handles contact-oriented queries within the ActivityService
 * bounded context.  ActivityService does NOT own contact records — those
 * belong to ContactService.  What this service does own is the *activity
 * timeline* associated with each contactId.
 *
 * In-memory reference store for known contacts (populated via contact.created
 * events so we can enrich timeline responses without calling ContactService
 * synchronously on every request).
 *
 * Shape:
 * {
 *   contactId:  string (uuid)
 *   firstName:  string
 *   lastName:   string
 *   email:      string
 *   company:    string | null
 *   accountId:  string | null
 *   seenAt:     string (ISO8601)  — when this service first learned about the contact
 * }
 */
const contactCache = new Map();

// ─── Internal helpers ─────────────────────────────────────────────────────────

function now() {
  return new Date().toISOString();
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Upsert a contact record into the local cache.
 * Called by the contact.created event consumer so that timeline responses
 * can include contact metadata without an extra network hop.
 *
 * @param {object} contactData
 * @param {string} contactData.contactId
 * @param {string} contactData.firstName
 * @param {string} contactData.lastName
 * @param {string} contactData.email
 * @param {string} [contactData.company]
 * @param {string} [contactData.accountId]
 * @returns {Promise<object>}
 */
async function upsertContact(contactData) {
  const existing = contactCache.get(contactData.contactId);
  const entry = {
    contactId: contactData.contactId,
    firstName: contactData.firstName,
    lastName: contactData.lastName,
    email: contactData.email,
    company: contactData.company || null,
    accountId: contactData.accountId || null,
    seenAt: existing ? existing.seenAt : now(),
  };
  contactCache.set(entry.contactId, entry);
  return entry;
}

/**
 * Look up a cached contact record.
 *
 * @param {string} contactId
 * @returns {Promise<object|null>}
 */
async function getCachedContact(contactId) {
  return contactCache.get(contactId) || null;
}

/**
 * Get the full chronological activity timeline for a contact.
 * Enriches the response with any cached contact metadata.
 *
 * @param {string} contactId
 * @returns {Promise<{ contactId: string, contact: object|null, timeline: object[] }>}
 */
async function getContactTimeline(contactId) {
  const timeline = await activitiesService.getContactTimeline(contactId);
  const contact = await getCachedContact(contactId);

  return {
    contactId,
    contact,
    timeline,
  };
}

/**
 * Handle a contact.created event:
 *   1. Cache the contact metadata locally.
 *   2. Auto-create an initial "Contact Created" note activity for the timeline.
 *
 * @param {object} event  — the raw contact.created event payload
 * @param {string} event.contactId
 * @param {string} event.firstName
 * @param {string} event.lastName
 * @param {string} event.email
 * @param {string} [event.company]
 * @param {string} [event.accountId]
 * @param {string} [event.ownerId]
 * @returns {Promise<{ contact: object, activity: object }>}
 */
async function handleContactCreated(event) {
  // 1. Cache contact metadata
  const contact = await upsertContact({
    contactId: event.contactId,
    firstName: event.firstName,
    lastName: event.lastName,
    email: event.email,
    company: event.company,
    accountId: event.accountId,
  });

  // 2. Auto-create the first timeline entry
  const activity = await activitiesService.createSystemActivity({
    contactId: event.contactId,
    type: 'note',
    subject: 'Contact Created',
    description: `${event.firstName} ${event.lastName} was added to the CRM.`,
    status: 'completed',
    completedAt: now(),
    ownerId: event.ownerId || 'system',
  });

  return { contact, activity };
}

module.exports = {
  upsertContact,
  getCachedContact,
  getContactTimeline,
  handleContactCreated,
};
