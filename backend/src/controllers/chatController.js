const Chat = require('../models/Chat');
const User = require('../models/User');
const Session = require('../models/Session');
const socketService = require('../services/socketService');
const { validationResult } = require('express-validator');

class ChatController {
    // Get user's chats
    async getUserChats(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 20, includeArchived = false } = req.query;

            const chats = await Chat.findUserChats(userId, {
                page: parseInt(page),
                limit: parseInt(limit),
                includeArchived: includeArchived === 'true',
            });

            // Add online status for participants
            const chatsWithStatus = chats.map(chat => {
                const chatObj = chat.toObject();
                chatObj.participants = chatObj.participants.map(participant => ({
                    ...participant,
                    isOnline: socketService.isUserOnline(participant._id),
                }));
                return chatObj;
            });

            res.json({
                success: true,
                data: {
                    chats: chatsWithStatus,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: chats.length,
                    },
                },
            });
        } catch (error) {
            console.error('Error fetching user chats:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to fetch chats',
                    code: 'FETCH_CHATS_ERROR',
                },
            });
        }
    }

    // Get or create direct chat between two users
    async getOrCreateDirectChat(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Validation failed',
                        code: 'VALIDATION_ERROR',
                        details: errors.array(),
                    },
                });
            }

            const userId = req.user.id;
            const { otherUserId, sessionId } = req.body;

            // Validate that other user exists
            const otherUser = await User.findById(otherUserId).select('firstName lastName profileImage status');
            if (!otherUser || otherUser.status !== 'active') {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'User not found or inactive',
                        code: 'USER_NOT_FOUND',
                    },
                });
            }

            // If sessionId is provided, validate the session
            if (sessionId) {
                const session = await Session.findById(sessionId);
                if (!session || !session.isParticipant(userId) || !session.isParticipant(otherUserId)) {
                    return res.status(403).json({
                        success: false,
                        error: {
                            message: 'Invalid session or access denied',
                            code: 'SESSION_ACCESS_DENIED',
                        },
                    });
                }
            }

            // Find or create chat
            const chat = await Chat.findOrCreateDirectChat(userId, otherUserId, sessionId);

            // Add online status for participants
            const chatObj = chat.toObject();
            chatObj.participants = chatObj.participants.map(participant => ({
                ...participant,
                isOnline: socketService.isUserOnline(participant._id),
            }));

            res.json({
                success: true,
                data: { chat: chatObj },
            });
        } catch (error) {
            console.error('Error creating/fetching direct chat:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to create or fetch chat',
                    code: 'CHAT_CREATION_ERROR',
                },
            });
        }
    }

    // Get chat by ID with messages
    async getChatById(req, res) {
        try {
            const { chatId } = req.params;
            const userId = req.user.id;
            const { page = 1, limit = 50 } = req.query;

            const chat = await Chat.findById(chatId)
                .populate('participants', 'firstName lastName profileImage')
                .populate('session', 'skill scheduledDate status')
                .populate('messages.sender', 'firstName lastName profileImage');

            if (!chat || !chat.isParticipant(userId)) {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'Chat not found or access denied',
                        code: 'CHAT_NOT_FOUND',
                    },
                });
            }

            // Paginate messages (get latest messages)
            const startIndex = Math.max(0, chat.messages.length - (page * limit));
            const endIndex = chat.messages.length - ((page - 1) * limit);
            const paginatedMessages = chat.messages.slice(startIndex, endIndex);

            // Mark messages as read
            chat.markAsRead(userId);
            await chat.save();

            // Add online status for participants
            const chatObj = chat.toObject();
            chatObj.participants = chatObj.participants.map(participant => ({
                ...participant,
                isOnline: socketService.isUserOnline(participant._id),
            }));
            chatObj.messages = paginatedMessages;

            res.json({
                success: true,
                data: {
                    chat: chatObj,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: chat.messages.length,
                        hasMore: startIndex > 0,
                    },
                },
            });
        } catch (error) {
            console.error('Error fetching chat:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to fetch chat',
                    code: 'FETCH_CHAT_ERROR',
                },
            });
        }
    }

    // Send message via HTTP (alternative to Socket.io)
    async sendMessage(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Validation failed',
                        code: 'VALIDATION_ERROR',
                        details: errors.array(),
                    },
                });
            }

            const { chatId } = req.params;
            const userId = req.user.id;
            const { content, messageType = 'text' } = req.body;

            // Find and validate chat
            const chat = await Chat.findById(chatId);
            if (!chat || !chat.isParticipant(userId)) {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'Chat not found or access denied',
                        code: 'CHAT_NOT_FOUND',
                    },
                });
            }

            // Add message
            const message = chat.addMessage(userId, content, messageType);
            await chat.save();

            // Populate sender information
            await chat.populate('messages.sender', 'firstName lastName profileImage');
            const populatedMessage = chat.messages.id(message._id);

            // Emit via Socket.io if available
            socketService.sendToChat(chatId, 'new_message', {
                chatId,
                message: populatedMessage,
                chat: {
                    _id: chat._id,
                    lastMessage: chat.lastMessage,
                    lastActivity: chat.lastActivity,
                },
            });

            res.status(201).json({
                success: true,
                data: { message: populatedMessage },
            });
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to send message',
                    code: 'SEND_MESSAGE_ERROR',
                },
            });
        }
    }

    // Delete message
    async deleteMessage(req, res) {
        try {
            const { chatId, messageId } = req.params;
            const userId = req.user.id;

            const chat = await Chat.findById(chatId);
            if (!chat || !chat.isParticipant(userId)) {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'Chat not found or access denied',
                        code: 'CHAT_NOT_FOUND',
                    },
                });
            }

            try {
                const deletedMessage = chat.deleteMessage(messageId, userId);
                await chat.save();

                // Emit via Socket.io
                socketService.sendToChat(chatId, 'message_deleted', {
                    chatId,
                    messageId,
                    deletedBy: userId,
                });

                res.json({
                    success: true,
                    data: { message: 'Message deleted successfully' },
                });
            } catch (deleteError) {
                return res.status(403).json({
                    success: false,
                    error: {
                        message: deleteError.message,
                        code: 'DELETE_MESSAGE_ERROR',
                    },
                });
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to delete message',
                    code: 'DELETE_MESSAGE_ERROR',
                },
            });
        }
    }

    // Archive chat
    async archiveChat(req, res) {
        try {
            const { chatId } = req.params;
            const userId = req.user.id;

            const chat = await Chat.findById(chatId);
            if (!chat || !chat.isParticipant(userId)) {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'Chat not found or access denied',
                        code: 'CHAT_NOT_FOUND',
                    },
                });
            }

            chat.archive();
            await chat.save();

            res.json({
                success: true,
                data: { message: 'Chat archived successfully' },
            });
        } catch (error) {
            console.error('Error archiving chat:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to archive chat',
                    code: 'ARCHIVE_CHAT_ERROR',
                },
            });
        }
    }

    // Get session chat
    async getSessionChat(req, res) {
        try {
            const { sessionId } = req.params;
            const userId = req.user.id;

            // Validate session access
            const session = await Session.findById(sessionId);
            if (!session || !session.isParticipant(userId)) {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'Session not found or access denied',
                        code: 'SESSION_NOT_FOUND',
                    },
                });
            }

            // Find or create session chat
            let chat = await Chat.findSessionChat(sessionId);

            if (!chat) {
                // Create session chat
                const otherParticipant = session.getOtherParticipant(userId);
                chat = await Chat.findOrCreateDirectChat(userId, otherParticipant, sessionId);
                chat.chatType = 'session';
                await chat.save();
            }

            // Add online status for participants
            const chatObj = chat.toObject();
            chatObj.participants = chatObj.participants.map(participant => ({
                ...participant,
                isOnline: socketService.isUserOnline(participant._id),
            }));

            res.json({
                success: true,
                data: { chat: chatObj },
            });
        } catch (error) {
            console.error('Error fetching session chat:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to fetch session chat',
                    code: 'FETCH_SESSION_CHAT_ERROR',
                },
            });
        }
    }

    // Get online users
    async getOnlineUsers(req, res) {
        try {
            const onlineUserIds = socketService.getOnlineUsers();

            // Get user details for online users
            const onlineUsers = await User.find({
                _id: { $in: onlineUserIds },
                status: 'active',
            }).select('firstName lastName profileImage');

            res.json({
                success: true,
                data: {
                    onlineUsers,
                    count: onlineUsers.length,
                },
            });
        } catch (error) {
            console.error('Error fetching online users:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to fetch online users',
                    code: 'FETCH_ONLINE_USERS_ERROR',
                },
            });
        }
    }
}

module.exports = new ChatController();