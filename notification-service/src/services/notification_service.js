const { v4: uuidv4 } = require('uuid');

/**
 * NotificationService — Business Logic
 *
 * Manages system notifications, alerts, transactional emails, and real-time
 * communication channels. Uses in-memory stores for demonstration purposes.
 *
 * Pure functions / stateful in-memory data only — no Kafka or HTTP knowledge.
 */

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

/** @type {Map<string, object>} notificationId → notification record */
const notificationsStore = new Map();

/** @type {Map<string, object[]>} userId → notification[] */
const notificationsByUser = new Map();

/** @type {Map<string, object>} alertId → alert record */
const alertsStore = new Map();

/** @type {Map<string, object>} userId → preferences record */
const preferencesStore = new Map();

// ---------------------------------------------------------------------------
// Channel helpers
// ---------------------------------------------------------------------------

const CHANNELS = Object.freeze({
  IN_APP: 'in_app',
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
});

const SEVERITY = Object.freeze({
  INFO: 'info',
  WARNING: 'warning',
  HIGH: 'high',
  CRITICAL: 'critical',
});

// ---------------------------------------------------------------------------
// Preference management
// ---------------------------------------------------------------------------

/**
 * Get or create default delivery preferences for a user.
 * @param {string} userId
 * @returns {object} preferences
 */
function getPreferences(userId) {
  if (!preferencesStore.has(userId)) {
    const defaults = {
      userId,
      channels: {
        in_app: true,
        email: true,
        sms: false,
        push: true,
      },
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      timezone: 'UTC',
      notificationTypes: {
        opportunity_update: true,
        activity_reminder: true,
        campaign_engagement: true,
        contact_onboarding: true,
        territory_change: true,
        system_alert: true,
      },
      updatedAt: new Date().toISOString(),
    };
    preferencesStore.set(userId, defaults);
  }
  return preferencesStore.get(userId);
}

/**
 * Update delivery preferences for a user.
 * @param {string} userId
 * @param {object} updates
 * @returns {object} updated preferences
 */
function updatePreferences(userId, updates) {
  const existing = getPreferences(userId);
  const updated = {
    ...existing,
    ...updates,
    channels: { ...existing.channels, ...(updates.channels || {}) },
    notificationTypes: {
      ...existing.notificationTypes,
      ...(updates.notificationTypes || {}),
    },
    updatedAt: new Date().toISOString(),
  };
  preferencesStore.set(userId, updated);
  return updated;
}

// ---------------------------------------------------------------------------
// Notification management
// ---------------------------------------------------------------------------

/**
 * Create and "deliver" a notification to a user.
 *
 * @param {object} options
 * @param {string}   options.recipientUserId   - Target user ID
 * @param {string}   options.notificationType  - e.g. 'opportunity_update'
 * @param {string}   options.subject           - Short subject/title
 * @param {string}   options.message           - Full notification body
 * @param {string}   options.channel           - Delivery channel (in_app, email, etc.)
 * @param {string}   [options.referenceId]     - ID of the source entity
 * @param {string}   [options.referenceType]   - Type of source entity (opportunity, contact…)
 * @param {object}   [options.metadata]        - Additional contextual data
 * @returns {{ notification: object, event: object }}
 */
function createNotification({
  recipientUserId,
  notificationType,
  subject,
  message,
  channel = CHANNELS.IN_APP,
  referenceId = null,
  referenceType = null,
  metadata = {},
}) {
  const prefs = getPreferences(recipientUserId);

  // Check if user has opted out of this notification type
  const typeEnabled = prefs.notificationTypes[notificationType] !== false;
  const channelEnabled = prefs.channels[channel] !== false;

  const notificationId = uuidv4();
  const now = new Date().toISOString();

  const notification = {
    notificationId,
    recipientUserId,
    notificationType,
    subject,
    message,
    channel,
    referenceId,
    referenceType,
    metadata,
    read: false,
    delivered: typeEnabled && channelEnabled,
    sentAt: now,
    readAt: null,
  };

  notificationsStore.set(notificationId, notification);

  // Index by user
  if (!notificationsByUser.has(recipientUserId)) {
    notificationsByUser.set(recipientUserId, []);
  }
  notificationsByUser.get(recipientUserId).push(notification);

  if (!typeEnabled || !channelEnabled) {
    const failedEvent = {
      topic: 'notification.failed',
      payload: {
        notificationId,
        recipientUserId,
        channel,
        notificationType,
        errorMessage: !typeEnabled
          ? `User ${recipientUserId} has disabled notifications of type '${notificationType}'`
          : `User ${recipientUserId} has disabled channel '${channel}'`,
        failedAt: now,
      },
    };
    return { notification, event: failedEvent };
  }

  const sentEvent = {
    topic: 'notification.sent',
    payload: {
      notificationId,
      recipientUserId,
      channel,
      notificationType,
      subject,
      message,
      referenceId,
      referenceType,
      sentAt: now,
    },
  };

  return { notification, event: sentEvent };
}

