import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import RedisClient from '../config/redis';
import RabbitMQClient from '../config/rabbitmq';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

class SocketService {
  private static instance: SocketService;
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public initialize(server: HttpServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://your-frontend-domain.com'] 
          : ['http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    console.log('✅ Socket.io service initialized');
  }

  private setupMiddleware(): void {
    if (!this.io) return;

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        socket.userId = decoded.userId;
        socket.username = decoded.username;
        
        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`🔌 User ${socket.username} connected (${socket.id})`);
      
      // Store user connection
      if (socket.userId) {
        this.connectedUsers.set(socket.userId, socket.id);
        this.updateUserOnlineStatus(socket.userId, true);
      }

      // Join user to their rooms
      this.joinUserRooms(socket);

      // Handle joining specific room
      socket.on('join_room', (roomId: string) => {
        socket.join(roomId);
        socket.to(roomId).emit('user_joined', {
          userId: socket.userId,
          username: socket.username,
          timestamp: new Date(),
        });
        console.log(`📥 ${socket.username} joined room ${roomId}`);
      });

      // Handle leaving room
      socket.on('leave_room', (roomId: string) => {
        socket.leave(roomId);
        socket.to(roomId).emit('user_left', {
          userId: socket.userId,
          username: socket.username,
          timestamp: new Date(),
        });
        console.log(`📤 ${socket.username} left room ${roomId}`);
      });

      // Handle sending message
      socket.on('send_message', async (data: {
        roomId: string;
        content: string;
        messageType?: string;
      }) => {
        try {
          // Publish to RabbitMQ for processing
          const rabbitMQClient = RabbitMQClient.getInstance();
          await rabbitMQClient.publishToQueue('message_processing', {
            roomId: data.roomId,
            content: data.content,
            messageType: data.messageType || 'text',
            sender: socket.userId,
            timestamp: new Date(),
          });

          // Broadcast to room members immediately
          socket.to(data.roomId).emit('new_message', {
            roomId: data.roomId,
            content: data.content,
            messageType: data.messageType || 'text',
            sender: {
              _id: socket.userId,
              username: socket.username,
            },
            timestamp: new Date(),
          });

          console.log(`💬 Message sent by ${socket.username} to room ${data.roomId}`);
        } catch (error) {
          console.error('Error handling send_message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (roomId: string) => {
        socket.to(roomId).emit('user_typing', {
          userId: socket.userId,
          username: socket.username,
          isTyping: true,
        });
      });

      socket.on('typing_stop', (roomId: string) => {
        socket.to(roomId).emit('user_typing', {
          userId: socket.userId,
          username: socket.username,
          isTyping: false,
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`🔌 User ${socket.username} disconnected (${socket.id})`);
        
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          this.updateUserOnlineStatus(socket.userId, false);
        }
      });
    });
  }

  private async joinUserRooms(socket: AuthenticatedSocket): Promise<void> {
    try {
      // In a real application, you would fetch user's rooms from database
      // For now, we'll let rooms be joined manually
      console.log(`📋 ${socket.username} ready to join rooms`);
    } catch (error) {
      console.error('Error joining user rooms:', error);
    }
  }
  private async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      const redisClient = RedisClient.getInstance();
      const client = redisClient.getClient();
      await client.setEx(`user:${userId}:online`, 300, isOnline ? '1' : '0'); // 5 minutes TTL
      
      // Publish user status change
      await redisClient.publish('user_status_change', JSON.stringify({
        userId,
        isOnline,
        timestamp: new Date(),
      }));
    } catch (error) {
      console.error('Error updating user online status:', error);
    }
  }

  // Utility methods for external use
  public emitToRoom(roomId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(roomId).emit(event, data);
    }
  }

  public emitToUser(userId: string, event: string, data: any): void {
    const socketId = this.connectedUsers.get(userId);
    if (socketId && this.io) {
      this.io.to(socketId).emit(event, data);
    }
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  public getRoomMembers(roomId: string): Promise<string[]> {
    return new Promise((resolve) => {
      if (!this.io) {
        resolve([]);
        return;
      }

      this.io.in(roomId).fetchSockets().then((sockets) => {
        const members = sockets
          .map((socket: any) => socket.userId)
          .filter((userId: string) => userId);
        resolve(members);
      });
    });
  }
}

export default SocketService;
