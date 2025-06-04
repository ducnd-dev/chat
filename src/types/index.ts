import { Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IRoom extends Document {
  name: string;
  description?: string;
  isPrivate: boolean;
  owner: string;
  members: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage extends Document {
  content: string;
  sender: string;
  room: string;
  messageType: 'text' | 'image' | 'file';
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthPayload {
  userId: string;
  username: string;
  email: string;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateRoomDto {
  name: string;
  description?: string;
  isPrivate: boolean;
}

export interface CreateMessageDto {
  content: string;
  room: string;
  messageType?: 'text' | 'image' | 'file';
}

export interface UpdateMessageDto {
  content: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface MessageQuery extends PaginationQuery {
  room: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface RedisMessage {
  type: 'new_message' | 'user_joined' | 'user_left' | 'message_edited' | 'message_deleted';
  room: string;
  data: any;
  timestamp: Date;
}

export interface RabbitMQMessage {
  type: 'message_sent' | 'user_notification' | 'room_activity';
  payload: any;
  timestamp: Date;
}
