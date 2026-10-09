const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connects to MongoDB using MONGO_URI from .env.
 *
 * The URI holds the database credentials, so it is never logged - not on
 * success and not on failure. Driver error messages can echo parts of the
 * connection string, so only the error name/code is logged, never
 * err.message.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not set');
  }

  // Only fields defined in a schema get saved - blocks unexpected keys
  // (and query operators) sneaking into documents or filters.
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection failed', {
      errorName: err.name,
      code: err.code || err.codeName,
    });
    throw new Error('Database connection failed');
  }

  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
}

module.exports = connectDB;
