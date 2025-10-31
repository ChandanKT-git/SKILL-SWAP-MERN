const mongoose = require('mongoose');
const Chat = require('../../src/models/Chat');
const User = require('../../src/models/User');
const Session = require('../../src/models/Session');
const { connectTestDB, clearTestDB, closeTestDB } = require('../helpers/testDb');

describe('Chat Model Tests', () => {
    jest.setTimeout(30000);

    let testUsers = [];
    let testSession;

    beforeAll(async () => {
        await connectTestDB();
    });

    afterAll(async () => {
        await closeTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();
        testUsers = [];

        // Create test users
        const usersData = [
            {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.chatmodel@test.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active'
            },
            {
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.chatmodel@test.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active'
            },
            {
                firstName: 'Bob',
                lastName: 'Wilson',
                email: 'bob.chatmodel@test.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active'
            }
        ];

        for (const userData of usersData) {
            const user = new User(userData);
            await user.save();
            testUsers.push(user);
        }

        // Create test session
        testSession = new Session({
            requester: testUsers[0]._id,
            provider: testUsers[1]._id,
            skill: {
                name: 'JavaScript',
                category: 'Programming',
                level: 'intermediate'
            },
            scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            duration: 60,
            sessionType: 'online',
            status: 'accepted'
        });
        await testSession.save();
    });

    describe('Chat Schema Validation', () => {
        it('should create a valid direct chat', async () => {
            const chat = new Chat({
                participants: [testUsers[0]._id, testUsers[1]._id],
                chatType: 'direct'
            });

            const savedChat = await chat.save();
            expect(savedChat._id).toBeDefined();
            expect(savedChat.participants).toHaveLength(2);
            expect(savedChat.chatType).toBe('direct');
            expect(savedChat.isActive).toBe(true);
            expect(savedChat.isArchived).toBe(false);
        });

        it('should create a valid session chat', async () => {
            const chat = new Chat({
                participants: [testUsers[0]._id, testUsers[1]._id],
                chatType: 'session',
                session: testSession._id
            });

            const savedChat = await chat.save();
            expect(savedChat.session.toString()).toBe(testSession._id.toString());
            expect(savedChat.chatType).toBe('session');
        });

        it('should require exactly 2 participants for direct chat', async () => {
            const chat = new Chat({
                participants: [testUsers[0]._id], // Only one participant
                chatType: 'direct'
            });

            await expect(chat.save()).rejects.toThrow('Direct chat must have exactly 2 participants');
        });

        it('should initialize participant status on creation', async () => {
            const chat = new Chat({
                participants: [testUsers[0]._id, testUsers[1]._id],
                chatType: 'direct'
            });

            const savedChat = await chat.save();
            expect(savedChat.participantStatus).toHaveLength(2);
            expect(savedChat.participantStatus[0].user).toBeDefined();
            expect(savedChat.participantStatus[0].unreadCount).toBe(0);
            expect(savedChat.participantStatus[0].isTyping).toBe(false);
        });

        it('should remove duplicate participants', async () => {
            const chat = new Chat({
                participants: [testUsers[0]._id, testUsers[1]._id, testUsers[0]._id], // Duplicate
                chatType: 'direct'
            });

            const savedChat = await chat.save();
            expect(savedChat.participants).toHaveLength(2);
        });
    });

    describe('Message Operations', () => {
        let testChat;

        beforeEach(async () => {
            testChat = new Chat({
                participants: [testUsers[0]._id, testUsers[1]._id],
                chatType: 'direct'
            });
            await testChat.save();
        });

        it('should add message correctly', async () => {
            const messageContent = 'Hello, this is a test message!';
            const message = testChat.addMessage(testUsers[0]._id, messageContent);

            expect(message.content).toBe(messageContent);
            expect(message.sender.toString()).toBe(testUsers[0]._id.toString());
            expect(message.messageType).toBe('text');
            expect(message.isRead).toBe(false);
            expect(testChat.messages).toHaveLength(1);
        });

        it('should update last message and activity when adding message', async () => {
            const messageContent = 'Test message';
            const beforeTime = new Date();

            testChat.addMessage(testUsers[0]._id, messageContent);

            expect(testChat.lastMessage.content).toBe(messageContent);
            expect(testChat.lastMessage.sender.toString()).toBe(testUsers[0]._id.toString());
            expect(testChat.lastActivity).toBeInstanceOf(Date);
            expect(testChat.lastActivity.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        });

        it('should update unread counts for other participants', async () => {
            testChat.addMessage(testUsers[0]._id, 'Message from John');

            const janeParticipant = testChat.participantStatus.find(
                p => p.user.toString() === testUsers[1]._id.toString()
            );
            const johnParticipant = testChat.participantStatus.find(
                p => p.user.toString() === testUsers[0]._id.toString()
            );

            expect(janeParticipant.unreadCount).toBe(1); // Jane should have 1 unread
            expect(johnParticipant.unreadCount).toBe(0); // John sent it, so 0 unread
        });

        it('should prevent non-participants from adding messages', async () => {
            expect(() => {
                testChat.addMessage(testUsers[2]._id, 'I should not be able to send this');
            }).toThrow('User is not a participant in this chat');
        });

        it('should trim message content', async () => {
            const messageContent = '  Message with spaces  ';
            const message = testChat.addMessage(testUsers[0]._id, messageContent);

            expect(message.content).toBe('Message with spaces');
        });

        it('should support different message types', async () => {
            const textMessage = testChat.addMessage(testUsers[0]._id, 'Text message', 'text');
            const imageMessage = testChat.addMessage(testUsers[0]._id, 'image_url.jpg', 'image');
            const systemMessage = testChat.addMessage(testUsers[0]._id, 'User joined', 'system');

            expect(textMessage.messageType).toBe('text');
            expect(imageMessage.messageType).toBe('image');
            expect(systemMessage.messageType).toBe('system');
        });
    });

    describe('Read Status Management', () => {
        let testChat;

        beforeEach(async () => {
            testChat = new Chat({
                participants: [testUsers[0]._id, testUsers[1]._id],
                chatType: 'direct'
            });
            await testChat.save();

            // Add some messages
            testChat.addMessage(testUsers[0]._id, 'Message 1 from John');
            testChat.addMessage(testUsers[1]._id, 'Message 2 from Jane');
            testChat.addMessage(testUsers[0]._id, 'Message 3 from John');
        });

        it('should mark all messages as read for a user', async () => {
            testChat.markAsRead(testUsers[1]._id);

            // Check that John's messages are marked as read for Jane
            const johnMessages = testChat.messages.filter(
                msg => msg.sender.toString() === testUsers[0]._id.toString()
            );
            johnMessages.forEach(msg => {
                expect(msg.isRead).toBe(true);
                expect(msg.readAt).toBeInstanceOf(Date);
            });

            // Jane's own message should not be marked as read
            const janeMessage = testChat.messages.find(
                msg => msg.sender.toString() === testUsers[1]._id.toString()
            );
            expect(janeMessage.isRead).toBe(false);
        });

        it('should mark specific message as read', async () => {
            const messageToRead = testChat.messages[0]; // First message from John
            testChat.markAsRead(testUsers[1]._id, messageToRead._id);

            const updatedMessage = testChat.messages.id(messageToRead._id);
            expect(updatedMessage.isRead).toBe(true);
            expect(updatedMessage.readAt).toBeInstanceOf(Date);

            // Other messages should remain unread
            const otherJohnMessage = testChat.messages[2]; // Third message from John
            expect(otherJohnMessage.isRead).toBe(false);
        });

        it('should reset unread count when marking as read', async () => {
            const janeParticipant = testChat.participantStatus.find(
                p => p.user.toString() === testUsers[1]._id.toString()
            );
            expect(janeParticipant.unreadCount).toBe(2); // 2 messages from John

            testChat.markAsRead(testUsers[1]._id);

            expect(janeParticipant.unreadCount).toBe(0);
            expect(janeParticipant.lastSeen).toBeInstanceOf(Date);
        });

        it('should prevent non-participants from marking messages as read', async () => {
            expect(() => {
                testChat.markAsRead(testUsers[2]._id);
            }).toThrow('User is not a participant in this chat');
        });
    });

    describe('Typing Status Management', () => {
        let testChat;

        beforeEach(async () => {
            testChat = new Chat({
                participants: [testUsers[0]._id, testUsers[1]._id],
                chatType: 'direct'
            });
            await testChat.save();
        });

        it('should set typing status to true', async () => {
            testChat.setTypingStatus(testUsers[0]._id, true);

            const johnParticipant = testChat.participantStatus.find(
                p => p.user.toString() === testUsers[0]._id.toString()
            );
            expect(johnParticipant.isTyping).toBe(true);
            expect(johnParticipant.typingAt).toBeInstanceOf(Date);
        });

        it('should set typing status to false', async () => {
            testChat.setTypingStatus(testUsers[0]._id, true);
            testChat.setTypingStatus(testUsers[0]._id, false);

            const johnParticipant = testChat.participantStatus.find(
                p => p.user.toString() === testUsers[0]._id.toString()
            );
            expect(johnParticipant.isTyping).toBe(false);
            expect(johnParticipant.typingAt).toBeNull();
        });

        it('should prevent non-participants from setting typing status', async () => {
            expect(() => {
                testChat.setTypingStatus(testUsers[2]._id, true);
            }).toThrow('User is not a participant in this chat');
        });
    });

    describe('Message Deletion', () => {
        let testChat;
        let testMessage;

        beforeEach(async () => {
            testChat = new Chat({
                participants: [testUsers[0]._id, testUsers[1]._id],
                chatType: 'direct'
            });
            await testChat.save();

            testMessage = testChat.addMessage(testUsers[0]._id, 'Message to be deleted');
        });

        it('should delete own message', async () => {
            const deletedMessage = testChat.deleteMessage(testMessage._id, testUsers[0]._id);

            expect(deletedMessage.isDeleted).toBe(true);
            expect(deletedMessage.deletedAt).toBeInstanceOf(Date);
        });

        it('should prevent deleting other users messages', async () => {
            expect(() => {
                testChat.deleteMessage(testMessage._id, testUsers[1]._id);
            }).toThrow('User can only delete their own messages');
        });

        it('should throw error for non-existent message', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            expect(() => {
                testChat.deleteMessage(nonExistentId, testUsers[0]._id);
            }).toThrow('Message not found');
        });
    });

    describe('Utility Methods', () => {
        let testChat;

        beforeEach(async () => {
            testChat = new Chat({
                participants: [testUsers[0]._id, testUsers[1]._id],
                chatType: 'direct'
            });
            await testChat.save();
        });

        it('should check if user is participant', async () => {
            expect(testChat.isParticipant(testUsers[0]._id)).toBe(true);
            expect(testChat.isParticipant(testUsers[1]._id)).toBe(true);
            expect(testChat.isParticipant(testUsers[2]._id)).toBe(false);
        });

        it('should get other participant in direct chat', async () => {
            const otherParticipant = testChat.getOtherParticipant(testUsers[0]._id);
            expect(otherParticipant.toString()).toBe(testUsers[1]._id.toString());

            const otherParticipant2 = testChat.getOtherParticipant(testUsers[1]._id);
            expect(otherParticipant2.toString()).toBe(testUsers[0]._id.toString());
        });

        it('should return null for getOtherParticipant in non-direct chat', async () => {
            testChat.chatType = 'group';
            const otherParticipant = testChat.getOtherParticipant(testUsers[0]._id);
            expect(otherParticipant).toBeNull();
        });

        it('should archive chat', async () => {
            testChat.archive();
            expect(testChat.isArchived).toBe(true);
            expect(testChat.isActive).toBe(false);
        });
    });

    describe('Virtual Properties', () => {
        let testChat;

        beforeEach(async () => {
            testChat = new Chat({
                participants: [testUsers[0]._id, testUsers[1]._id],
                chatType: 'direct'
            });
            await testChat.save();
        });

        it('should calculate message count correctly', async () => {
            expect(testChat.messageCount).toBe(0);

            testChat.addMessage(testUsers[0]._id, 'Message 1');
            testChat.addMessage(testUsers[1]._id, 'Message 2');
            expect(testChat.messageCount).toBe(2);

            // Delete one message
            testChat.deleteMessage(testChat.messages[0]._id, testUsers[0]._id);
            expect(testChat.messageCount).toBe(1); // Should exclude deleted messages
        });

        it('should get unread count for specific user', async () => {
            testChat.addMessage(testUsers[0]._id, 'Message from John');
            testChat.addMessage(testUsers[0]._id, 'Another message from John');

            const getUnreadCount = testChat.getUnreadCount;
            expect(getUnreadCount(testUsers[1]._id)).toBe(2);
            expect(getUnreadCount(testUsers[0]._id)).toBe(0);
        });
    });

    describe('Static Methods', () => {
        it('should find or create direct chat', async () => {
            // First call should create new chat
            const chat1 = await Chat.findOrCreateDirectChat(testUsers[0]._id, testUsers[1]._id);
            expect(chat1._id).toBeDefined();
            expect(chat1.participants).toHaveLength(2);

            // Second call should return existing chat
            const chat2 = await Chat.findOrCreateDirectChat(testUsers[0]._id, testUsers[1]._id);
            expect(chat2._id.toString()).toBe(chat1._id.toString());

            // Reverse order should return same chat
            const chat3 = await Chat.findOrCreateDirectChat(testUsers[1]._id, testUsers[0]._id);
            expect(chat3._id.toString()).toBe(chat1._id.toString());
        });

        it('should find or create session-based chat', async () => {
            const chat1 = await Chat.findOrCreateDirectChat(testUsers[0]._id, testUsers[1]._id, testSession._id);
            expect(chat1.session.toString()).toBe(testSession._id.toString());

            // Should create different chat for same users without session
            const chat2 = await Chat.findOrCreateDirectChat(testUsers[0]._id, testUsers[1]._id);
            expect(chat2._id.toString()).not.toBe(chat1._id.toString());
            expect(chat2.session).toBeUndefined();
        });

        it('should find user chats', async () => {
            // Create multiple chats for user
            await Chat.findOrCreateDirectChat(testUsers[0]._id, testUsers[1]._id);
            await Chat.findOrCreateDirectChat(testUsers[0]._id, testUsers[2]._id);

            const userChats = await Chat.findUserChats(testUsers[0]._id);
            expect(userChats).toHaveLength(2);
        });

        it('should find session chat', async () => {
            const sessionChat = await Chat.findOrCreateDirectChat(testUsers[0]._id, testUsers[1]._id, testSession._id);
            sessionChat.chatType = 'session';
            await sessionChat.save();

            const foundChat = await Chat.findSessionChat(testSession._id);
            expect(foundChat._id.toString()).toBe(sessionChat._id.toString());
        });

        it('should paginate user chats', async () => {
            // Create multiple chats
            for (let i = 0; i < 5; i++) {
                const otherUser = new User({
                    firstName: `User${i}`,
                    lastName: 'Test',
                    email: `user${i}@test.com`,
                    password: 'Password123!',
                    isEmailVerified: true,
                    status: 'active'
                });
                await otherUser.save();
                await Chat.findOrCreateDirectChat(testUsers[0]._id, otherUser._id);
            }

            const page1 = await Chat.findUserChats(testUsers[0]._id, { page: 1, limit: 2 });
            expect(page1).toHaveLength(2);

            const page2 = await Chat.findUserChats(testUsers[0]._id, { page: 2, limit: 2 });
            expect(page2).toHaveLength(2);
        });
    });

    describe('Pre-save Middleware', () => {
        it('should update lastActivity when messages are modified', async () => {
            const chat = new Chat({
                participants: [testUsers[0]._id, testUsers[1]._id],
                chatType: 'direct'
            });
            await chat.save();

            const originalActivity = chat.lastActivity;

            // Wait a bit to ensure time difference
            await new Promise(resolve => setTimeout(resolve, 10));

            chat.addMessage(testUsers[0]._id, 'New message');
            await chat.save();

            expect(chat.lastActivity.getTime()).toBeGreaterThan(originalActivity.getTime());
        });
    });

    describe('JSON Transformation', () => {
        let testChat;

        beforeEach(async () => {
            testChat = new Chat({
                participants: [testUsers[0]._id, testUsers[1]._id],
                chatType: 'direct'
            });
            await testChat.save();
        });

        it('should exclude deleted messages from JSON output', async () => {
            testChat.addMessage(testUsers[0]._id, 'Normal message');
            const deletedMessage = testChat.addMessage(testUsers[0]._id, 'Message to delete');
            testChat.deleteMessage(deletedMessage._id, testUsers[0]._id);

            const chatJSON = testChat.toJSON();
            expect(chatJSON.messages).toHaveLength(1);
            expect(chatJSON.messages[0].content).toBe('Normal message');
        });
    });
});