const Session = require('../models/Session');
const User = require('../models/User');
const { ValidationError, NotFoundError, ConflictError } = require('../middleware/errorHandler');

/**
 * Session Service
 * Contains business logic for session management
 */
class SessionService {
    /**
     * Create a new session booking request with conflict checking
     */
    static async createSessionRequest(requesterId, sessionData) {
        const {
            providerId,
            skill,
            scheduledDate,
            duration,
            timezone,
            sessionType,
            requestMessage,
            meetingLink,
            location
        } = sessionData;

        // Validate that requester is not booking with themselves
        if (requesterId === providerId) {
            throw new ValidationError('You cannot book a session with yourself');
        }

        // Check if provider exists and is available
        const provider = await User.findById(providerId);
        if (!provider || provider.status !== 'active' || !provider.isEmailVerified) {
            throw new NotFoundError('Provider not found or not available');
        }

        // Parse and validate scheduled date
        const sessionStart = new Date(scheduledDate);
        const sessionEnd = new Date(sessionStart.getTime() + (duration * 60000));

        // Check if session is in the future
        if (sessionStart <= new Date()) {
            throw new ValidationError('Session must be scheduled for a future date and time');
        }

        // Check for conflicts using existing method
        const conflicts = await Session.findConflictingSessions(requesterId, sessionStart, duration);
        const providerConflicts = await Session.findConflictingSessions(providerId, sessionStart, duration);

        if (conflicts.length > 0) {
            throw new ConflictError('You have a scheduling conflict at the proposed time', {
                conflicts: conflicts.map(c => ({
                    id: c._id,
                    scheduledDate: c.scheduledDate,
                    duration: c.duration
                }))
            });
        }

        if (providerConflicts.length > 0) {
            throw new ConflictError('The provider has a scheduling conflict at the proposed time', {
                conflicts: providerConflicts.map(c => ({
                    id: c._id,
                    scheduledDate: c.scheduledDate,
                    duration: c.duration
                }))
            });
        }

        // Create the session using existing model structure
        const session = new Session({
            requester: requesterId,
            provider: providerId,
            skill: {
                name: skill.name,
                category: skill.category,
                level: skill.level
            },
            scheduledDate: sessionStart,
            duration,
            timezone: timezone || 'UTC',
            sessionType: sessionType || 'online',
            requestMessage,
            meetingLink,
            location,
            status: 'pending'
        });

        await session.save();
        await session.populate('requester provider', 'firstName lastName email profileImage rating');

        return session;
    }

    /**
     * Respond to a session request (accept/decline)
     */
    static async respondToSessionRequest(sessionId, providerId, action, responseData = {}) {
        const session = await Session.findById(sessionId);
        if (!session) {
            throw new NotFoundError('Session not found');
        }

        // Only the provider can respond to session requests
        if (session.provider.toString() !== providerId) {
            throw new ValidationError('Only the session provider can respond to this request');
        }

        // Can only respond to pending sessions
        if (session.status !== 'pending') {
            throw new ValidationError(`Cannot respond to a ${session.status} session`);
        }

        if (action === 'accept') {
            const { confirmedDateTime, meetingLink, location, responseMessage } = responseData;

            // Use confirmed date time if provided, otherwise use original scheduled date
            const sessionDateTime = confirmedDateTime ? new Date(confirmedDateTime) : session.scheduledDate;

            // Check for conflicts again using existing method
            const conflicts = await Session.findConflictingSessions(
                session.requester.toString(),
                sessionDateTime,
                session.duration,
                sessionId
            );
            const providerConflicts = await Session.findConflictingSessions(
                providerId,
                sessionDateTime,
                session.duration,
                sessionId
            );

            if (conflicts.length > 0 || providerConflicts.length > 0) {
                throw new ConflictError('Scheduling conflict detected. Please propose an alternative time.');
            }

            session.status = 'accepted';
            session.scheduledDate = sessionDateTime;
            session.respondedAt = new Date();

            if (meetingLink) session.meetingLink = meetingLink;
            if (location) session.location = location;
            if (responseMessage) session.responseMessage = responseMessage;

        } else if (action === 'decline') {
            const { reason } = responseData;
            session.status = 'rejected';
            session.respondedAt = new Date();
            if (reason) session.responseMessage = reason;
        } else {
            throw new ValidationError('Invalid action. Must be "accept" or "decline"');
        }

        await session.save();
        await session.populate('requester provider', 'firstName lastName email profileImage rating');
        return session;
    }

