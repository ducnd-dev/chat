import { Router } from 'express';
import messageController from '../controllers/messageController';
import { authenticateToken } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import {
  sendMessageValidation,
  updateMessageValidation,
  messageIdValidation,
  getMessagesValidation,
} from '../validators';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Message management endpoints
 */

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - room
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 2000
 *               room:
 *                 type: string
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file]
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateToken, sendMessageValidation, handleValidationErrors, messageController.sendMessage);

/**
 * @swagger
 * /api/messages/room/{room}:
 *   get:
 *     summary: Get messages for a room
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: room
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of messages per page
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/room/:room', authenticateToken, getMessagesValidation, handleValidationErrors, messageController.getMessages);

/**
 * @swagger
 * /api/messages/{messageId}:
 *   get:
 *     summary: Get message by ID
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message not found
 */
router.get('/:messageId', authenticateToken, messageIdValidation, handleValidationErrors, messageController.getMessageById);

/**
 * @swagger
 * /api/messages/{messageId}:
 *   put:
 *     summary: Update message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 2000
 *     responses:
 *       200:
 *         description: Message updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Can only edit own messages
 */
router.put('/:messageId', authenticateToken, messageIdValidation, updateMessageValidation, handleValidationErrors, messageController.updateMessage);

/**
 * @swagger
 * /api/messages/{messageId}:
 *   delete:
 *     summary: Delete message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Can only delete own messages
 */
router.delete('/:messageId', authenticateToken, messageIdValidation, handleValidationErrors, messageController.deleteMessage);

export default router;
