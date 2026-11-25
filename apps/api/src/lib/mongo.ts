import mongoose from 'mongoose';
import type { Logger } from './logger';

mongoose.set('strictQuery', true);

/**
 * Connects to MongoDB, retrying every 5 s until it succeeds, so the API can boot (and report
 * mongo: "down" on /health) while the database is still starting. Mongoose handles reconnects after that.
 */
export async function connectMongo(uri: string, logger: Logger): Promise<void> {
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));

  for (let attempt = 1; ; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      logger.info('MongoDB connected');
      return;
    } catch (err) {
      logger.error({ err, attempt }, 'MongoDB connection failed; retrying in 5 s');
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

export async function pingMongo(): Promise<boolean> {
  const db = mongoose.connection.db;
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.connected || !db) return false;
  await db.admin().ping();
  return true;
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
