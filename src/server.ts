import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import Database from './config/database';
import RedisClient from './config/redis';
import RabbitMQClient from './config/rabbitmq';
import { setupSwagger } from './config/swagger';

import authRoutes from './routes/authRoutes';
import roomRoutes from './routes/roomRoutes';
import messageRoutes from './routes/messageRoutes';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';

dotenv.config();

class App {
  public app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000');
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSwagger();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-frontend-domain.com'] 
        : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
    }));

    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    this.app.use(limiter);
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    this.app.use((req, _res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private initializeRoutes(): void {
    this.app.get('/', (_req, res) => {
      res.json({
        success: true,
        message: 'Chat API Server is running!',
        version: '1.0.0',
        endpoints: {
          documentation: '/api-docs',
          health: '/health',
          auth: '/api/auth',
          rooms: '/api/rooms',
          messages: '/api/messages',
        },
      });
    });

    this.app.get('/health', (_req, res) => {
      res.json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
      });
    });

    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/rooms', roomRoutes);
    this.app.use('/api/messages', messageRoutes);
  }

  private initializeSwagger(): void {
    setupSwagger(this.app as any);
  }

  private initializeErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await Database.getInstance().connect();
    } catch (error) {
      console.error('Failed to connect to database:', error);
      process.exit(1);
    }
  }

  private async initializeRedis(): Promise<void> {
    try {
      await RedisClient.getInstance().connect();
      this.setupRedisSubscriptions();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      process.exit(1);
    }
  }

  private async initializeRabbitMQ(): Promise<void> {
    try {
      await RabbitMQClient.getInstance().connect();
      this.setupRabbitMQConsumers();
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      process.exit(1);
    }
  }

  private setupRedisSubscriptions(): void {
    const redisClient = RedisClient.getInstance();
    
    redisClient.subscribe('room:*', (message) => {
      console.log('Redis message received:', message);
    });

    console.log('✅ Redis subscriptions set up');
  }

  private setupRabbitMQConsumers(): void {
    const rabbitMQClient = RabbitMQClient.getInstance();

    rabbitMQClient.consumeFromQueue('message_processing', (message) => {
      console.log('Processing message:', message);
    });

    rabbitMQClient.consumeFromQueue('user_notifications', (message) => {
      console.log('Processing notification:', message);
    });

    rabbitMQClient.consumeFromQueue('message_logging', (message) => {
      console.log('Logging message:', message);
    });

    console.log('✅ RabbitMQ consumers set up');
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n📤 Received ${signal}. Starting graceful shutdown...`);
      
      try {
        await Promise.all([
          Database.getInstance().disconnect(),
          RedisClient.getInstance().disconnect(),
          RabbitMQClient.getInstance().disconnect(),
        ]);
        
        console.log('✅ All connections closed successfully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  public async start(): Promise<void> {
    try {
      await this.initializeDatabase();
      await this.initializeRedis();
      await this.initializeRabbitMQ();
      
      this.setupGracefulShutdown();

      this.app.listen(this.port, () => {
        console.log('\n🚀 Chat API Server Started Successfully!');
        console.log(`📍 Server running on port ${this.port}`);
        console.log(`📚 API Documentation: http://localhost:${this.port}/api-docs`);
        console.log(`🏥 Health Check: http://localhost:${this.port}/health`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log('─'.repeat(50));
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }
}

const app = new App();
app.start();

export default app;
