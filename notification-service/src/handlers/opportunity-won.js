const {
  notifyOpportunityWon,
  createAlert,
  createNotification,
  CHANNELS,
  SEVERITY,
} = require('../services/notification_service');

/**
 * Handler for topic: opportunity.won
 *
 * Sends congratulations and next-step notifications to the opportunity owner,
 * and optionally notifies the manager. Also triggers a system alert.
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
  } = payload;

  if (!opportunityId || !ownerUserId) {
    console.warn('[opportunity-won] Missing required fields, skipping.');
    return null;
  }

  const outboundEvents = [];

  // 1. Congratulations notification to the owner
  const { event: ownerEvent } = notifyOpportunityWon({
    opportunityId,
    opportunityName: opportunityName || 'Unnamed Opportunity',
    ownerUserId,
    dealValue,
    accountName,
  });
  outboundEvents.push(ownerEvent);

  // 2. Notify the manager if available
  if (managerUserId && managerUserId !== ownerUserId) {
    const valueStr = dealValue != null ? ` worth $${Number(dealValue).toLocaleString()}` : '';
    const accountStr = accountName ? ` with ${accountName}` : '';
    const { event: managerEvent } = createNotification({
      recipientUserId: managerUserId,
      notificationType: 'opportunity_update',
      subject: `Deal Won by your team: ${opportunityName || 'Unnamed Opportunity'}`,
      message: `Your team member has won the deal "${opportunityName || 'Unnamed Opportunity'}"${accountStr}${valueStr}. Review the account for upsell opportunities.`,
      channel: CHANNELS.EMAIL,
      referenceId: opportunityId,
      referenceType: 'opportunity',
      metadata: { opportunityId, opportunityName, dealValue, accountName, ownerUserId, outcome: 'won' },
    });
    outboundEvents.push(managerEvent);
  }

  // 3. Trigger a celebratory / visibility system alert
  const { event: alertEvent } = createAlert({
    alertType: 'deal_won',
    severity: SEVERITY.INFO,
    title: `Deal Won: "${opportunityName || 'Unnamed Opportunity'}"`,
    message: `An opportunity${accountName ? ` with ${accountName}` : ''}${
      dealValue != null ? ` valued at $${Number(dealValue).toLocaleString()}` : ''
    } has been closed as WON. Pipeline and revenue metrics have been updated.`,
    affectedEntityId: opportunityId,
    affectedEntityType: 'opportunity',
    recipientUserIds: managerUserId ? [ownerUserId, managerUserId] : [ownerUserId],
    metadata: { opportunityId, opportunityName, dealValue, accountName, ownerUserId },
  });
  outboundEvents.push(alertEvent);

  return outboundEvents;
}

module.exports = { handle };
