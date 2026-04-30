'use strict';

const { v4: uuidv4 } = require('uuid');

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

/** @type {Map<string, object>} */
const campaigns = new Map();

/** @type {Map<string, object[]>} */
const campaignContacts = new Map(); // campaignId -> [{ contactId, enrolledAt, enrollmentSource, status }]

// ---------------------------------------------------------------------------
// Seed data for development
// ---------------------------------------------------------------------------

(function seed() {
  const now = new Date().toISOString();
  const c1 = {
    id: 'campaign-seed-001',
    name: 'Welcome Onboarding Sequence',
    type: 'drip_sequence',
    status: 'active',
    ownerId: 'user-seed-001',
    description: 'Automatically enrolled for all new contacts.',
    autoEnroll: true,
    schedule: {
      startAt: now,
      endAt: null,
      timezone: 'America/New_York',
    },
    settings: {
      fromName: 'Client Contacts Team',
      fromEmail: 'hello@clientcontacts.io',
      replyTo: 'support@clientcontacts.io',
      subject: 'Welcome to Client Contacts!',
      templateId: 'tmpl-onboarding-001',
    },
    metrics: {
      totalEnrolled: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
      unsubscribed: 0,
      bounced: 0,
    },
    createdAt: now,
    updatedAt: now,
  };
  campaigns.set(c1.id, c1);
  campaignContacts.set(c1.id, []);
})();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function notFound(id) {
  const err = new Error(`Campaign not found: ${id}`);
  err.status = 404;
  return err;
}

function getCampaignContacts(campaignId) {
  if (!campaignContacts.has(campaignId)) {
    campaignContacts.set(campaignId, []);
  }
  return campaignContacts.get(campaignId);
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * List campaigns with optional filtering.
 * @param {{ status?: string, type?: string, ownerId?: string, page?: number, limit?: number }} filters
 */
async function listCampaigns({ status, type, ownerId, page = 1, limit = 20 } = {}) {
  let results = Array.from(campaigns.values());

  if (status) results = results.filter((c) => c.status === status);
  if (type) results = results.filter((c) => c.type === type);
  if (ownerId) results = results.filter((c) => c.ownerId === ownerId);

  const total = results.length;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const start = (pageNum - 1) * limitNum;
  const paged = results.slice(start, start + limitNum);

  return { campaigns: paged, total, page: pageNum, limit: limitNum };
}

/**
 * Get a single campaign by id.
 * @param {string} id
 */
async function getCampaign(id) {
  const campaign = campaigns.get(id);
  if (!campaign) throw notFound(id);
  return campaign;
}

/**
 * Create a new campaign.
 * @param {{ name: string, type: string, ownerId: string, description?: string, status?: string, autoEnroll?: boolean, schedule?: object, settings?: object }} data
 */
async function createCampaign(data) {
  const now = new Date().toISOString();
  const campaign = {
    id: uuidv4(),
    name: data.name,
    type: data.type,
    status: data.status || 'draft',
    ownerId: data.ownerId,
    description: data.description || '',
    autoEnroll: data.autoEnroll || false,
    schedule: data.schedule || { startAt: null, endAt: null, timezone: 'UTC' },
    settings: data.settings || {
      fromName: '',
      fromEmail: '',
      replyTo: '',
      subject: '',
      templateId: '',
    },
    metrics: {
      totalEnrolled: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
      unsubscribed: 0,
      bounced: 0,
    },
    createdAt: now,
    updatedAt: now,
  };
  campaigns.set(campaign.id, campaign);
  campaignContacts.set(campaign.id, []);
  return campaign;
}

/**
 * Update an existing campaign's settings or status.
 * @param {string} id
 * @param {object} updates
 */
async function updateCampaign(id, updates) {
  const campaign = campaigns.get(id);
  if (!campaign) throw notFound(id);

  const allowed = ['name', 'type', 'status', 'description', 'autoEnroll', 'schedule', 'settings'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      if (key === 'schedule' || key === 'settings') {
        campaign[key] = { ...campaign[key], ...updates[key] };
      } else {
        campaign[key] = updates[key];
      }
    }
  }
  campaign.updatedAt = new Date().toISOString();
  campaigns.set(id, campaign);
  return campaign;
}

/**
 * Add contacts to a campaign (manually or via segment placeholder).
 * @param {string} campaignId
 * @param {{ contactIds?: string[], segmentId?: string }} data
 * @returns {{ enrolled: string[], skipped: string[] }}
 */
