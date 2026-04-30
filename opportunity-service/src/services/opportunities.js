'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Valid pipeline stages in order.
 */
const PIPELINE_STAGES = [
  'prospecting',
  'qualification',
  'needs_analysis',
  'value_proposition',
  'decision_makers',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
];

/**
 * In-memory store: opportunityId -> opportunity object
 * @type {Map<string, object>}
 */
const store = new Map();

/**
 * Simple in-memory event bus simulation. In production this would publish to
 * a message broker (Kafka, RabbitMQ, etc.). Here we just log events and expose
 * a hook for tests.
 */
const eventHandlers = [];

function emitEvent(topic, payload) {
  const event = { topic, payload, timestamp: new Date().toISOString() };
  console.log(`[event-out] ${topic}`, JSON.stringify(payload));
  eventHandlers.forEach((handler) => handler(event));
}

function onEvent(handler) {
  eventHandlers.push(handler);
}

// ---------------------------------------------------------------------------
// Seed data — gives the service realistic state on startup
// ---------------------------------------------------------------------------
(function seed() {
  const now = new Date().toISOString();
  const opportunities = [
    {
      id: uuidv4(),
      title: 'Enterprise License — Acme Corp',
      accountId: 'acct-001',
      contactId: 'ctct-001',
      ownerId: 'user-001',
      value: 125000,
      currency: 'USD',
      stage: 'proposal',
      probability: 60,
      expectedCloseDate: '2025-09-30',
      description: 'Annual enterprise software license renewal with expanded seat count.',
      linkedActivityIds: [],
      lossReason: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      title: 'Professional Services — Globex',
      accountId: 'acct-002',
      contactId: 'ctct-002',
      ownerId: 'user-002',
      value: 48000,
      currency: 'USD',
      stage: 'negotiation',
      probability: 75,
      expectedCloseDate: '2025-08-15',
      description: 'Implementation and onboarding services package.',
      linkedActivityIds: [],
      lossReason: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      title: 'SMB Starter Pack — Initech',
      accountId: 'acct-003',
      contactId: 'ctct-003',
      ownerId: 'user-001',
      value: 12000,
      currency: 'USD',
      stage: 'qualification',
      probability: 30,
      expectedCloseDate: '2025-10-31',
      description: 'Small business starter subscription.',
      linkedActivityIds: [],
      lossReason: null,
      createdAt: now,
      updatedAt: now,
    },
  ];

  opportunities.forEach((opp) => store.set(opp.id, opp));
})();

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function notFound(id) {
  const err = new Error(`Opportunity not found: ${id}`);
  err.status = 404;
  return err;
}

