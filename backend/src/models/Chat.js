const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Message sender is required'],
    },
    content: {
        type: String,
        required: [true, 'Message content is required'],
        trim: true,
        maxlength: [1000, 'Message content cannot exceed 1000 characters'],
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'file', 'system'],
        default: 'text',
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    readAt: {
        type: Date,
    },
    editedAt: {
        type: Date,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});

const chatSchema = new Schema({
    // Chat participants
    participants: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }],

    // Chat type and context
    chatType: {
        type: String,
        enum: ['direct', 'session', 'group'],
        default: 'direct',
    },

    // Related session (if chat is session-based)
    session: {
        type: Schema.Types.ObjectId,
        ref: 'Session',
    },

    // Messages array
    messages: [messageSchema],

    // Chat metadata
    lastMessage: {
        content: String,
        sender: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        timestamp: Date,
    },
    lastActivity: {
        type: Date,
        default: Date.now,
    },

    // Chat status
    isActive: {
        type: Boolean,
        default: true,
    },
    isArchived: {
        type: Boolean,
        default: false,
    },

    // Participant status tracking
    participantStatus: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        lastSeen: {
            type: Date,
            default: Date.now,
        },
        unreadCount: {
            type: Number,
            default: 0,
        },
        isTyping: {
            type: Boolean,
            default: false,
        },
        typingAt: {
            type: Date,
        },
    }],

    // Chat settings
    settings: {
        allowFileSharing: {
            type: Boolean,
            default: true,
        },
        allowImageSharing: {
            type: Boolean,
            default: true,
        },
        maxParticipants: {
            type: Number,
            default: 2,
        },
    },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            // Remove deleted messages from JSON output
            if (ret.messages) {
                ret.messages = ret.messages.filter(msg => !msg.isDeleted);
            }
            return ret;
        },
    },
    toObject: { virtuals: true },
});

// Indexes for performance
chatSchema.index({ participants: 1, lastActivity: -1 });
chatSchema.index({ session: 1 });
chatSchema.index({ chatType: 1, isActive: 1 });
chatSchema.index({ 'messages.sender': 1, 'messages.createdAt': -1 });
chatSchema.index({ lastActivity: -1 });

// Virtual for total message count
chatSchema.virtual('messageCount').get(function () {
    return this.messages ? this.messages.filter(msg => !msg.isDeleted).length : 0;
});

// Virtual for unread message count for a specific user
chatSchema.virtual('getUnreadCount').get(function () {
    return function (userId) {
        const participant = this.participantStatus.find(
            p => p.user.toString() === userId.toString()
        );
        return participant ? participant.unreadCount : 0;
    }.bind(this);
});

// Instance method to check if user is participant
chatSchema.methods.isParticipant = function (userId) {
    return this.participants.some(
        participant => participant.toString() === userId.toString()
    );
};

// Instance method to add a message
chatSchema.methods.addMessage = function (senderId, content, messageType = 'text') {
    if (!this.isParticipant(senderId)) {
        throw new Error('User is not a participant in this chat');
    }

    const message = {
        sender: senderId,
        content: content.trim(),
        messageType,
    };

    this.messages.push(message);

    // Update last message and activity
    this.lastMessage = {
        content: content.trim(),
        sender: senderId,
        timestamp: new Date(),
    };
    this.lastActivity = new Date();

    // Update unread counts for other participants
    this.participantStatus.forEach(participant => {
        if (participant.user.toString() !== senderId.toString()) {
            participant.unreadCount += 1;
        }
    });

    return this.messages[this.messages.length - 1];
};

// Instance method to mark messages as read
chatSchema.methods.markAsRead = function (userId, messageId = null) {
    if (!this.isParticipant(userId)) {
        throw new Error('User is not a participant in this chat');
    }

    const now = new Date();

    if (messageId) {
        // Mark specific message as read
        const message = this.messages.id(messageId);
        if (message && message.sender.toString() !== userId.toString()) {
            message.isRead = true;
            message.readAt = now;
        }
    } else {
        // Mark all unread messages as read
        this.messages.forEach(message => {
            if (message.sender.toString() !== userId.toString() && !message.isRead) {
                message.isRead = true;
                message.readAt = now;
            }
        });
    }

    // Reset unread count for this user
    const participant = this.participantStatus.find(
        p => p.user.toString() === userId.toString()
    );
    if (participant) {
        participant.unreadCount = 0;
        participant.lastSeen = now;
    }
};

