import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

class RedisClient {
  private static instance: RedisClient;
  private client: RedisClientType;
  private subscriber: RedisClientType;
  private publisher: RedisClientType;

  private constructor() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
    };

    this.client = createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
      password: redisConfig.password,
    });

    this.subscriber = createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
      password: redisConfig.password,
    });

    this.publisher = createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
      password: redisConfig.password,
    });
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public async connect(): Promise<void> {
    try {
      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
        this.publisher.connect(),
      ]);

      console.log('✅ Connected to Redis');

      this.client.on('error', (error) => {
        console.error('❌ Redis client error:', error);
      });

      this.subscriber.on('error', (error) => {
        console.error('❌ Redis subscriber error:', error);
      });

      this.publisher.on('error', (error) => {
        console.error('❌ Redis publisher error:', error);
      });
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  public getClient(): RedisClientType {
    return this.client;
  }

  public getSubscriber(): RedisClientType {
    return this.subscriber;
  }

  public getPublisher(): RedisClientType {
    return this.publisher;
  }

  public async publish(channel: string, message: string): Promise<void> {
    await this.publisher.publish(channel, message);
  }

  public async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    await this.subscriber.subscribe(channel, callback);
  }

  public async disconnect(): Promise<void> {
    await Promise.all([
      this.client.disconnect(),
      this.subscriber.disconnect(),
      this.publisher.disconnect(),
    ]);
  }
}

export default RedisClient;
