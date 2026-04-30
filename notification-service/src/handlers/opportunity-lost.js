const {
  notifyOpportunityLost,
  createAlert,
  SEVERITY,
} = require('../services/notification_service');

/**
 * Handler for topic: opportunity.lost
 *
 * Sends follow-up reminders and analysis prompts to the opportunity owner.
 * Also triggers a system alert so managers can review patterns.
 *
 * Expected payload shape:
 * {
 *   opportunityId:   string,
 *   opportunityName: string,
 *   ownerUserId:     string,
 *   managerUserId?:  string,
 *   dealValue?:      number,
 *   accountName?:    string,
 *   accountId?:      string,
 *   lossReason?:     string,
 *   competitorName?: string,
 *   closedAt?:       string,
 * }
 *
 * @param {object} payload
 * @returns {object|object[]|null}
 */
async function handle(payload) {
  const {
    opportunityId,
    opportunityName,
    ownerUserId,
    managerUserId,
    dealValue,
    accountName,
    lossReason,
    competitorName,
  } = payload;

  if (!opportunityId || !ownerUserId) {
    console.warn('[opportunity-lost] Missing required fields, skipping.');
    return null;
  }

  const outboundEvents = [];

  // 1. Follow-up reminder and analysis prompt to the owner
  const { event: ownerEvent } = notifyOpportunityLost({
    opportunityId,
    opportunityName: opportunityName || 'Unnamed Opportunity',
    ownerUserId,
    lossReason,
    accountName,
  });
  outboundEvents.push(ownerEvent);

  // 2. Manager-facing alert for pipeline visibility
  const affectedUsers = [ownerUserId];
  if (managerUserId && managerUserId !== ownerUserId) {
    affectedUsers.push(managerUserId);
  }

  const competitorStr = competitorName ? ` Lost to: ${competitorName}.` : '';
  const valueStr = dealValue != null ? ` ($${Number(dealValue).toLocaleString()})` : '';

  const { event: alertEvent } = createAlert({
    alertType: 'deal_lost',
    severity: SEVERITY.WARNING,
    title: `Deal Lost: "${opportunityName || 'Unnamed Opportunity'}"${valueStr}`,
    message: `Opportunity "${opportunityName || 'Unnamed Opportunity'}"${
      accountName ? ` with ${accountName}` : ''
    }${valueStr} has been marked as lost.${lossReason ? ` Reason: ${lossReason}.` : ''}${competitorStr} Schedule a loss review to identify patterns.`,
    affectedEntityId: opportunityId,
    affectedEntityType: 'opportunity',
    recipientUserIds: affectedUsers,
    metadata: {
      opportunityId,
      opportunityName,
      dealValue,
      accountName,
      lossReason,
      competitorName,
      ownerUserId,
    },
  });
  outboundEvents.push(alertEvent);

  return outboundEvents;
}

module.exports = { handle };
