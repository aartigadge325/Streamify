const app = require('./app');
const connectDatabase = require('./config/database');
const mongoose = require('mongoose');
const { port } = require('./config/env');

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let shuttingDown = false;

async function connectWithRetry() {
  let retryDelayMs = 1000;
  while (!shuttingDown && mongoose.connection.readyState !== 1) {
    try {
      await connectDatabase();
      return;
    } catch (error) {
      console.error(`MongoDB unavailable: ${error.message}`);
      console.log(`Retrying database connection in ${Math.round(retryDelayMs / 1000)}s`);
      await delay(retryDelayMs);
      retryDelayMs = Math.min(retryDelayMs * 2, 30000);
    }
  }
}

function start() {
  const server = app.listen(port, () => {
    console.log(`Streamify API listening on port ${port}`);
    void connectWithRetry();
  });
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received; shutting down gracefully`);
    server.close(async (error) => {
      if (error) console.error('HTTP server shutdown error:', error);
      await mongoose.disconnect();
      process.exit(error ? 1 : 0);
    });
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

start();
