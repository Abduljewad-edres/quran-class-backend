require('dotenv').config();
const app       = require('./app');
const connectDB = require('./config/db');
const logger    = require('./utils/logger');
const { initBot } = require('./services/telegram.service');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  const server = app.listen(PORT, () => {
    logger.info(`🚀  QuranClass API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  initBot();

  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down`);
    server.close(() => { process.exit(0); });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('uncaughtException',  (err) => { logger.error('Uncaught exception:', err);  process.exit(1); });
  process.on('unhandledRejection', (err) => { logger.error('Unhandled rejection:', err); process.exit(1); });
});