function badStage(stage) {
  const err = new Error(
    `Invalid stage '${stage}'. Must be one of: ${PIPELINE_STAGES.join(', ')}`
  );
  err.status = 422;
  return err;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * List opportunities with optional filters and pagination.
 * @param {{ stage?, ownerId?, accountId?, fromDate?, toDate?, page?, limit? }} filters
 * @returns {{ data: object[], total: number, page: number, limit: number }}
 */
async function listOpportunities(filters = {}) {
  const {
    stage,
    ownerId,
    accountId,
    fromDate,
    toDate,
    page = 1,
    limit = 20,
  } = filters;

  let results = Array.from(store.values());

  if (stage) {
    results = results.filter((o) => o.stage === stage);
  }
  if (ownerId) {
    results = results.filter((o) => o.ownerId === ownerId);
  }
  if (accountId) {
    results = results.filter((o) => o.accountId === accountId);
  }
  if (fromDate) {
    const from = new Date(fromDate);
    results = results.filter((o) => new Date(o.expectedCloseDate) >= from);
  }
  if (toDate) {
    const to = new Date(toDate);
    results = results.filter((o) => new Date(o.expectedCloseDate) <= to);
  }

  const total = results.length;
  const pageNum = Math.max(1, parseInt(page, 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * pageSize;
  const data = results.slice(offset, offset + pageSize);

  return { data, total, page: pageNum, limit: pageSize };
}

/**
 * Retrieve a single opportunity by ID.
 * @param {string} id
 * @returns {object}
 */
async function getOpportunity(id) {
  const opportunity = store.get(id);
  if (!opportunity) throw notFound(id);
  return opportunity;
}

/**
 * Create a new sales opportunity.
 * @param {object} data
 * @returns {object} Created opportunity
 */
async function createOpportunity(data) {
  const {
    title,
    accountId,
    contactId,
    ownerId,
    value,
    currency = 'USD',
    stage = 'prospecting',
    probability,
    expectedCloseDate,
    description = '',
  } = data;

  if (!PIPELINE_STAGES.includes(stage)) throw badStage(stage);

  const now = new Date().toISOString();
  const id = uuidv4();

  // Default probability based on stage if not provided
  const resolvedProbability =
    probability !== undefined ? probability : defaultProbability(stage);

  const opportunity = {
    id,
    title,
    accountId,
    contactId: contactId || null,
    ownerId,
    value: parseFloat(value),
    currency,
    stage,
    probability: resolvedProbability,
    expectedCloseDate,
    description,
    linkedActivityIds: [],
    lossReason: null,
    createdAt: now,
    updatedAt: now,
  };

  store.set(id, opportunity);

  emitEvent('opportunity.created', {
    opportunityId: id,
    title,
    accountId,
    contactId: opportunity.contactId,
    ownerId,
    stage,
    value: opportunity.value,
    currency,
    createdAt: now,
  });

  return opportunity;
}

/**
 * Update opportunity details (value, close date, probability, etc.).
 * @param {string} id
 * @param {object} updates
 * @returns {object} Updated opportunity
 */
async function updateOpportunity(id, updates) {
  const opportunity = store.get(id);
  if (!opportunity) throw notFound(id);

  const previousValue = opportunity.value;
  const previousProbability = opportunity.probability;

  const allowed = ['title', 'value', 'currency', 'expectedCloseDate', 'probability', 'description'];
  allowed.forEach((field) => {
    if (updates[field] !== undefined) {
      opportunity[field] = field === 'value' ? parseFloat(updates[field]) : updates[field];
    }
  });

  opportunity.updatedAt = new Date().toISOString();
  store.set(id, opportunity);

  const valueChanged = opportunity.value !== previousValue;
  const probabilityChanged = opportunity.probability !== previousProbability;

  if (valueChanged || probabilityChanged) {
    emitEvent('opportunity.value-updated', {
      opportunityId: id,
      previousValue,
      newValue: opportunity.value,
      previousProbability,
      newProbability: opportunity.probability,
      currency: opportunity.currency,
      updatedAt: opportunity.updatedAt,
    });
  }

  return opportunity;
}

/**
 * Update the pipeline stage for an opportunity.
 * @param {string} id
 * @param {string} newStage
 * @param {string} [lossReason]
 * @returns {{ id: string, stage: string, previousStage: string, updatedAt: string }}
 */
async function updateStage(id, newStage, lossReason) {
  const opportunity = store.get(id);
  if (!opportunity) throw notFound(id);
  if (!PIPELINE_STAGES.includes(newStage)) throw badStage(newStage);

  const previousStage = opportunity.stage;
  opportunity.stage = newStage;
  opportunity.probability = defaultProbability(newStage);

  if (newStage === 'closed_won') {
    opportunity.probability = 100;
  } else if (newStage === 'closed_lost') {
    opportunity.probability = 0;
    if (lossReason) opportunity.lossReason = lossReason;
  }

  opportunity.updatedAt = new Date().toISOString();
  store.set(id, opportunity);

  // Always emit stage-changed
  emitEvent('opportunity.stage-changed', {
    opportunityId: id,
    previousStage,
    newStage,
    ownerId: opportunity.ownerId,
    accountId: opportunity.accountId,
    updatedAt: opportunity.updatedAt,
  });

  // Emit specialised won/lost events
  if (newStage === 'closed_won') {
    emitEvent('opportunity.won', {
      opportunityId: id,
      title: opportunity.title,
      accountId: opportunity.accountId,
      ownerId: opportunity.ownerId,
      value: opportunity.value,
      currency: opportunity.currency,
      closedAt: opportunity.updatedAt,
    });
  } else if (newStage === 'closed_lost') {
    emitEvent('opportunity.lost', {
      opportunityId: id,
      title: opportunity.title,
      accountId: opportunity.accountId,
      ownerId: opportunity.ownerId,
      value: opportunity.value,
      currency: opportunity.currency,
      closedAt: opportunity.updatedAt,
      lossReason: opportunity.lossReason || null,
    });
  }

  return {
    id,
    stage: newStage,
    previousStage,
    updatedAt: opportunity.updatedAt,
  };
}

/**
 * Calculate the weighted revenue forecast for an opportunity.
 * weightedValue = value * (probability / 100)
 * @param {string} id
 * @returns {object}
 */
async function getForecast(id) {
  const opportunity = store.get(id);
  if (!opportunity) throw notFound(id);

  const weightedValue = parseFloat(
    (opportunity.value * (opportunity.probability / 100)).toFixed(2)
  );

  return {
    opportunityId: id,
    value: opportunity.value,
    probability: opportunity.probability,
    weightedValue,
    currency: opportunity.currency,
    expectedCloseDate: opportunity.expectedCloseDate,
    stage: opportunity.stage,
  };
}

// ---------------------------------------------------------------------------
// Inbound event handlers
// ---------------------------------------------------------------------------

/**
 * Handle contact.created events.
 * Auto-creates a prospecting-stage opportunity for qualified leads.
 * A contact is treated as a "qualified lead" if its type is 'lead' and
 * its leadScore is >= 70.
 *
 * @param {{ contactId, firstName, lastName, accountId, ownerId, leadScore, type }} payload
 */
async function handleContactCreated(payload) {
  const { contactId, firstName, lastName, accountId, ownerId, leadScore, type } = payload;

  if (type === 'lead' && leadScore >= 70) {
    const title = `Auto-Opportunity — ${firstName} ${lastName}`;
    await createOpportunity({
      title,
      accountId: accountId || null,
      contactId,
      ownerId: ownerId || 'system',
      value: 0,
      currency: 'USD',
      stage: 'prospecting',
      probability: 10,
      expectedCloseDate: ninetyDaysFromNow(),
      description: `Auto-created from qualified lead contact.created event (leadScore: ${leadScore}).`,
    });
  }
}

/**
 * Handle activity.logged events.
 * Links the activity to the opportunity if opportunityId is referenced.
 *
 * @param {{ activityId, opportunityId }} payload
 */
async function handleActivityLogged(payload) {
  const { activityId, opportunityId } = payload;
  if (!opportunityId || !activityId) return;

  const opportunity = store.get(opportunityId);
  if (!opportunity) return; // opportunity may belong to another context

  if (!opportunity.linkedActivityIds.includes(activityId)) {
    opportunity.linkedActivityIds.push(activityId);
    opportunity.updatedAt = new Date().toISOString();
    store.set(opportunityId, opportunity);
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function defaultProbability(stage) {
  const map = {
    prospecting: 10,
    qualification: 20,
    needs_analysis: 30,
    value_proposition: 40,
    decision_makers: 50,
    proposal: 60,
    negotiation: 75,
    closed_won: 100,
    closed_lost: 0,
  };
  return map[stage] !== undefined ? map[stage] : 0;
}

function ninetyDaysFromNow() {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  PIPELINE_STAGES,
  listOpportunities,
  getOpportunity,
  createOpportunity,
  updateOpportunity,
  updateStage,
  getForecast,
  handleContactCreated,
  handleActivityLogged,
  onEvent,
  // Expose store for testing
  _store: store,
};