async function addContacts(campaignId, data) {
  const campaign = campaigns.get(campaignId);
  if (!campaign) throw notFound(campaignId);

  const contactList = getCampaignContacts(campaignId);
  const existingIds = new Set(contactList.map((c) => c.contactId));

  const toEnroll = data.contactIds || [];
  const enrolled = [];
  const skipped = [];
  const now = new Date().toISOString();

  for (const contactId of toEnroll) {
    if (existingIds.has(contactId)) {
      skipped.push(contactId);
    } else {
      const enrollment = {
        contactId,
        enrolledAt: now,
        enrollmentSource: data.segmentId ? `segment:${data.segmentId}` : 'manual',
        status: 'enrolled',
      };
      contactList.push(enrollment);
      existingIds.add(contactId);
      enrolled.push(contactId);
    }
  }

  // Update metrics
  campaign.metrics.totalEnrolled = contactList.length;
  campaign.updatedAt = now;
  campaigns.set(campaignId, campaign);

  return { enrolled, skipped };
}

/**
 * Remove a contact from a campaign.
 * @param {string} campaignId
 * @param {string} contactId
 */
async function removeContact(campaignId, contactId) {
  const campaign = campaigns.get(campaignId);
  if (!campaign) throw notFound(campaignId);

  const contactList = getCampaignContacts(campaignId);
  const index = contactList.findIndex((c) => c.contactId === contactId);
  if (index === -1) {
    const err = new Error(`Contact ${contactId} is not enrolled in campaign ${campaignId}`);
    err.status = 404;
    throw err;
  }

  contactList.splice(index, 1);
  campaign.metrics.totalEnrolled = contactList.length;
  campaign.updatedAt = new Date().toISOString();
  campaigns.set(campaignId, campaign);

  return { message: `Contact ${contactId} removed from campaign ${campaignId}` };
}

/**
 * List all contacts enrolled in a campaign.
 * @param {string} campaignId
 * @param {{ page?: number, limit?: number }} options
 */
async function listCampaignContacts(campaignId, { page = 1, limit = 20 } = {}) {
  const campaign = campaigns.get(campaignId);
  if (!campaign) throw notFound(campaignId);

  const contactList = getCampaignContacts(campaignId);
  const total = contactList.length;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const start = (pageNum - 1) * limitNum;
  const paged = contactList.slice(start, start + limitNum);

  return { contacts: paged, total, page: pageNum, limit: limitNum };
}

/**
 * Execute a campaign send.
 * @param {string} campaignId
 * @param {{ sendAt?: string }} options
 */
async function sendCampaign(campaignId, { sendAt } = {}) {
  const campaign = campaigns.get(campaignId);
  if (!campaign) throw notFound(campaignId);

  if (campaign.status === 'cancelled') {
    const err = new Error('Cannot send a cancelled campaign');
    err.status = 409;
    throw err;
  }

  if (campaign.status === 'completed') {
    const err = new Error('Campaign has already completed');
    err.status = 409;
    throw err;
  }

  const contactList = getCampaignContacts(campaignId);
  const recipientCount = contactList.length;
  const now = new Date().toISOString();
  const sentAt = sendAt || now;

  // Mark all enrolled contacts as sent
  for (const enrollment of contactList) {
    if (enrollment.status === 'enrolled') {
      enrollment.status = 'sent';
      enrollment.sentAt = sentAt;
    }
  }

  // Update metrics and status
  campaign.status = campaign.type === 'drip_sequence' ? 'active' : 'completed';
  campaign.metrics.sent = recipientCount;
  campaign.metrics.delivered = recipientCount; // optimistic for in-memory
  campaign.updatedAt = now;
  campaigns.set(campaignId, campaign);

  return {
    campaignId,
    name: campaign.name,
    recipientCount,
    status: campaign.status,
    sentAt,
  };
}

/**
 * Record a contact engagement event (open, click, conversion, etc.).
 * Used internally by event consumers and can be extended with a REST endpoint.
 * @param {string} campaignId
 * @param {string} contactId
 * @param {'opened'|'clicked'|'converted'|'unsubscribed'|'bounced'} engagementType
 */
