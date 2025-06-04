import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

class Database {
  private static instance: Database;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatdb';
      
      await mongoose.connect(mongoUri);
      
      console.log('✅ Connected to MongoDB');
      
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('📤 MongoDB disconnected');
      });

      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('📤 MongoDB connection closed through app termination');
        process.exit(0);
      });
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      process.exit(1);
    }
  }

  public async disconnect(): Promise<void> {
    await mongoose.connection.close();
  }
}

export default Database;
