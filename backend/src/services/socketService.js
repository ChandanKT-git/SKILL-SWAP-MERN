const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chat = require('../models/Chat');
const config = require('../config');

class SocketService {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map(); // userId -> socketId mapping
        this.userSockets = new Map(); // socketId -> userId mapping
    }

    initialize(server) {
        this.io = new Server(server, {
            cors: {
                origin: [
                    config.frontendUrl,
                    'http://127.0.0.1:5500',
                    'http://localhost:5500',
                    'http://127.0.0.1:5501',
                    'http://localhost:5501'
                ],
                credentials: true,
                methods: ['GET', 'POST'],
            },
            transports: ['websocket', 'polling'],
        });

        this.setupMiddleware();
        this.setupEventHandlers();

        console.log('🔌 Socket.io server initialized');
        return this.io;
    }

    setupMiddleware() {
        // Authentication middleware
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

                if (!token) {
                    return next(new Error('Authentication token required'));
                }

                const decoded = jwt.verify(token, config.jwtSecret);
                const user = await User.findById(decoded.id).select('firstName lastName email status');

                if (!user || user.status !== 'active') {
                    return next(new Error('Invalid user or account suspended'));
                }

                socket.userId = user._id.toString();
                socket.user = user;
                next();
            } catch (error) {
                console.error('Socket authentication error:', error.message);
                next(new Error('Authentication failed'));
            }
        });
    }

    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }

    handleConnection(socket) {
        const userId = socket.userId;
        console.log(`👤 User ${userId} connected with socket ${socket.id}`);

        // Store user connection
        this.connectedUsers.set(userId, socket.id);
        this.userSockets.set(socket.id, userId);

        // Join user to their personal room
        socket.join(`user:${userId}`);

        // Emit user online status
        this.broadcastUserStatus(userId, 'online');

        // Handle joining chat rooms
        socket.on('join_chat', async (data) => {
            await this.handleJoinChat(socket, data);
        });

        // Handle leaving chat rooms
        socket.on('leave_chat', async (data) => {
            await this.handleLeaveChat(socket, data);
        });

        // Handle sending messages
        socket.on('send_message', async (data) => {
            await this.handleSendMessage(socket, data);
        });

        // Handle typing indicators
        socket.on('typing_start', async (data) => {
            await this.handleTypingStart(socket, data);
        });

        socket.on('typing_stop', async (data) => {
            await this.handleTypingStop(socket, data);
        });

        // Handle message read status
        socket.on('mark_as_read', async (data) => {
            await this.handleMarkAsRead(socket, data);
        });

        // Handle getting online users
        socket.on('get_online_users', (callback) => {
            this.handleGetOnlineUsers(socket, callback);
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            this.handleDisconnection(socket);
        });

        // Handle connection errors
        socket.on('error', (error) => {
            console.error(`Socket error for user ${userId}:`, error);
        });
    }

    async handleJoinChat(socket, data) {
        try {
            const { chatId } = data;
            const userId = socket.userId;

            // Verify user is participant in the chat
            const chat = await Chat.findById(chatId);
            if (!chat || !chat.isParticipant(userId)) {
                socket.emit('error', { message: 'Chat not found or access denied' });
                return;
            }

            // Join the chat room
            socket.join(`chat:${chatId}`);

            // Update user's last seen in chat
            chat.participantStatus.forEach(participant => {
                if (participant.user.toString() === userId) {
                    participant.lastSeen = new Date();
                }
            });
            await chat.save();

            socket.emit('chat_joined', { chatId, message: 'Successfully joined chat' });

            // Notify other participants that user joined
            socket.to(`chat:${chatId}`).emit('user_joined_chat', {
                chatId,
                userId,
                user: socket.user,
            });

            console.log(`👤 User ${userId} joined chat ${chatId}`);
        } catch (error) {
            console.error('Error joining chat:', error);
            socket.emit('error', { message: 'Failed to join chat' });
        }
    }

    async handleLeaveChat(socket, data) {
        try {
            const { chatId } = data;
            const userId = socket.userId;

            socket.leave(`chat:${chatId}`);

            // Notify other participants that user left
            socket.to(`chat:${chatId}`).emit('user_left_chat', {
                chatId,
                userId,
                user: socket.user,
            });

            socket.emit('chat_left', { chatId, message: 'Successfully left chat' });
            console.log(`👤 User ${userId} left chat ${chatId}`);
        } catch (error) {
            console.error('Error leaving chat:', error);
            socket.emit('error', { message: 'Failed to leave chat' });
        }
    }

    async handleSendMessage(socket, data) {
        try {
            const { chatId, content, messageType = 'text' } = data;
            const userId = socket.userId;

            // Find and validate chat
            const chat = await Chat.findById(chatId);
            if (!chat || !chat.isParticipant(userId)) {
                socket.emit('error', { message: 'Chat not found or access denied' });
                return;
            }

            // Add message to chat
            const message = chat.addMessage(userId, content, messageType);
            await chat.save();

            // Populate sender information for the response
            await chat.populate('messages.sender', 'firstName lastName profileImage');
            const populatedMessage = chat.messages.id(message._id);

            // Emit message to all participants in the chat room
            this.io.to(`chat:${chatId}`).emit('new_message', {
                chatId,
                message: populatedMessage,
                chat: {
                    _id: chat._id,
                    lastMessage: chat.lastMessage,
                    lastActivity: chat.lastActivity,
                },
            });

            // Send push notification to offline users (if implemented)
            await this.notifyOfflineUsers(chat, message, userId);

            console.log(`💬 Message sent in chat ${chatId} by user ${userId}`);
        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    }

    async handleTypingStart(socket, data) {
        try {
            const { chatId } = data;
            const userId = socket.userId;

            // Verify user is participant
            const chat = await Chat.findById(chatId);
            if (!chat || !chat.isParticipant(userId)) {
                return;
            }

            // Update typing status
            chat.setTypingStatus(userId, true);
            await chat.save();

            // Notify other participants
            socket.to(`chat:${chatId}`).emit('user_typing', {
                chatId,
                userId,
                user: socket.user,
                isTyping: true,
            });
        } catch (error) {
            console.error('Error handling typing start:', error);
        }
    }

    async handleTypingStop(socket, data) {
        try {
            const { chatId } = data;
            const userId = socket.userId;

            // Verify user is participant
            const chat = await Chat.findById(chatId);
            if (!chat || !chat.isParticipant(userId)) {
                return;
            }

            // Update typing status
            chat.setTypingStatus(userId, false);
            await chat.save();

            // Notify other participants
            socket.to(`chat:${chatId}`).emit('user_typing', {
                chatId,
                userId,
                user: socket.user,
                isTyping: false,
            });
        } catch (error) {
            console.error('Error handling typing stop:', error);
        }
    }

    async handleMarkAsRead(socket, data) {
        try {
            const { chatId, messageId } = data;
            const userId = socket.userId;

            // Find and validate chat
            const chat = await Chat.findById(chatId);
            if (!chat || !chat.isParticipant(userId)) {
                socket.emit('error', { message: 'Chat not found or access denied' });
                return;
            }

            // Mark messages as read
            chat.markAsRead(userId, messageId);
            await chat.save();

            // Notify other participants about read status
            socket.to(`chat:${chatId}`).emit('messages_read', {
                chatId,
                userId,
                messageId,
                readAt: new Date(),
            });

            socket.emit('messages_marked_read', { chatId, messageId });
        } catch (error) {
            console.error('Error marking messages as read:', error);
            socket.emit('error', { message: 'Failed to mark messages as read' });
        }
    }

    handleGetOnlineUsers(socket, callback) {
        try {
            const onlineUserIds = Array.from(this.connectedUsers.keys());
            if (typeof callback === 'function') {
                callback({ onlineUsers: onlineUserIds });
            }
        } catch (error) {
            console.error('Error getting online users:', error);
            if (typeof callback === 'function') {
                callback({ error: 'Failed to get online users' });
            }
        }
    }

    handleDisconnection(socket) {
        const userId = socket.userId;
        console.log(`👤 User ${userId} disconnected from socket ${socket.id}`);

        // Remove user from connected users
        this.connectedUsers.delete(userId);
        this.userSockets.delete(socket.id);

        // Broadcast user offline status
        this.broadcastUserStatus(userId, 'offline');
    }

    // Utility methods
    broadcastUserStatus(userId, status) {
        this.io.emit('user_status_change', {
            userId,
            status,
            timestamp: new Date(),
        });
    }

    async notifyOfflineUsers(chat, message, senderId) {
        try {
            // Find offline participants
            const offlineParticipants = chat.participants.filter(participantId => {
                const participantIdStr = participantId.toString();
                return participantIdStr !== senderId && !this.connectedUsers.has(participantIdStr);
            });

            // Here you would implement push notifications or email notifications
            // For now, we'll just log the offline users
            if (offlineParticipants.length > 0) {
                console.log(`📱 Would send push notification to ${offlineParticipants.length} offline users`);
            }
        } catch (error) {
            console.error('Error notifying offline users:', error);
        }
    }

    // Public methods for external use
    isUserOnline(userId) {
        return this.connectedUsers.has(userId.toString());
    }

    getOnlineUsers() {
        return Array.from(this.connectedUsers.keys());
    }

    sendToUser(userId, event, data) {
        const socketId = this.connectedUsers.get(userId.toString());
        if (socketId) {
            this.io.to(socketId).emit(event, data);
            return true;
        }
        return false;
    }

    sendToChat(chatId, event, data) {
        this.io.to(`chat:${chatId}`).emit(event, data);
    }

    getConnectedUserCount() {
        return this.connectedUsers.size;
    }
}

// Export singleton instance
const socketService = new SocketService();
module.exports = socketService;