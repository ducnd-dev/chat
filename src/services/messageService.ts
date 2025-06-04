import Message from '../models/Message';
import Room from '../models/Room';
import { CreateMessageDto, UpdateMessageDto, MessageQuery } from '../types';
import RedisClient from '../config/redis';
import RabbitMQClient from '../config/rabbitmq';
import SocketService from './socketService';

class MessageService {
  private redisClient = RedisClient.getInstance();
  private rabbitMQClient = RabbitMQClient.getInstance();
  private socketService = SocketService.getInstance();

  public async sendMessage(messageData: CreateMessageDto, senderId: string) {
    const room = await Room.findById(messageData.room);

    if (!room) {
      throw new Error('Room not found');
    }

    if (!room.members.includes(senderId)) {
      throw new Error('User is not a member of this room');
    }

    const message = new Message({
      ...messageData,
      sender: senderId,
    });    await message.save();
    await message.populate('sender', 'username firstName lastName avatar');
    await message.populate('room', 'name');

    // Emit real-time message to room members
    this.socketService.emitToRoom(messageData.room, 'new_message', {
      _id: message._id,
      content: message.content,
      messageType: message.messageType,
      sender: message.sender,
      room: message.room,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    });

    await this.publishMessageToRedis(message);
    await this.publishMessageToRabbitMQ(message);

    return message;
  }

  public async getMessages(query: MessageQuery) {
    const { room, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const roomExists = await Room.findById(room);
    if (!roomExists) {
      throw new Error('Room not found');
    }

    const messages = await Message.find({ room })
      .populate('sender', 'username firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ room });

    return {
      messages: messages.reverse(),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMessages: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  public async updateMessage(messageId: string, updateData: UpdateMessageDto, userId: string) {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.sender.toString() !== userId) {
      throw new Error('You can only edit your own messages');
    }

    message.content = updateData.content;
    await message.save();

    await message.populate('sender', 'username firstName lastName avatar');
    await message.populate('room', 'name');

    await this.publishMessageEditToRedis(message);

    return message;
  }

  public async deleteMessage(messageId: string, userId: string) {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.sender.toString() !== userId) {
      throw new Error('You can only delete your own messages');
    }

    await Message.findByIdAndDelete(messageId);

    await this.publishMessageDeleteToRedis(messageId, message.room.toString());

    return { message: 'Message deleted successfully' };
  }

  public async getMessageById(messageId: string) {
    const message = await Message.findById(messageId)
      .populate('sender', 'username firstName lastName avatar')
      .populate('room', 'name');

    if (!message) {
      throw new Error('Message not found');
    }

    return message;
  }

  private async publishMessageToRedis(message: any) {
    try {
      const redisMessage = {
        type: 'new_message',
        room: message.room._id.toString(),
        data: message,
        timestamp: new Date(),
      };

      await this.redisClient.publish(
        `room:${message.room._id}`,
        JSON.stringify(redisMessage)
      );
    } catch (error) {
      console.error('Error publishing message to Redis:', error);
    }
  }

  private async publishMessageEditToRedis(message: any) {
    try {
      const redisMessage = {
        type: 'message_edited',
        room: message.room._id.toString(),
        data: message,
        timestamp: new Date(),
      };

      await this.redisClient.publish(
        `room:${message.room._id}`,
        JSON.stringify(redisMessage)
      );
    } catch (error) {
      console.error('Error publishing message edit to Redis:', error);
    }
  }

  private async publishMessageDeleteToRedis(messageId: string, roomId: string) {
    try {
      const redisMessage = {
        type: 'message_deleted',
        room: roomId,
        data: { messageId },
        timestamp: new Date(),
      };

      await this.redisClient.publish(
        `room:${roomId}`,
        JSON.stringify(redisMessage)
      );
    } catch (error) {
      console.error('Error publishing message delete to Redis:', error);
    }
  }

  private async publishMessageToRabbitMQ(message: any) {
    try {
      await this.rabbitMQClient.publishToQueue('message_processing', {
        type: 'message_sent',
        payload: {
          messageId: message._id,
          senderId: message.sender._id,
          roomId: message.room._id,
          content: message.content,
          timestamp: message.createdAt,
        },
      });

      await this.rabbitMQClient.publishToQueue('message_logging', {
        type: 'log_message',
        payload: message,
      });
    } catch (error) {
      console.error('Error publishing message to RabbitMQ:', error);
    }
  }
}

export default new MessageService();