async function recordEngagement(campaignId, contactId, engagementType) {
  const campaign = campaigns.get(campaignId);
  if (!campaign) throw notFound(campaignId);

  const validTypes = ['opened', 'clicked', 'converted', 'unsubscribed', 'bounced'];
  if (!validTypes.includes(engagementType)) {
    const err = new Error(`Invalid engagement type: ${engagementType}`);
    err.status = 400;
    throw err;
  }

  const contactList = getCampaignContacts(campaignId);
  const enrollment = contactList.find((c) => c.contactId === contactId);
  if (enrollment) {
    enrollment.lastEngagement = { type: engagementType, recordedAt: new Date().toISOString() };
  }

  if (campaign.metrics[engagementType] !== undefined) {
    campaign.metrics[engagementType] += 1;
  }
  campaign.updatedAt = new Date().toISOString();
  campaigns.set(campaignId, campaign);

  return campaign;
}

/**
 * Get campaign analytics / performance metrics.
 * @param {string} campaignId
 */
async function getCampaignAnalytics(campaignId) {
  const campaign = campaigns.get(campaignId);
  if (!campaign) throw notFound(campaignId);

  const { metrics } = campaign;
  const openRate = metrics.delivered > 0 ? (metrics.opened / metrics.delivered) * 100 : 0;
  const clickRate = metrics.opened > 0 ? (metrics.clicked / metrics.opened) * 100 : 0;
  const conversionRate = metrics.delivered > 0 ? (metrics.converted / metrics.delivered) * 100 : 0;
  const bounceRate = metrics.sent > 0 ? (metrics.bounced / metrics.sent) * 100 : 0;
  const unsubscribeRate =
    metrics.delivered > 0 ? (metrics.unsubscribed / metrics.delivered) * 100 : 0;

  return {
    campaignId,
    campaignName: campaign.name,
    campaignStatus: campaign.status,
    metrics: {
      ...metrics,
      openRate: parseFloat(openRate.toFixed(2)),
      clickThroughRate: parseFloat(clickRate.toFixed(2)),
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      bounceRate: parseFloat(bounceRate.toFixed(2)),
      unsubscribeRate: parseFloat(unsubscribeRate.toFixed(2)),
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Auto-enroll a contact into all active campaigns with autoEnroll: true.
 * Called by the contact.created event handler.
 * @param {string} contactId
 * @returns {string[]} campaignIds where the contact was enrolled
 */
async function autoEnrollContact(contactId) {
  const enrolledIn = [];
  const now = new Date().toISOString();

  for (const [campaignId, campaign] of campaigns.entries()) {
    if (campaign.autoEnroll && campaign.status === 'active') {
      const contactList = getCampaignContacts(campaignId);
      const alreadyEnrolled = contactList.some((c) => c.contactId === contactId);
      if (!alreadyEnrolled) {
        contactList.push({
          contactId,
          enrolledAt: now,
          enrollmentSource: 'auto:contact.created',
          status: 'enrolled',
        });
        campaign.metrics.totalEnrolled = contactList.length;
        campaign.updatedAt = now;
        campaigns.set(campaignId, campaign);
        enrolledIn.push(campaignId);
      }
    }
  }

  return enrolledIn;
}

/**
 * Trigger post-sale campaigns for a contact after an opportunity is won.
 * Called by the opportunity.won event handler.
 * @param {string} contactId
 * @param {string} accountId
 * @returns {string[]} campaignIds where the contact was enrolled
 */
async function triggerPostSaleCampaigns(contactId, accountId) {
  const enrolledIn = [];
  const now = new Date().toISOString();

  for (const [campaignId, campaign] of campaigns.entries()) {
    if (
      campaign.type === 'drip_sequence' &&
      campaign.status === 'active' &&
      campaign.settings?.triggerOn === 'opportunity.won'
    ) {
      const contactList = getCampaignContacts(campaignId);
      const alreadyEnrolled = contactList.some((c) => c.contactId === contactId);
      if (!alreadyEnrolled) {
        contactList.push({
          contactId,
          enrolledAt: now,
          enrollmentSource: `auto:opportunity.won:account:${accountId}`,
          status: 'enrolled',
        });
        campaign.metrics.totalEnrolled = contactList.length;
        campaign.updatedAt = now;
        campaigns.set(campaignId, campaign);
        enrolledIn.push(campaignId);
      }
    }
  }

  return enrolledIn;
}

module.exports = {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  addContacts,
  removeContact,
  listCampaignContacts,
  sendCampaign,
  recordEngagement,
  getCampaignAnalytics,
  autoEnrollContact,
  triggerPostSaleCampaigns,
};
