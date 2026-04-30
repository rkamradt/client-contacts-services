const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const producer = require('./producer');
const { startConsumer } = require('./consumer');

const app = express();

app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check — the only HTTP endpoint for this messaging-archetype service
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'notification-service' });
});

const PORT = process.env.PORT || 8080;

async function start() {
  try {
    await producer.connect();
    await startConsumer();

    app.listen(PORT, () => {
      console.log(`[notification-service] HTTP server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('[notification-service] Fatal startup error:', err.message, err.stack);
    process.exit(1);
  }
}

start();
