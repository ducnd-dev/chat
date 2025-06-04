import { Request, Response, NextFunction } from 'express';
import messageService from '../services/messageService';
import { CreateMessageDto, UpdateMessageDto, MessageQuery } from '../types';

class MessageController {
  public async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const messageData: CreateMessageDto = req.body;
      const senderId = req.user!.userId;
      
      const message = await messageService.sendMessage(messageData, senderId);

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: message,
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { room } = req.params;
      const { page, limit } = req.query;

      const query: MessageQuery = {
        room,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
      };

      const result = await messageService.getMessages(query);

      res.status(200).json({
        success: true,
        message: 'Messages retrieved successfully',
        data: result,
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async updateMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { messageId } = req.params;
      const updateData: UpdateMessageDto = req.body;
      const userId = req.user!.userId;
      
      const message = await messageService.updateMessage(messageId, updateData, userId);

      res.status(200).json({
        success: true,
        message: 'Message updated successfully',
        data: message,
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async deleteMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { messageId } = req.params;
      const userId = req.user!.userId;
      
      const result = await messageService.deleteMessage(messageId, userId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async getMessageById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { messageId } = req.params;
      const message = await messageService.getMessageById(messageId);

      res.status(200).json({
        success: true,
        message: 'Message retrieved successfully',
        data: message,
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export default new MessageController();
