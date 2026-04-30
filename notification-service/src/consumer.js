const kafka = require('./kafka');
const producer = require('./producer');

const opportunityStageChangedHandler = require('./handlers/opportunity-stage-changed');
const opportunityWonHandler = require('./handlers/opportunity-won');
const opportunityLostHandler = require('./handlers/opportunity-lost');
const activityLoggedHandler = require('./handlers/activity-logged');
const campaignContactEngagedHandler = require('./handlers/campaign-contact-engaged');
const contactCreatedHandler = require('./handlers/contact-created');
const userTerritoryChangedHandler = require('./handlers/user-territory-changed');

const consumer = kafka.consumer({ groupId: 'notification-service-group' });

const TOPIC_HANDLER_MAP = {
  'opportunity.stage-changed': opportunityStageChangedHandler,
  'opportunity.won': opportunityWonHandler,
  'opportunity.lost': opportunityLostHandler,
  'activity.logged': activityLoggedHandler,
  'campaign.contact-engaged': campaignContactEngagedHandler,
  'contact.created': contactCreatedHandler,
  'user.territory-changed': userTerritoryChangedHandler,
};

const TOPICS = Object.keys(TOPIC_HANDLER_MAP);

async function startConsumer() {
  await consumer.connect();
  console.log('[consumer] Connected to Kafka');

  for (const topic of TOPICS) {
    await consumer.subscribe({ topic, fromBeginning: false });
    console.log(`[consumer] Subscribed to topic: ${topic}`);
  }

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      let payload;

      try {
        const raw = message.value ? message.value.toString() : '{}';
        payload = JSON.parse(raw);
      } catch (parseErr) {
        console.error(`[consumer] Failed to parse message from ${topic}:`, parseErr.message);
        return;
      }

      console.log(`[consumer] Received message from ${topic}:`, JSON.stringify(payload));

      const handler = TOPIC_HANDLER_MAP[topic];
      if (!handler) {
        console.warn(`[consumer] No handler registered for topic: ${topic}`);
        return;
      }

      try {
        const result = await handler.handle(payload);

        if (result) {
          const events = Array.isArray(result) ? result : [result];
          for (const event of events) {
            if (event && event.topic && event.payload) {
              await producer.publish(event.topic, event.payload);
            }
          }
        }
      } catch (handlerErr) {
        console.error(`[consumer] Handler error for topic ${topic}:`, handlerErr.message, handlerErr.stack);
      }
    },
  });
}

module.exports = { startConsumer };
