import amqp from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

class RabbitMQClient {
  private static instance: RabbitMQClient;
  private connection: any = null;
  private channel: any = null;
  
  private constructor() {}

  public static getInstance(): RabbitMQClient {
    if (!RabbitMQClient.instance) {
      RabbitMQClient.instance = new RabbitMQClient();
    }
    return RabbitMQClient.instance;
  }

  public async connect(): Promise<void> {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
      
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      await this.setupQueues();
      
      console.log('✅ Connected to RabbitMQ');

      this.connection.on('error', (error: Error) => {
        console.error('❌ RabbitMQ connection error:', error);
      });

      this.connection.on('close', () => {
        console.log('📤 RabbitMQ connection closed');
      });
    } catch (error) {
      console.error('❌ RabbitMQ connection failed:', error);
      throw error;
    }
  }

  private async setupQueues(): Promise<void> {
    if (!this.channel) return;

    const queues = [
      'message_processing',
      'user_notifications',
      'room_activities',
      'message_logging'
    ];

    for (const queue of queues) {
      await this.channel.assertQueue(queue, {
        durable: true,
        arguments: {
          'x-message-ttl': 86400000, // 24 hours
        }
      });
    }
  }

  public async publishToQueue(queue: string, message: any): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const messageBuffer = Buffer.from(JSON.stringify({
      ...message,
      timestamp: new Date(),
    }));

    await this.channel.sendToQueue(queue, messageBuffer, {
      persistent: true,
    });
  }

  public async consumeFromQueue(queue: string, callback: (message: any) => void): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    await this.channel.consume(queue, (msg: any) => {
      if (msg) {
        try {
          const message = JSON.parse(msg.content.toString());
          callback(message);
          this.channel!.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          this.channel!.nack(msg, false, false);
        }
      }
    });
  }

  public async disconnect(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }

  public getChannel(): any {
    return this.channel;
  }
}

export default RabbitMQClient;
