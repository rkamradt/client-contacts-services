const {
  notifyCampaignContactEngaged,
  createAlert,
  SEVERITY,
} = require('../services/notification_service');

/**
 * Handler for topic: campaign.contact-engaged
 *
 * Sends real-time alerts when high-value prospects open, click, or respond
 * to a campaign. Triggers both a push notification for the owner and a
 * system alert if the contact has a high engagement score or deal value.
 *
 * Expected payload shape:
 * {
 *   campaignId:        string,
 *   campaignName:      string,
 *   contactId:         string,
 *   contactName:       string,
 *   engagementType:    string,   // 'open' | 'click' | 'reply'
 *   ownerUserId:       string,
 *   contactScore?:     number,   // lead score 0–100
 *   dealValue?:        number,   // associated opportunity value if known
 *   engagedAt?:        string,
 * }
 *
 * @param {object} payload
 * @returns {object|object[]|null}
 */
async function handle(payload) {
  const {
    campaignId,
    campaignName,
    contactId,
    contactName,
    engagementType,
    ownerUserId,
    contactScore,
    dealValue,
  } = payload;

  if (!campaignId || !contactId || !ownerUserId || !engagementType) {
    console.warn('[campaign-contact-engaged] Missing required fields, skipping.');
    return null;
  }

  const outboundEvents = [];

  // 1. Real-time engagement notification to the campaign owner
  const { event: notificationEvent } = notifyCampaignContactEngaged({
    campaignId,
    campaignName: campaignName || 'Campaign',
    contactId,
    contactName: contactName || 'A contact',
    engagementType,
    ownerUserId,
  });
  outboundEvents.push(notificationEvent);

  // 2. If the prospect is high-value (high score or significant deal value), trigger an alert
  const isHighScore = contactScore != null && Number(contactScore) >= 75;
  const isHighValue = dealValue != null && Number(dealValue) >= 25000;

  if (isHighScore || isHighValue || engagementType === 'reply') {
    const engagementLabel =
      engagementType === 'open' ? 'opened your email' :
      engagementType === 'click' ? 'clicked a link' :
      engagementType === 'reply' ? 'replied' : 'engaged';

    const scoreStr = contactScore != null ? ` (lead score: ${contactScore})` : '';
    const valueStr = dealValue != null ? `, potential deal value: $${Number(dealValue).toLocaleString()}` : '';

    const { event: alertEvent } = createAlert({
      alertType: 'high_value_engagement',
      severity: engagementType === 'reply' ? SEVERITY.HIGH : SEVERITY.WARNING,
      title: `High-value prospect engaged: ${contactName || 'Contact'}`,
      message: `${contactName || 'A contact'}${scoreStr}${valueStr} just ${engagementLabel} in campaign "${campaignName || 'Campaign'}". Act quickly — this is a buying signal.`,
      affectedEntityId: contactId,
      affectedEntityType: 'contact',
      recipientUserIds: [ownerUserId],
      metadata: {
        campaignId,
        campaignName,
        contactId,
        contactName,
        engagementType,
        contactScore,
        dealValue,
      },
    });
    outboundEvents.push(alertEvent);
  }

  return outboundEvents.length === 1 ? outboundEvents[0] : outboundEvents;
}

module.exports = { handle };
