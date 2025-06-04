import { Request, Response, NextFunction } from 'express';
import roomService from '../services/roomService';
import { CreateRoomDto } from '../types';

class RoomController {
  public async createRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roomData: CreateRoomDto = req.body;
      const ownerId = req.user!.userId;
      
      const room = await roomService.createRoom(roomData, ownerId);

      res.status(201).json({
        success: true,
        message: 'Room created successfully',
        data: room,
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async getRoomById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId } = req.params;
      const room = await roomService.getRoomById(roomId);

      res.status(200).json({
        success: true,
        message: 'Room retrieved successfully',
        data: room,
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async getUserRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const rooms = await roomService.getUserRooms(userId);

      res.status(200).json({
        success: true,
        message: 'Rooms retrieved successfully',
        data: rooms,
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async joinRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId } = req.params;
      const userId = req.user!.userId;
      
      const room = await roomService.joinRoom(roomId, userId);

      res.status(200).json({
        success: true,
        message: 'Joined room successfully',
        data: room,
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async leaveRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId } = req.params;
      const userId = req.user!.userId;
      
      const result = await roomService.leaveRoom(roomId, userId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async getRoomMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId } = req.params;
      const members = await roomService.getRoomMembers(roomId);

      res.status(200).json({
        success: true,
        message: 'Room members retrieved successfully',
        data: members,
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async updateRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId } = req.params;
      const updateData = req.body;
      const userId = req.user!.userId;
      
      const room = await roomService.updateRoom(roomId, updateData, userId);

      res.status(200).json({
        success: true,
        message: 'Room updated successfully',
        data: room,
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async deleteRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId } = req.params;
      const userId = req.user!.userId;
      
      const result = await roomService.deleteRoom(roomId, userId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async searchRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q } = req.query;
      const userId = req.user!.userId;

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Search query is required',
        });
        return;
      }

      const rooms = await roomService.searchRooms(q, userId);

      res.status(200).json({
        success: true,
        message: 'Rooms retrieved successfully',
        data: rooms,
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export default new RoomController();
