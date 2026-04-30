const {
  notifyActivityLogged,
  createNotification,
  CHANNELS,
} = require('../services/notification_service');

/**
 * Handler for topic: activity.logged
 *
 * Sends notifications for task assignments and meeting reminders.
 * - If the activity has an assignee different from the logger, notify the assignee.
 * - For meetings, notify all participant user IDs if provided.
 * - For tasks, include a due-date reminder.
 *
 * Expected payload shape:
 * {
 *   activityId:      string,
 *   activityType:    string,   // 'call' | 'email' | 'meeting' | 'note' | 'task'
 *   subject:         string,
 *   contactId?:      string,
 *   contactName?:    string,
 *   loggedByUserId:  string,
 *   assigneeUserId?: string,
 *   participantUserIds?: string[],
 *   dueDate?:        string,
 *   scheduledAt?:    string,
 *   notes?:          string,
 *   loggedAt?:       string,
 * }
 *
 * @param {object} payload
 * @returns {object|object[]|null}
 */
async function handle(payload) {
  const {
    activityId,
    activityType,
    subject,
    contactId,
    contactName,
    loggedByUserId,
    assigneeUserId,
    participantUserIds = [],
    dueDate,
    scheduledAt,
  } = payload;

  if (!activityId || !activityType || !loggedByUserId) {
    console.warn('[activity-logged] Missing required fields, skipping.');
    return null;
  }

  const outboundEvents = [];

  // 1. Notify assignee if different from the person who logged it
  const effectiveAssignee = assigneeUserId || loggedByUserId;
  if (effectiveAssignee !== loggedByUserId || activityType === 'task') {
    const { event } = notifyActivityLogged({
      activityId,
      activityType,
      subject: subject || `${activityType} activity`,
      assigneeUserId: effectiveAssignee,
      contactName,
      dueDate: dueDate || scheduledAt,
    });
    outboundEvents.push(event);
  }

  // 2. For meetings, notify all unique participants (excluding the logger and already-notified assignee)
  if (activityType === 'meeting' && participantUserIds.length > 0) {
    const alreadyNotified = new Set([loggedByUserId, effectiveAssignee]);

    for (const participantId of participantUserIds) {
      if (alreadyNotified.has(participantId)) continue;
      alreadyNotified.add(participantId);

      const scheduledStr = scheduledAt ? ` on ${new Date(scheduledAt).toLocaleString()}` : '';
      const contactStr = contactName ? ` with ${contactName}` : '';

      const { event: participantEvent } = createNotification({
        recipientUserId: participantId,
        notificationType: 'activity_reminder',
        subject: `Meeting scheduled: ${subject || 'Meeting'}`,
        message: `You have been added as a participant in a meeting "${subject || 'Meeting'}"${contactStr}${scheduledStr}. Please confirm your availability.`,
        channel: CHANNELS.IN_APP,
        referenceId: activityId,
        referenceType: 'activity',
        metadata: {
          activityId,
          activityType,
          subject,
          contactId,
          contactName,
          scheduledAt,
          loggedByUserId,
        },
      });
      outboundEvents.push(participantEvent);
    }
  }

  if (outboundEvents.length === 0) return null;
  return outboundEvents.length === 1 ? outboundEvents[0] : outboundEvents;
}

module.exports = { handle };