// Instance method to set typing status
chatSchema.methods.setTypingStatus = function (userId, isTyping) {
    if (!this.isParticipant(userId)) {
        throw new Error('User is not a participant in this chat');
    }

    const participant = this.participantStatus.find(
        p => p.user.toString() === userId.toString()
    );

    if (participant) {
        participant.isTyping = isTyping;
        participant.typingAt = isTyping ? new Date() : null;
    }
};

// Instance method to get other participant (for direct chats)
chatSchema.methods.getOtherParticipant = function (userId) {
    if (this.chatType !== 'direct' || this.participants.length !== 2) {
        return null;
    }

    return this.participants.find(
        participant => participant.toString() !== userId.toString()
    );
};

// Instance method to archive chat
chatSchema.methods.archive = function () {
    this.isArchived = true;
    this.isActive = false;
};

// Instance method to delete message
chatSchema.methods.deleteMessage = function (messageId, userId) {
    const message = this.messages.id(messageId);

    if (!message) {
        throw new Error('Message not found');
    }

    if (message.sender.toString() !== userId.toString()) {
        throw new Error('User can only delete their own messages');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();

    return message;
};

// Static method to find or create direct chat between two users
chatSchema.statics.findOrCreateDirectChat = async function (user1Id, user2Id, sessionId = null) {
    // Build query for existing chat
    const query = {
        chatType: 'direct',
        participants: { $all: [user1Id, user2Id], $size: 2 },
    };

    // Handle session-based vs regular direct chats
    if (sessionId) {
        query.session = sessionId;
    } else {
        query.session = { $exists: false };
    }

    // Check if direct chat already exists
    let chat = await this.findOne(query).populate('participants', 'firstName lastName profileImage');

    if (!chat) {
        // Create new direct chat
        const chatData = {
            chatType: 'direct',
            participants: [user1Id, user2Id],
            participantStatus: [
                { user: user1Id, lastSeen: new Date(), unreadCount: 0 },
                { user: user2Id, lastSeen: new Date(), unreadCount: 0 },
            ],
        };

        // Only add session if provided
        if (sessionId) {
            chatData.session = sessionId;
        }

        chat = new this(chatData);
        await chat.save();
        await chat.populate('participants', 'firstName lastName profileImage');
    }

    return chat;
};

// Static method to find user's chats
chatSchema.statics.findUserChats = function (userId, options = {}) {
    const { page = 1, limit = 20, includeArchived = false } = options;
    const skip = (page - 1) * limit;

    const query = {
        participants: userId,
        isActive: true,
    };

    if (!includeArchived) {
        query.isArchived = false;
    }

    return this.find(query)
        .populate('participants', 'firstName lastName profileImage')
        .populate('session', 'skill scheduledDate status')
        .sort({ lastActivity: -1 })
        .skip(skip)
        .limit(limit);
};

// Static method to find session-based chat
chatSchema.statics.findSessionChat = function (sessionId) {
    return this.findOne({
        session: sessionId,
        chatType: 'session',
    }).populate('participants', 'firstName lastName profileImage');
};

// Pre-save middleware
chatSchema.pre('save', function (next) {
    // Ensure participants array has no duplicates
    this.participants = [...new Set(this.participants.map(p => p.toString()))];

    // Validate participant count based on chat type
    if (this.chatType === 'direct' && this.participants.length !== 2) {
        return next(new Error('Direct chat must have exactly 2 participants'));
    }

    // Initialize participant status if not exists
    if (this.isNew) {
        this.participantStatus = this.participants.map(userId => ({
            user: userId,
            lastSeen: new Date(),
            unreadCount: 0,
            isTyping: false,
        }));
    }

    next();
});

// Pre-save middleware to update lastActivity when messages are added
chatSchema.pre('save', function (next) {
    if (this.isModified('messages')) {
        this.lastActivity = new Date();
    }
    next();
});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;