/**
 * Retrieve all notifications for a user.
 * @param {string} userId
 * @param {{ unreadOnly?: boolean, limit?: number }} [opts]
 * @returns {object[]}
 */
function getNotificationsForUser(userId, { unreadOnly = false, limit = 50 } = {}) {
  const all = notificationsByUser.get(userId) || [];
  const filtered = unreadOnly ? all.filter((n) => !n.read) : all;
  return filtered.slice(-limit).reverse();
}

/**
 * Mark a notification as read.
 * @param {string} notificationId
 * @returns {object|null}
 */
function markAsRead(notificationId) {
  const notification = notificationsStore.get(notificationId);
  if (!notification) return null;
  notification.read = true;
  notification.readAt = new Date().toISOString();
  notificationsStore.set(notificationId, notification);
  return notification;
}

// ---------------------------------------------------------------------------
// Alert management
// ---------------------------------------------------------------------------

/**
 * Create a system alert.
 *
 * @param {object} options
 * @param {string}   options.alertType          - Category, e.g. 'territory_reassignment'
 * @param {string}   options.severity           - 'info' | 'warning' | 'high' | 'critical'
 * @param {string}   options.title              - Short alert title
 * @param {string}   options.message            - Detailed alert description
 * @param {string}   options.affectedEntityId   - ID of the entity that triggered the alert
 * @param {string}   options.affectedEntityType - Type of that entity
 * @param {string[]} options.recipientUserIds   - Users who should see this alert
 * @param {object}   [options.metadata]         - Extra context
 * @returns {{ alert: object, event: object }}
 */
function createAlert({
  alertType,
  severity = SEVERITY.INFO,
  title,
  message,
  affectedEntityId,
  affectedEntityType,
  recipientUserIds = [],
  metadata = {},
}) {
  const alertId = uuidv4();
  const now = new Date().toISOString();

  const alert = {
    alertId,
    alertType,
    severity,
    title,
    message,
    affectedEntityId,
    affectedEntityType,
    recipientUserIds,
    metadata,
    active: true,
    dismissed: false,
    triggeredAt: now,
    dismissedAt: null,
  };

  alertsStore.set(alertId, alert);

  const event = {
    topic: 'alert.triggered',
    payload: {
      alertId,
      alertType,
      severity,
      title,
      message,
      affectedEntityId,
      affectedEntityType,
      triggeredAt: now,
      recipientUserIds,
    },
  };

  return { alert, event };
}

/**
 * Get all active (non-dismissed) alerts.
 * @param {{ severity?: string, alertType?: string }} [filters]
 * @returns {object[]}
 */
function getActiveAlerts({ severity, alertType } = {}) {
  const all = Array.from(alertsStore.values()).filter((a) => !a.dismissed);
  return all.filter((a) => {
    if (severity && a.severity !== severity) return false;
    if (alertType && a.alertType !== alertType) return false;
    return true;
  });
}

/**
 * Dismiss an alert by ID.
 * @param {string} alertId
 * @returns {object|null}
 */
function dismissAlert(alertId) {
  const alert = alertsStore.get(alertId);
  if (!alert) return null;
  alert.dismissed = true;
  alert.active = false;
  alert.dismissedAt = new Date().toISOString();
  alertsStore.set(alertId, alert);
  return alert;
}

// ---------------------------------------------------------------------------
// Domain-specific notification builders
// ---------------------------------------------------------------------------

