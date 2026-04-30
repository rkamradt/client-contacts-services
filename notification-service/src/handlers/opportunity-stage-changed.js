const {
  notifyOpportunityStageChanged,
  createAlert,
  SEVERITY,
} = require('../services/notification_service');

/**
 * Handler for topic: opportunity.stage-changed
 *
 * Sends notifications for pipeline updates and milestone alerts.
 * When a deal reaches a late-stage milestone (e.g., Negotiation or Proposal)
 * it also triggers a system alert to surface this in dashboards.
 *
 * Expected payload shape:
 * {
 *   opportunityId:   string,
 *   opportunityName: string,
 *   previousStage:   string,
 *   newStage:        string,
 *   ownerUserId:     string,
 *   dealValue?:      number,
 *   accountName?:    string,
 *   accountId?:      string,
 *   changedAt?:      string,
 * }
 *
 * @param {object} payload
 * @returns {object|object[]|null} — event(s) to publish, or null
 */
async function handle(payload) {
  const {
    opportunityId,
    opportunityName,
    previousStage,
    newStage,
    ownerUserId,
    dealValue,
    accountName,
  } = payload;

  if (!opportunityId || !ownerUserId || !newStage) {
    console.warn('[opportunity-stage-changed] Missing required fields, skipping.');
    return null;
  }

  const outboundEvents = [];

  // Send standard stage-change notification to the opportunity owner
  const { event: notificationEvent } = notifyOpportunityStageChanged({
    opportunityId,
    opportunityName: opportunityName || 'Unnamed Opportunity',
    previousStage: previousStage || 'Unknown',
    newStage,
    ownerUserId,
    dealValue,
    accountName,
  });

  outboundEvents.push(notificationEvent);

  // Trigger a milestone alert for high-value or late-stage transitions
  const milestoneStages = ['Proposal Sent', 'Negotiation', 'Contract Review', 'Verbal Commitment'];
  const isHighValue = dealValue != null && Number(dealValue) >= 50000;
  const isMilestoneStage = milestoneStages.some((s) => s.toLowerCase() === (newStage || '').toLowerCase());

  if (isMilestoneStage || isHighValue) {
    const { event: alertEvent } = createAlert({
      alertType: 'opportunity_milestone',
      severity: isHighValue ? SEVERITY.HIGH : SEVERITY.WARNING,
      title: `Milestone reached: "${opportunityName}" → ${newStage}`,
      message: `Opportunity "${opportunityName}" has advanced to "${newStage}"${
        dealValue != null ? ` (deal value: $${Number(dealValue).toLocaleString()})` : ''
      }. Ensure next-step actions are scheduled.`,
      affectedEntityId: opportunityId,
      affectedEntityType: 'opportunity',
      recipientUserIds: [ownerUserId],
      metadata: { opportunityId, previousStage, newStage, dealValue, accountName },
    });

    outboundEvents.push(alertEvent);
  }

  return outboundEvents.length === 1 ? outboundEvents[0] : outboundEvents;
}

module.exports = { handle };
