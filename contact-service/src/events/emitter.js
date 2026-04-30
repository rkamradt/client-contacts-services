'use strict';

/**
 * Lightweight event emitter for domain events.
 *
 * In production this module should publish to a message broker
 * (e.g., Kafka, RabbitMQ, AWS SNS/SQS). For now it logs to stdout
 * so other services can observe events in local/test environments.
 */

/**
 * Emit a domain event.
 *
 * @param {string} topic  - Event topic name (e.g. "contact.created")
 * @param {object} payload - Event payload object
 */
function emit(topic, payload) {
  const envelope = {
    topic,
    timestamp: new Date().toISOString(),
    payload,
  };
  console.log(`[EVENT] ${topic}`, JSON.stringify(envelope));
}

module.exports = { emit };