    /**
     * Cancel a session with validation
     */
    static async cancelSession(sessionId, userId, reason) {
        const session = await Session.findById(sessionId);
        if (!session) {
            throw new NotFoundError('Session not found');
        }

        // Check if user is participant using existing method
        if (!session.isParticipant(userId)) {
            throw new ValidationError('You do not have access to this session');
        }

        // Can only cancel pending or accepted sessions
        if (!['pending', 'accepted'].includes(session.status)) {
            throw new ValidationError(`Cannot cancel a ${session.status} session`);
        }

        // Check if session can be cancelled using existing method
        if (session.status === 'accepted' && !session.canBeCancelled()) {
            throw new ValidationError('Cannot cancel confirmed session with less than 2 hours notice');
        }

        session.status = 'cancelled';
        session.cancelledBy = userId;
        session.cancelledAt = new Date();
        if (reason) session.cancellationReason = reason;

        await session.save();
        await session.populate('requester provider', 'firstName lastName email profileImage rating');

        return session;
    }

    /**
     * Complete a session with validation
     */
    static async completeSession(sessionId, userId, notes) {
        const session = await Session.findById(sessionId);
        if (!session) {
            throw new NotFoundError('Session not found');
        }

        // Check if user is participant
        if (!session.isParticipant(userId)) {
            throw new ValidationError('You do not have access to this session');
        }

        // Can only complete accepted sessions using existing method
        if (!session.canBeCompleted()) {
            throw new ValidationError('Only accepted sessions that have started can be marked as completed');
        }

        session.status = 'completed';
        session.completedAt = new Date();

        // Add notes based on user role
        const isRequester = session.requester.toString() === userId;
        if (notes) {
            if (isRequester) {
                session.notes.requester = notes;
            } else {
                session.notes.provider = notes;
            }
        }

        await session.save();
        await session.populate('requester provider', 'firstName lastName email profileImage rating');

        return session;
    }

    /**
     * Submit feedback for a completed session
     */
    static async submitSessionFeedback(sessionId, userId, rating, comment) {
        const session = await Session.findById(sessionId);
        if (!session) {
            throw new NotFoundError('Session not found');
        }

        // Check if user is participant
        if (!session.isParticipant(userId)) {
            throw new ValidationError('You do not have access to this session');
        }

        // Can only provide feedback for completed sessions
        if (session.status !== 'completed') {
            throw new ValidationError('Can only provide feedback for completed sessions');
        }

        // For now, we'll store feedback in the reviews array as a simple object
        // This can be enhanced later with a proper Review model
        const feedbackEntry = {
            userId,
            rating,
            comment,
            submittedAt: new Date()
        };

        session.reviews.push(feedbackEntry);
        await session.save();
        await session.populate('requester provider', 'firstName lastName email profileImage rating');

        // Update user ratings
        const otherParticipant = session.getOtherParticipant(userId);
        if (otherParticipant) {
            await this.updateUserRating(otherParticipant, rating);
        }

        return session;
    }

    /**
     * Update a user's overall rating
     */
    static async updateUserRating(userId, newRating) {
        const user = await User.findById(userId);
        if (!user) return;

        const currentRating = user.rating || { average: 0, count: 0 };
        const totalRating = (currentRating.average * currentRating.count) + newRating;
        const newCount = currentRating.count + 1;
        const newAverage = totalRating / newCount;

        user.rating = {
            average: Math.round(newAverage * 10) / 10, // Round to 1 decimal place
            count: newCount
        };

        await user.save();
    }

    /**
     * Propose alternative time for a session
     */
    static async proposeAlternativeTime(sessionId, userId, dateTime, message) {
        const session = await Session.findById(sessionId);
        if (!session) {
            throw new NotFoundError('Session not found');
        }

        // Check if user is participant
        if (!session.isParticipant(userId)) {
            throw new ValidationError('You do not have access to this session');
        }

        // Can only propose alternatives for pending sessions
        if (session.status !== 'pending') {
            throw new ValidationError(`Cannot propose alternative time for a ${session.status} session`);
        }

        const proposedDateTime = new Date(dateTime);
        if (proposedDateTime <= new Date()) {
            throw new ValidationError('Alternative time must be in the future');
        }

        // For now, we'll add a simple note about the alternative time
        // This can be enhanced with a proper alternative times structure
        const alternativeMessage = `Alternative time proposed: ${proposedDateTime.toISOString()}${message ? ` - ${message}` : ''}`;

        const isRequester = session.requester.toString() === userId;
        if (isRequester) {
            session.requestMessage = session.requestMessage + `\n\n${alternativeMessage}`;
        } else {
            session.responseMessage = (session.responseMessage || '') + `\n\n${alternativeMessage}`;
        }

        await session.save();
        await session.populate('requester provider', 'firstName lastName email profileImage rating');

        return session;
    }