/**
 * Send an opportunity stage change notification.
 * @param {object} params
 * @param {string} params.opportunityId
 * @param {string} params.opportunityName
 * @param {string} params.previousStage
 * @param {string} params.newStage
 * @param {string} params.ownerUserId
 * @param {number} [params.dealValue]
 * @param {string} [params.accountName]
 * @returns {{ notification: object, event: object }}
 */
function notifyOpportunityStageChanged({
  opportunityId,
  opportunityName,
  previousStage,
  newStage,
  ownerUserId,
  dealValue,
  accountName,
}) {
  const valueStr = dealValue != null ? ` ($${Number(dealValue).toLocaleString()})` : '';
  const accountStr = accountName ? ` for ${accountName}` : '';
  return createNotification({
    recipientUserId: ownerUserId,
    notificationType: 'opportunity_update',
    subject: `Opportunity Stage Changed: ${opportunityName}`,
    message: `The opportunity "${opportunityName}"${accountStr}${valueStr} has moved from "${previousStage}" to "${newStage}".`,
    channel: CHANNELS.IN_APP,
    referenceId: opportunityId,
    referenceType: 'opportunity',
    metadata: { opportunityId, opportunityName, previousStage, newStage, dealValue, accountName },
  });
}

/**
 * Send an opportunity won notification.
 * @param {object} params
 * @param {string} params.opportunityId
 * @param {string} params.opportunityName
 * @param {string} params.ownerUserId
 * @param {number} [params.dealValue]
 * @param {string} [params.accountName]
 * @returns {{ notification: object, event: object }}
 */
function notifyOpportunityWon({ opportunityId, opportunityName, ownerUserId, dealValue, accountName }) {
  const valueStr = dealValue != null ? ` worth $${Number(dealValue).toLocaleString()}` : '';
  const accountStr = accountName ? ` with ${accountName}` : '';
  return createNotification({
    recipientUserId: ownerUserId,
    notificationType: 'opportunity_update',
    subject: `🎉 Deal Won: ${opportunityName}`,
    message: `Congratulations! You have won the deal "${opportunityName}"${accountStr}${valueStr}. Time to kick off onboarding and update your next steps.`,
    channel: CHANNELS.EMAIL,
    referenceId: opportunityId,
    referenceType: 'opportunity',
    metadata: { opportunityId, opportunityName, dealValue, accountName, outcome: 'won' },
  });
}

/**
 * Send an opportunity lost notification.
 * @param {object} params
 * @param {string} params.opportunityId
 * @param {string} params.opportunityName
 * @param {string} params.ownerUserId
 * @param {string} [params.lossReason]
 * @param {string} [params.accountName]
 * @returns {{ notification: object, event: object }}
 */
function notifyOpportunityLost({ opportunityId, opportunityName, ownerUserId, lossReason, accountName }) {
  const reasonStr = lossReason ? ` Reason: ${lossReason}.` : '';
  const accountStr = accountName ? ` with ${accountName}` : '';
  return createNotification({
    recipientUserId: ownerUserId,
    notificationType: 'opportunity_update',
    subject: `Deal Lost: ${opportunityName}`,
    message: `The opportunity "${opportunityName}"${accountStr} has been marked as lost.${reasonStr} Please log your analysis notes and schedule a retrospective.`,
    channel: CHANNELS.IN_APP,
    referenceId: opportunityId,
    referenceType: 'opportunity',
    metadata: { opportunityId, opportunityName, lossReason, accountName, outcome: 'lost' },
  });
}

/**
 * Send a notification for a newly logged activity.
 * @param {object} params
 * @param {string} params.activityId
 * @param {string} params.activityType  - 'call' | 'email' | 'meeting' | 'note' | 'task'
 * @param {string} params.subject
 * @param {string} params.assigneeUserId
 * @param {string} [params.contactName]
 * @param {string} [params.dueDate]
 * @returns {{ notification: object, event: object }}
 */
function notifyActivityLogged({ activityId, activityType, subject, assigneeUserId, contactName, dueDate }) {
  const contactStr = contactName ? ` regarding ${contactName}` : '';
  const dueDateStr = dueDate ? ` — due ${new Date(dueDate).toLocaleDateString()}` : '';
  return createNotification({
    recipientUserId: assigneeUserId,
    notificationType: 'activity_reminder',
    subject: `New ${activityType} assigned: ${subject}`,
    message: `A ${activityType} "${subject}"${contactStr} has been logged and assigned to you${dueDateStr}.`,
    channel: CHANNELS.IN_APP,
    referenceId: activityId,
    referenceType: 'activity',
    metadata: { activityId, activityType, subject, contactName, dueDate },
  });
}

