const mongoose = require('mongoose');
const logger   = require('../utils/logger');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/quranclass';
  try {
    await mongoose.connect(uri);
    logger.info('✅  MongoDB connected');
  } catch (err) {
    console.error('❌  MongoDB connection failed:', err.message);
    console.error('URI used:', uri?.replace(/:([^:@]+)@/, ':****@')); // hide password
    process.exit(1);
  }
};

module.exports = connectDB;
