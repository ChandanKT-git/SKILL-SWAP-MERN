const express = require('express');
const { body, param, query } = require('express-validator');
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation middleware
const validateChatId = [
    param('chatId')
        .isMongoId()
        .withMessage('Invalid chat ID format'),
];

const validateMessageId = [
    param('messageId')
        .isMongoId()
        .withMessage('Invalid message ID format'),
];

const validateSessionId = [
    param('sessionId')
        .isMongoId()
        .withMessage('Invalid session ID format'),
];

const validateCreateDirectChat = [
    body('otherUserId')
        .isMongoId()
        .withMessage('Invalid user ID format'),
    body('sessionId')
        .optional()
        .isMongoId()
        .withMessage('Invalid session ID format'),
];

const validateSendMessage = [
    body('content')
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Message content must be between 1 and 1000 characters'),
    body('messageType')
        .optional()
        .isIn(['text', 'image', 'file', 'system'])
        .withMessage('Invalid message type'),
];

const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
];

// Routes

/**
 * @route   GET /api/chats
 * @desc    Get user's chats
 * @access  Private
 */
router.get(
    '/',
    [
        validatePagination,
        query('includeArchived')
            .optional()
            .isBoolean()
            .withMessage('includeArchived must be a boolean'),
    ],
    chatController.getUserChats
);

/**
 * @route   POST /api/chats/direct
 * @desc    Get or create direct chat between two users
 * @access  Private
 */
router.post(
    '/direct',
    validateCreateDirectChat,
    chatController.getOrCreateDirectChat
);

/**
 * @route   GET /api/chats/:chatId
 * @desc    Get chat by ID with messages
 * @access  Private
 */
router.get(
    '/:chatId',
    [
        ...validateChatId,
        validatePagination,
    ],
    chatController.getChatById
);

/**
 * @route   POST /api/chats/:chatId/messages
 * @desc    Send message to chat
 * @access  Private
 */
router.post(
    '/:chatId/messages',
    [
        ...validateChatId,
        ...validateSendMessage,
    ],
    chatController.sendMessage
);

/**
 * @route   DELETE /api/chats/:chatId/messages/:messageId
 * @desc    Delete message from chat
 * @access  Private
 */
router.delete(
    '/:chatId/messages/:messageId',
    [
        ...validateChatId,
        ...validateMessageId,
    ],
    chatController.deleteMessage
);

/**
 * @route   PUT /api/chats/:chatId/archive
 * @desc    Archive chat
 * @access  Private
 */
router.put(
    '/:chatId/archive',
    validateChatId,
    chatController.archiveChat
);

/**
 * @route   GET /api/chats/session/:sessionId
 * @desc    Get or create session-based chat
 * @access  Private
 */
router.get(
    '/session/:sessionId',
    validateSessionId,
    chatController.getSessionChat
);

/**
 * @route   GET /api/chats/users/online
 * @desc    Get list of online users
 * @access  Private
 */
router.get(
    '/users/online',
    chatController.getOnlineUsers
);

module.exports = router;