    /**
     * Get user sessions with filtering and pagination
     */
    static async getUserSessions(userId, filters = {}) {
        const {
            status,
            type = 'all',
            page = 1,
            limit = 20,
            upcoming = false
        } = filters;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy: 'createdAt',
            sortOrder: 'desc'
        };

        let statusFilter = status;
        if (upcoming === 'true' || upcoming === true) {
            statusFilter = ['pending', 'accepted'];
        }

        // Build query manually since the existing method might not work as expected
        let query = {};

        if (type === 'requested') {
            query.requester = userId;
        } else if (type === 'received') {
            query.provider = userId;
        } else {
            query.$or = [
                { requester: userId },
                { provider: userId }
            ];
        }

        if (statusFilter) {
            if (Array.isArray(statusFilter)) {
                query.status = { $in: statusFilter };
            } else {
                query.status = statusFilter;
            }
        }

        if (upcoming === 'true' || upcoming === true) {
            query.status = { $in: ['pending', 'accepted'] };
            query.scheduledDate = { $gte: new Date() };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);

        const [sessions, totalCount] = await Promise.all([
            Session.find(query)
                .populate('requester provider', 'firstName lastName email profileImage rating')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Session.countDocuments(query)
        ]);

        // Add user role to each session
        const sessionsWithRole = sessions.map(session => ({
            ...session,
            userRole: session.requester._id.toString() === userId ? 'requester' : 'provider'
        }));

        const totalPages = Math.ceil(totalCount / parseInt(limit));

        return {
            sessions: sessionsWithRole,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalCount,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                limit: parseInt(limit)
            }
        };
    }

    /**
     * Get session statistics for a user
     */
    static async getUserSessionStats(userId) {
        const stats = await Session.aggregate([
            {
                $match: {
                    $or: [
                        { requester: userId },
                        { provider: userId }
                    ]
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const statsMap = stats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
        }, {});

        return {
            total: stats.reduce((sum, stat) => sum + stat.count, 0),
            pending: statsMap.pending || 0,
            accepted: statsMap.accepted || 0,
            completed: statsMap.completed || 0,
            cancelled: statsMap.cancelled || 0,
            rejected: statsMap.rejected || 0
        };
    }

    /**
     * Get upcoming sessions for a user
     */
    static async getUpcomingSessions(userId, days = 7) {
        return await Session.findUpcomingSessions(userId, 50); // Use existing method
    }

    /**
     * Check for scheduling conflicts
     */
    static async checkSchedulingConflicts(userId, dateTime, duration, participantId = null) {
        const sessionStart = new Date(dateTime);

        // Check conflicts using existing method
        const [userConflicts, participantConflicts] = await Promise.all([
            Session.findConflictingSessions(userId, sessionStart, duration),
            participantId ? Session.findConflictingSessions(participantId, sessionStart, duration) : []
        ]);

        const hasConflicts = userConflicts.length > 0 || participantConflicts.length > 0;

        return {
            hasConflicts,
            userConflicts: userConflicts.map(c => ({
                id: c._id,
                scheduledDate: c.scheduledDate,
                duration: c.duration
            })),
            participantConflicts: participantConflicts.map(c => ({
                id: c._id,
                scheduledDate: c.scheduledDate,
                duration: c.duration
            }))
        };
    }

    /**
     * Get session with access validation
     */
    static async getSessionWithAccess(sessionId, userId) {
        const session = await Session.findById(sessionId)
            .populate('requester provider', 'firstName lastName email profileImage rating')
            .lean();

        if (!session) {
            throw new NotFoundError('Session not found');
        }

        // Check if user is involved in this session
        const isRequester = session.requester && session.requester._id.toString() === userId;
        const isProvider = session.provider && session.provider._id.toString() === userId;

        if (!isRequester && !isProvider) {
            throw new ValidationError('You do not have access to this session');
        }

        // Add user role
        return {
            ...session,
            userRole: isRequester ? 'requester' : 'provider'
        };
    }

    /**
     * Clean up expired sessions (to be called by a cron job)
     */
    static async cleanupExpiredSessions() {
        const result = await Session.updateMany(
            {
                status: 'pending',
                scheduledDate: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 days old
            },
            {
                $set: { status: 'expired' }
            }
        );

        return result.modifiedCount;
    }
}

module.exports = SessionService;