/**
 * Send a real-time alert when a campaign contact engages.
 * @param {object} params
 * @param {string} params.campaignId
 * @param {string} params.campaignName
 * @param {string} params.contactId
 * @param {string} params.contactName
 * @param {string} params.engagementType  - 'open' | 'click' | 'reply'
 * @param {string} params.ownerUserId
 * @returns {{ notification: object, event: object }}
 */
function notifyCampaignContactEngaged({
  campaignId,
  campaignName,
  contactId,
  contactName,
  engagementType,
  ownerUserId,
}) {
  const engagementVerb =
    engagementType === 'open' ? 'opened your email' :
    engagementType === 'click' ? 'clicked a link in your email' :
    engagementType === 'reply' ? 'replied to your email' : engagementType;

  return createNotification({
    recipientUserId: ownerUserId,
    notificationType: 'campaign_engagement',
    subject: `📬 ${contactName} engaged with "${campaignName}"`,
    message: `${contactName} just ${engagementVerb} from campaign "${campaignName}". Consider reaching out while interest is high.`,
    channel: CHANNELS.PUSH,
    referenceId: contactId,
    referenceType: 'contact',
    metadata: { campaignId, campaignName, contactId, contactName, engagementType },
  });
}

/**
 * Send a welcome/onboarding notification when a new contact is created.
 * @param {object} params
 * @param {string} params.contactId
 * @param {string} params.contactName
 * @param {string} params.ownerUserId
 * @param {string} [params.leadSource]
 * @returns {{ notification: object, event: object }}
 */
function notifyContactCreated({ contactId, contactName, ownerUserId, leadSource }) {
  const sourceStr = leadSource ? ` via ${leadSource}` : '';
  return createNotification({
    recipientUserId: ownerUserId,
    notificationType: 'contact_onboarding',
    subject: `New contact created: ${contactName}`,
    message: `A new contact, ${contactName}${sourceStr}, has been added to your pipeline. Start the onboarding sequence and schedule an initial outreach activity.`,
    channel: CHANNELS.IN_APP,
    referenceId: contactId,
    referenceType: 'contact',
    metadata: { contactId, contactName, leadSource },
  });
}

/**
 * Notify a user about a territory reassignment.
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.userName
 * @param {string} params.previousTerritoryId
 * @param {string} params.previousTerritoryName
 * @param {string} params.newTerritoryId
 * @param {string} params.newTerritoryName
 * @param {string} [params.managerUserId]
 * @returns {{ notification: object, event: object }}
 */
function notifyTerritoryChanged({
  userId,
  userName,
  previousTerritoryId,
  previousTerritoryName,
  newTerritoryId,
  newTerritoryName,
  managerUserId,
}) {
  return createNotification({
    recipientUserId: userId,
    notificationType: 'territory_change',
    subject: `Territory Reassignment: ${previousTerritoryName} → ${newTerritoryName}`,
    message: `Hi ${userName}, your sales territory has been updated from "${previousTerritoryName}" to "${newTerritoryName}". Please review your account list and coordinate any open opportunity handoffs with your previous territory contacts.`,
    channel: CHANNELS.EMAIL,
    referenceId: newTerritoryId,
    referenceType: 'territory',
    metadata: {
      userId,
      previousTerritoryId,
      previousTerritoryName,
      newTerritoryId,
      newTerritoryName,
      managerUserId,
    },
  });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  CHANNELS,
  SEVERITY,

  // Preferences
  getPreferences,
  updatePreferences,

  // Notifications
  createNotification,
  getNotificationsForUser,
  markAsRead,

  // Alerts
  createAlert,
  getActiveAlerts,
  dismissAlert,

  // Domain helpers
  notifyOpportunityStageChanged,
  notifyOpportunityWon,
  notifyOpportunityLost,
  notifyActivityLogged,
  notifyCampaignContactEngaged,
  notifyContactCreated,
  notifyTerritoryChanged,
};
