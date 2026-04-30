const {
  notifyTerritoryChanged,
  createNotification,
  createAlert,
  CHANNELS,
  SEVERITY,
} = require('../services/notification_service');

/**
 * Handler for topic: user.territory-changed
 *
 * Sends notifications about territory reassignments and handoffs to:
 *  1. The affected user (primary notification, via email)
 *  2. Their manager (summary notification)
 *  3. A system alert for the broader team to coordinate handoffs
 *
 * Expected payload shape:
 * {
 *   userId:                  string,
 *   userName:                string,
 *   previousTerritoryId:     string,
 *   previousTerritoryName:   string,
 *   newTerritoryId:          string,
 *   newTerritoryName:        string,
 *   managerUserId?:          string,
 *   effectiveDate?:          string,
 *   openOpportunityCount?:   number,
 *   changedAt?:              string,
 * }
 *
 * @param {object} payload
 * @returns {object|object[]|null}
 */
async function handle(payload) {
  const {
    userId,
    userName,
    previousTerritoryId,
    previousTerritoryName,
    newTerritoryId,
    newTerritoryName,
    managerUserId,
    effectiveDate,
    openOpportunityCount,
  } = payload;

  if (!userId || !newTerritoryId) {
    console.warn('[user-territory-changed] Missing required fields, skipping.');
    return null;
  }

  const outboundEvents = [];

  // 1. Primary notification to the reassigned user
  const { event: userEvent } = notifyTerritoryChanged({
    userId,
    userName: userName || 'User',
    previousTerritoryId: previousTerritoryId || 'unknown',
    previousTerritoryName: previousTerritoryName || 'Previous Territory',
    newTerritoryId,
    newTerritoryName: newTerritoryName || 'New Territory',
    managerUserId,
  });
  outboundEvents.push(userEvent);

  // 2. Manager notification (if different from the user)
  if (managerUserId && managerUserId !== userId) {
    const effectiveDateStr = effectiveDate
      ? ` effective ${new Date(effectiveDate).toLocaleDateString()}`
      : '';
    const opportunitiesStr =
      openOpportunityCount != null && openOpportunityCount > 0
        ? ` They currently have ${openOpportunityCount} open opportunity${openOpportunityCount !== 1 ? 'ies' : 'y'} that may require handoff coordination.`
        : '';

    const { event: managerEvent } = createNotification({
      recipientUserId: managerUserId,
      notificationType: 'territory_change',
      subject: `Territory Change: ${userName || 'A team member'} → ${newTerritoryName || 'New Territory'}`,
      message: `${userName || 'A team member'} has been reassigned from territory "${
        previousTerritoryName || 'Previous Territory'
      }" to "${newTerritoryName || 'New Territory'}"${effectiveDateStr}.${opportunitiesStr} Please coordinate any necessary account or opportunity handoffs.`,
      channel: CHANNELS.IN_APP,
      referenceId: userId,
      referenceType: 'user',
      metadata: {
        userId,
        userName,
        previousTerritoryId,
        previousTerritoryName,
        newTerritoryId,
        newTerritoryName,
        effectiveDate,
        openOpportunityCount,
      },
    });
    outboundEvents.push(managerEvent);
  }

  // 3. System alert for handoff visibility — particularly important if there are open deals
  const hasOpenDeals = openOpportunityCount != null && Number(openOpportunityCount) > 0;

  const { event: alertEvent } = createAlert({
    alertType: 'territory_reassignment',
    severity: hasOpenDeals ? SEVERITY.WARNING : SEVERITY.INFO,
    title: `Territory Reassignment: ${userName || 'User'} moved to ${newTerritoryName || 'New Territory'}`,
    message: `${userName || 'A user'} has been reassigned from "${previousTerritoryName || 'Previous Territory'}" to "${
      newTerritoryName || 'New Territory'
    }".${
      hasOpenDeals
        ? ` ${openOpportunityCount} open opportunit${openOpportunityCount !== 1 ? 'ies require' : 'y requires'} handoff review.`
        : ' No open opportunities pending.'
    } Update account ownership and CRM assignments accordingly.`,
    affectedEntityId: userId,
    affectedEntityType: 'user',
    recipientUserIds: managerUserId ? [userId, managerUserId] : [userId],
    metadata: {
      userId,
      userName,
      previousTerritoryId,
      previousTerritoryName,
      newTerritoryId,
      newTerritoryName,
      openOpportunityCount,
      effectiveDate,
    },
  });
  outboundEvents.push(alertEvent);

  return outboundEvents;
}

module.exports = { handle };
