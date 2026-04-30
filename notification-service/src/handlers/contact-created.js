const {
  notifyContactCreated,
  createNotification,
  CHANNELS,
} = require('../services/notification_service');

/**
 * Handler for topic: contact.created
 *
 * Sends welcome notifications and onboarding alerts to the owning rep when
 * a new contact enters the system. If a manager is associated, they also
 * receive a lighter summary notification.
 *
 * Expected payload shape:
 * {
 *   contactId:       string,
 *   contactName:     string,
 *   email?:          string,
 *   phone?:          string,
 *   company?:        string,
 *   jobTitle?:       string,
 *   leadSource?:     string,
 *   ownerUserId:     string,
 *   managerUserId?:  string,
 *   accountId?:      string,
 *   accountName?:    string,
 *   createdAt?:      string,
 * }
 *
 * @param {object} payload
 * @returns {object|object[]|null}
 */
async function handle(payload) {
  const {
    contactId,
    contactName,
    email,
    company,
    jobTitle,
    leadSource,
    ownerUserId,
    managerUserId,
    accountName,
  } = payload;

  if (!contactId || !ownerUserId) {
    console.warn('[contact-created] Missing required fields, skipping.');
    return null;
  }

  const outboundEvents = [];

  // 1. Onboarding notification to the assigned owner
  const { event: ownerEvent } = notifyContactCreated({
    contactId,
    contactName: contactName || 'New Contact',
    ownerUserId,
    leadSource,
  });
  outboundEvents.push(ownerEvent);

  // 2. Summary notification to manager (if different from owner)
  if (managerUserId && managerUserId !== ownerUserId) {
    const titleStr = jobTitle ? `, ${jobTitle}` : '';
    const companyStr = company || accountName ? ` at ${company || accountName}` : '';
    const sourceStr = leadSource ? ` (source: ${leadSource})` : '';

    const { event: managerEvent } = createNotification({
      recipientUserId: managerUserId,
      notificationType: 'contact_onboarding',
      subject: `New contact in your team's pipeline: ${contactName || 'New Contact'}`,
      message: `${contactName || 'A new contact'}${titleStr}${companyStr} has been added to your team's pipeline${sourceStr}. ${email ? `Email: ${email}.` : ''} Review and ensure appropriate follow-up is scheduled.`,
      channel: CHANNELS.IN_APP,
      referenceId: contactId,
      referenceType: 'contact',
      metadata: {
        contactId,
        contactName,
        email,
        company,
        jobTitle,
        leadSource,
        ownerUserId,
      },
    });
    outboundEvents.push(managerEvent);
  }

  return outboundEvents.length === 1 ? outboundEvents[0] : outboundEvents;
}

module.exports = { handle };
