const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../../src/server');
const User = require('../../src/models/User');
const Session = require('../../src/models/Session');
const Chat = require('../../src/models/Chat');
const { connectTestDB, clearTestDB, closeTestDB } = require('../helpers/testDb');
const JWTUtils = require('../../src/utils/jwt');

describe('Chat Integration Tests', () => {
    jest.setTimeout(30000);

    let testUsers = [];
    let authTokens = {};
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
        authTokens = {};

        // Create test users
        const usersData = [
            {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.chat@test.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active',
                role: 'user',
                skills: [
                    { name: 'JavaScript', level: 'advanced', category: 'Programming' }
                ]
            },
            {
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.chat@test.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active',
                role: 'user',
                skills: [
                    { name: 'Python', level: 'expert', category: 'Programming' }
                ]
            },
            {
                firstName: 'Bob',
                lastName: 'Wilson',
                email: 'bob.chat@test.com',
                password: 'Password123!',
                isEmailVerified: true,
                status: 'active',
                role: 'user'
            }
        ];

        for (const userData of usersData) {
            const user = new User(userData);
            await user.save();
            testUsers.push(user);

            // Generate auth token for each user
            const tokenName = userData.firstName.toLowerCase();
            authTokens[tokenName] = JWTUtils.generateAccessToken({
                id: user._id,
                email: user.email
            });
        }

        // Create a test session
        testSession = new Session({
            requester: testUsers[0]._id, // John
            provider: testUsers[1]._id,   // Jane
            skill: {
                name: 'Python',
                category: 'Programming',
                level: 'beginner'
            },
            scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            duration: 60,
            sessionType: 'online',
            status: 'accepted'
        });
        await testSession.save();
    });

    describe('POST /api/chats/direct', () => {
        it('should create a direct chat between two users', async () => {
            const chatData = {
                otherUserId: testUsers[1]._id.toString()
            };

            const response = await request(app)
                .post('/api/chats/direct')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send(chatData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.chat.chatType).toBe('direct');
            expect(response.body.data.chat.participants).toHaveLength(2);
            expect(response.body.data.chat.participants.some(p => p._id === testUsers[0]._id.toString())).toBe(true);
            expect(response.body.data.chat.participants.some(p => p._id === testUsers[1]._id.toString())).toBe(true);
        });

        it('should return existing chat if it already exists', async () => {
            // Create initial chat
            const chatData = {
                otherUserId: testUsers[1]._id.toString()
            };

            const firstResponse = await request(app)
                .post('/api/chats/direct')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send(chatData)
                .expect(200);

            // Try to create the same chat again
            const secondResponse = await request(app)
                .post('/api/chats/direct')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send(chatData)
                .expect(200);

            expect(firstResponse.body.data.chat._id).toBe(secondResponse.body.data.chat._id);
        });

        it('should create session-based chat', async () => {
            const chatData = {
                otherUserId: testUsers[1]._id.toString(),
                sessionId: testSession._id.toString()
            };

            const response = await request(app)
                .post('/api/chats/direct')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send(chatData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.chat.session).toBe(testSession._id.toString());
        });

        it('should validate user exists and is active', async () => {
            const nonExistentUserId = new mongoose.Types.ObjectId();
            const chatData = {
                otherUserId: nonExistentUserId.toString()
            };

            const response = await request(app)
                .post('/api/chats/direct')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send(chatData)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('User not found');
        });

        it('should validate session access when sessionId provided', async () => {
            // Create session where John is not a participant
            const otherSession = new Session({
                requester: testUsers[1]._id, // Jane
                provider: testUsers[2]._id,   // Bob
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
            await otherSession.save();

            const chatData = {
                otherUserId: testUsers[1]._id.toString(),
                sessionId: otherSession._id.toString()
            };

            const response = await request(app)
                .post('/api/chats/direct')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send(chatData)
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('access denied');
        });

        it('should require authentication', async () => {
            const chatData = {
                otherUserId: testUsers[1]._id.toString()
            };

            const response = await request(app)
                .post('/api/chats/direct')
                .send(chatData)
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/chats', () => {
        let testChat;

        beforeEach(async () => {
            // Create a test chat with messages
            testChat = await Chat.findOrCreateDirectChat(testUsers[0]._id, testUsers[1]._id);
            testChat.addMessage(testUsers[0]._id, 'Hello Jane!');
            testChat.addMessage(testUsers[1]._id, 'Hi John! How are you?');
            await testChat.save();
        });

        it('should get user chats', async () => {
            const response = await request(app)
                .get('/api/chats')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.chats).toHaveLength(1);
            expect(response.body.data.chats[0]._id).toBe(testChat._id.toString());
            expect(response.body.data.chats[0].lastMessage.content).toBe('Hi John! How are you?');
        });

        it('should paginate chats', async () => {
            // Create additional chats
            await Chat.findOrCreateDirectChat(testUsers[0]._id, testUsers[2]._id);

            const response = await request(app)
                .get('/api/chats')
                .query({ page: 1, limit: 1 })
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.chats).toHaveLength(1);
            expect(response.body.data.pagination.page).toBe(1);
            expect(response.body.data.pagination.limit).toBe(1);
        });

        it('should include online status for participants', async () => {
            const response = await request(app)
                .get('/api/chats')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.chats[0].participants[0]).toHaveProperty('isOnline');
        });
    });

    describe('GET /api/chats/:chatId', () => {
        let testChat;

        beforeEach(async () => {
            testChat = await Chat.findOrCreateDirectChat(testUsers[0]._id, testUsers[1]._id);

            // Add multiple messages for pagination testing
            for (let i = 1; i <= 5; i++) {
                testChat.addMessage(testUsers[0]._id, `Message ${i} from John`);
                testChat.addMessage(testUsers[1]._id, `Message ${i} from Jane`);
            }
            await testChat.save();
        });

        it('should get chat with messages', async () => {
            const response = await request(app)
                .get(`/api/chats/${testChat._id}`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.chat._id).toBe(testChat._id.toString());
            expect(response.body.data.chat.messages).toHaveLength(10);
            expect(response.body.data.chat.participants).toHaveLength(2);
        });

        it('should paginate messages', async () => {
            const response = await request(app)
                .get(`/api/chats/${testChat._id}`)
                .query({ page: 1, limit: 5 })
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.chat.messages).toHaveLength(5);
            expect(response.body.data.pagination.page).toBe(1);
            expect(response.body.data.pagination.limit).toBe(5);
            expect(response.body.data.pagination.total).toBe(10);
        });

        it('should mark messages as read', async () => {
            // Check unread count before
            const chatBefore = await Chat.findById(testChat._id);
            const johnParticipant = chatBefore.participantStatus.find(
                p => p.user.toString() === testUsers[0]._id.toString()
            );
            expect(johnParticipant.unreadCount).toBeGreaterThan(0);

            const response = await request(app)
                .get(`/api/chats/${testChat._id}`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);

            // Check unread count after
            const chatAfter = await Chat.findById(testChat._id);
            const johnParticipantAfter = chatAfter.participantStatus.find(
                p => p.user.toString() === testUsers[0]._id.toString()
            );
            expect(johnParticipantAfter.unreadCount).toBe(0);
        });

        it('should deny access to non-participants', async () => {
            const response = await request(app)
                .get(`/api/chats/${testChat._id}`)
                .set('Authorization', `Bearer ${authTokens.bob}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('not found or access denied');
        });

        it('should return 404 for non-existent chat', async () => {
            const nonExistentChatId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .get(`/api/chats/${nonExistentChatId}`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/chats/:chatId/messages', () => {
        let testChat;

        beforeEach(async () => {
            testChat = await Chat.findOrCreateDirectChat(testUsers[0]._id, testUsers[1]._id);
        });

        it('should send a message to chat', async () => {
            const messageData = {
                content: 'Hello from the API!',
                messageType: 'text'
            };

            const response = await request(app)
                .post(`/api/chats/${testChat._id}/messages`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send(messageData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.message.content).toBe(messageData.content);
            expect(response.body.data.message.messageType).toBe('text');
            expect(response.body.data.message.sender._id).toBe(testUsers[0]._id.toString());
        });

        it('should validate message content', async () => {
            const messageData = {
                content: '', // Empty content
                messageType: 'text'
            };

            const response = await request(app)
                .post(`/api/chats/${testChat._id}/messages`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send(messageData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toBe('Validation failed');
        });

        it('should validate message type', async () => {
            const messageData = {
                content: 'Valid content',
                messageType: 'invalid_type'
            };

            const response = await request(app)
                .post(`/api/chats/${testChat._id}/messages`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send(messageData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should deny access to non-participants', async () => {
            const messageData = {
                content: 'I should not be able to send this',
                messageType: 'text'
            };

            const response = await request(app)
                .post(`/api/chats/${testChat._id}/messages`)
                .set('Authorization', `Bearer ${authTokens.bob}`)
                .send(messageData)
                .expect(404);

            expect(response.body.success).toBe(false);
        });

        it('should update chat last message and activity', async () => {
            const messageData = {
                content: 'This should update the chat metadata',
                messageType: 'text'
            };

            await request(app)
                .post(`/api/chats/${testChat._id}/messages`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .send(messageData)
                .expect(201);

            const updatedChat = await Chat.findById(testChat._id);
            expect(updatedChat.lastMessage.content).toBe(messageData.content);
            expect(updatedChat.lastMessage.sender.toString()).toBe(testUsers[0]._id.toString());
            expect(updatedChat.lastActivity).toBeDefined();
        });
    });

    describe('DELETE /api/chats/:chatId/messages/:messageId', () => {
        let testChat;
        let testMessage;

        beforeEach(async () => {
            testChat = await Chat.findOrCreateDirectChat(testUsers[0]._id, testUsers[1]._id);
            testMessage = testChat.addMessage(testUsers[0]._id, 'Message to be deleted');
            await testChat.save();
        });

        it('should delete own message', async () => {
            const response = await request(app)
                .delete(`/api/chats/${testChat._id}/messages/${testMessage._id}`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toContain('deleted successfully');

            // Verify message is marked as deleted
            const updatedChat = await Chat.findById(testChat._id);
            const deletedMessage = updatedChat.messages.id(testMessage._id);
            expect(deletedMessage.isDeleted).toBe(true);
            expect(deletedMessage.deletedAt).toBeDefined();
        });

        it('should not allow deleting other users messages', async () => {
            const response = await request(app)
                .delete(`/api/chats/${testChat._id}/messages/${testMessage._id}`)
                .set('Authorization', `Bearer ${authTokens.jane}`)
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('only delete their own messages');
        });

        it('should return 404 for non-existent message', async () => {
            const nonExistentMessageId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .delete(`/api/chats/${testChat._id}/messages/${nonExistentMessageId}`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(403);

            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/chats/:chatId/archive', () => {
        let testChat;

        beforeEach(async () => {
            testChat = await Chat.findOrCreateDirectChat(testUsers[0]._id, testUsers[1]._id);
        });

        it('should archive chat', async () => {
            const response = await request(app)
                .put(`/api/chats/${testChat._id}/archive`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toContain('archived successfully');

            // Verify chat is archived
            const archivedChat = await Chat.findById(testChat._id);
            expect(archivedChat.isArchived).toBe(true);
            expect(archivedChat.isActive).toBe(false);
        });

        it('should deny access to non-participants', async () => {
            const response = await request(app)
                .put(`/api/chats/${testChat._id}/archive`)
                .set('Authorization', `Bearer ${authTokens.bob}`)
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/chats/session/:sessionId', () => {
        it('should get or create session chat', async () => {
            const response = await request(app)
                .get(`/api/chats/session/${testSession._id}`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.chat.session).toBe(testSession._id.toString());
            expect(response.body.data.chat.chatType).toBe('session');
        });

        it('should deny access to non-session participants', async () => {
            const response = await request(app)
                .get(`/api/chats/session/${testSession._id}`)
                .set('Authorization', `Bearer ${authTokens.bob}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Session not found');
        });

        it('should return 404 for non-existent session', async () => {
            const nonExistentSessionId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .get(`/api/chats/session/${nonExistentSessionId}`)
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/chats/users/online', () => {
        it('should get online users list', async () => {
            const response = await request(app)
                .get('/api/chats/users/online')
                .set('Authorization', `Bearer ${authTokens.john}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.onlineUsers).toBeDefined();
            expect(response.body.data.count).toBeDefined();
            expect(Array.isArray(response.body.data.onlineUsers)).toBe(true);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get('/api/chats/users/online')
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('Chat Model Methods', () => {
        let testChat;

        beforeEach(async () => {
            testChat = await Chat.findOrCreateDirectChat(testUsers[0]._id, testUsers[1]._id);
        });

        it('should add message correctly', async () => {
            const messageContent = 'Test message content';
            const message = testChat.addMessage(testUsers[0]._id, messageContent);

            expect(message.content).toBe(messageContent);
            expect(message.sender.toString()).toBe(testUsers[0]._id.toString());
            expect(testChat.lastMessage.content).toBe(messageContent);
            expect(testChat.lastActivity).toBeDefined();
        });

        it('should mark messages as read', async () => {
            // Add messages from both users
            testChat.addMessage(testUsers[0]._id, 'Message from John');
            testChat.addMessage(testUsers[1]._id, 'Message from Jane');
            await testChat.save();

            // Mark as read for John
            testChat.markAsRead(testUsers[0]._id);

            // Check that Jane's message is marked as read for John
            const janeMessage = testChat.messages.find(
                msg => msg.sender.toString() === testUsers[1]._id.toString()
            );
            expect(janeMessage.isRead).toBe(true);
            expect(janeMessage.readAt).toBeDefined();

            // Check unread count is reset for John
            const johnParticipant = testChat.participantStatus.find(
                p => p.user.toString() === testUsers[0]._id.toString()
            );
            expect(johnParticipant.unreadCount).toBe(0);
        });

        it('should set typing status', async () => {
            testChat.setTypingStatus(testUsers[0]._id, true);

            const johnParticipant = testChat.participantStatus.find(
                p => p.user.toString() === testUsers[0]._id.toString()
            );
            expect(johnParticipant.isTyping).toBe(true);
            expect(johnParticipant.typingAt).toBeDefined();

            testChat.setTypingStatus(testUsers[0]._id, false);
            expect(johnParticipant.isTyping).toBe(false);
            expect(johnParticipant.typingAt).toBeNull();
        });

        it('should get other participant in direct chat', async () => {
            const otherParticipant = testChat.getOtherParticipant(testUsers[0]._id);
            expect(otherParticipant.toString()).toBe(testUsers[1]._id.toString());
        });

        it('should delete message correctly', async () => {
            const message = testChat.addMessage(testUsers[0]._id, 'Message to delete');
            await testChat.save();

            testChat.deleteMessage(message._id, testUsers[0]._id);

            expect(message.isDeleted).toBe(true);
            expect(message.deletedAt).toBeDefined();
        });

        it('should prevent non-sender from deleting message', async () => {
            const message = testChat.addMessage(testUsers[0]._id, 'Johns message');
            await testChat.save();

            expect(() => {
                testChat.deleteMessage(message._id, testUsers[1]._id);
            }).toThrow('User can only delete their own messages');
        });
    });
});