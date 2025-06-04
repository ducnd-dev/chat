import { Router } from 'express';
import roomController from '../controllers/roomController';
import { authenticateToken } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import {
  createRoomValidation,
  updateRoomValidation,
  roomIdValidation,
  searchRoomsValidation,
} from '../validators';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Chat room management endpoints
 */

/**
 * @swagger
 * /api/rooms:
 *   post:
 *     summary: Create a new room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - isPrivate
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               isPrivate:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Room created successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateToken, createRoomValidation, handleValidationErrors, roomController.createRoom);

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: Get user's rooms
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rooms retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateToken, roomController.getUserRooms);

/**
 * @swagger
 * /api/rooms/search:
 *   get:
 *     summary: Search public rooms
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Rooms retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/search', authenticateToken, searchRoomsValidation, handleValidationErrors, roomController.searchRooms);

/**
 * @swagger
 * /api/rooms/{roomId}:
 *   get:
 *     summary: Get room by ID
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Room not found
 */
router.get('/:roomId', authenticateToken, roomIdValidation, handleValidationErrors, roomController.getRoomById);

/**
 * @swagger
 * /api/rooms/{roomId}:
 *   put:
 *     summary: Update room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isPrivate:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Room updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only room owner can update
 */
router.put('/:roomId', authenticateToken, roomIdValidation, updateRoomValidation, handleValidationErrors, roomController.updateRoom);

/**
 * @swagger
 * /api/rooms/{roomId}:
 *   delete:
 *     summary: Delete room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only room owner can delete
 */
router.delete('/:roomId', authenticateToken, roomIdValidation, handleValidationErrors, roomController.deleteRoom);

/**
 * @swagger
 * /api/rooms/{roomId}/join:
 *   post:
 *     summary: Join room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Joined room successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Room not found
 */
router.post('/:roomId/join', authenticateToken, roomIdValidation, handleValidationErrors, roomController.joinRoom);

/**
 * @swagger
 * /api/rooms/{roomId}/leave:
 *   post:
 *     summary: Leave room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Left room successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Room owner cannot leave
 */
router.post('/:roomId/leave', authenticateToken, roomIdValidation, handleValidationErrors, roomController.leaveRoom);

/**
 * @swagger
 * /api/rooms/{roomId}/members:
 *   get:
 *     summary: Get room members
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room members retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Room not found
 */
router.get('/:roomId/members', authenticateToken, roomIdValidation, handleValidationErrors, roomController.getRoomMembers);

export default router;
