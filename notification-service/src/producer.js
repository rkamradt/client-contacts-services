const kafka = require('./kafka');

const producer = kafka.producer();

/**
 * Connect the Kafka producer.
 * Should be called once at application startup.
 */
async function connect() {
  await producer.connect();
  console.log('[producer] Connected to Kafka');
}

/**
 * Publish a message to a Kafka topic.
 *
 * Topics this producer publishes to:
 *   - notification.sent    — Emitted when any notification is successfully delivered
 *   - notification.failed  — Emitted when notification delivery fails
 *   - alert.triggered      — Emitted when system alert conditions are met
 *
 * @param {string} topic   - The Kafka topic to publish to
 * @param {object} payload - The event payload (will be JSON-serialised)
 */
async function publish(topic, payload) {
  const message = {
    key: payload.notificationId || payload.alertId || payload.referenceId || null,
    value: JSON.stringify(payload),
  };

  await producer.send({ topic, messages: [message] });
  console.log(`[producer] Published to ${topic}:`, JSON.stringify(payload));
}

module.exports = { connect, publish };
