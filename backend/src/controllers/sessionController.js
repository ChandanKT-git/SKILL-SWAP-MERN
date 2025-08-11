const SessionService = require('../services/sessionService');
const { RequestLogger } = require('../middleware/logging');

/**
 * Session Controller
 * Handles session booking, management, and conflict resolution
 */
class SessionController {
    /**
     * Create a new session booking request
     * @route POST /api/sessions
     */
    static async createSession(req, res, next) {
        try {
            const requesterId = req.user.id;
            const session = await SessionService.createSessionRequest(requesterId, req.body);

            RequestLogger.logDatabaseOperation('create_session', 'sessions', true);

            res.status(201).json({
                success: true,
                data: session,
                message: 'Session booking request created successfully'
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('create_session', 'sessions', false, error);
            next(error);
        }
    }

    /**
     * Get user's sessions with filtering
     * @route GET /api/sessions
     */
    static async getUserSessions(req, res, next) {
        try {
            const userId = req.user.id;
            const result = await SessionService.getUserSessions(userId, req.query);

            RequestLogger.logDatabaseOperation('get_user_sessions', 'sessions', true);

            res.status(200).json({
                success: true,
                data: result,
                message: `Found ${result.sessions.length} sessions`
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('get_user_sessions', 'sessions', false, error);
            next(error);
        }
    }

    /**
     * Get a specific session by ID
     * @route GET /api/sessions/:sessionId
     */
    static async getSession(req, res, next) {
        try {
            const { sessionId } = req.params;
            const userId = req.user.id;

            const session = await SessionService.getSessionWithAccess(sessionId, userId);

            RequestLogger.logDatabaseOperation('get_session', 'sessions', true);

            res.status(200).json({
                success: true,
                data: session,
                message: 'Session retrieved successfully'
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('get_session', 'sessions', false, error);
            next(error);
        }
    }

    /**
     * Respond to a session request (accept/decline)
     * @route PUT /api/sessions/:sessionId/respond
     */
    static async respondToSession(req, res, next) {
        try {
            const { sessionId } = req.params;
            const { action, confirmedDateTime, reason, meetingDetails } = req.body;
            const userId = req.user.id;

            const session = await SessionService.respondToSessionRequest(
                sessionId,
                userId,
                action,
                { confirmedDateTime, reason, meetingDetails }
            );

            RequestLogger.logDatabaseOperation('respond_to_session', 'sessions', true);

            res.status(200).json({
                success: true,
                data: session,
                message: `Session ${action}ed successfully`
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('respond_to_session', 'sessions', false, error);
            next(error);
        }
    }

    /**
     * Propose alternative time for a session
     * @route POST /api/sessions/:sessionId/alternative-time
     */
    static async proposeAlternativeTime(req, res, next) {
        try {
            const { sessionId } = req.params;
            const { dateTime, message } = req.body;
            const userId = req.user.id;

            const session = await SessionService.proposeAlternativeTime(sessionId, userId, dateTime, message);

            RequestLogger.logDatabaseOperation('propose_alternative_time', 'sessions', true);

            res.status(200).json({
                success: true,
                data: session,
                message: 'Alternative time proposed successfully'
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('propose_alternative_time', 'sessions', false, error);
            next(error);
        }
    }

    /**
     * Cancel a session
     * @route PUT /api/sessions/:sessionId/cancel
     */
    static async cancelSession(req, res, next) {
        try {
            const { sessionId } = req.params;
            const { reason } = req.body;
            const userId = req.user.id;

            const session = await SessionService.cancelSession(sessionId, userId, reason);

            RequestLogger.logDatabaseOperation('cancel_session', 'sessions', true);

            res.status(200).json({
                success: true,
                data: session,
                message: 'Session cancelled successfully'
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('cancel_session', 'sessions', false, error);
            next(error);
        }
    }

    /**
     * Mark session as completed
     * @route PUT /api/sessions/:sessionId/complete
     */
    static async completeSession(req, res, next) {
        try {
            const { sessionId } = req.params;
            const { notes } = req.body;
            const userId = req.user.id;

            const session = await SessionService.completeSession(sessionId, userId, notes);

            RequestLogger.logDatabaseOperation('complete_session', 'sessions', true);

            res.status(200).json({
                success: true,
                data: session,
                message: 'Session marked as completed successfully'
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('complete_session', 'sessions', false, error);
            next(error);
        }
    }

    /**
     * Submit feedback for a completed session
     * @route POST /api/sessions/:sessionId/feedback
     */
    static async submitFeedback(req, res, next) {
        try {
            const { sessionId } = req.params;
            const { rating, comment } = req.body;
            const userId = req.user.id;

            const session = await SessionService.submitSessionFeedback(sessionId, userId, rating, comment);

            RequestLogger.logDatabaseOperation('submit_feedback', 'sessions', true);

            res.status(200).json({
                success: true,
                data: session,
                message: 'Feedback submitted successfully'
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('submit_feedback', 'sessions', false, error);
            next(error);
        }
    }

    /**
     * Get upcoming sessions for a user
     * @route GET /api/sessions/upcoming
     */
    static async getUpcomingSessions(req, res, next) {
        try {
            const userId = req.user.id;
            const { days = 7 } = req.query;

            const sessions = await SessionService.getUpcomingSessions(userId, parseInt(days));

            RequestLogger.logDatabaseOperation('get_upcoming_sessions', 'sessions', true);

            res.status(200).json({
                success: true,
                data: sessions,
                message: `Found ${sessions.length} upcoming sessions`
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('get_upcoming_sessions', 'sessions', false, error);
            next(error);
        }
    }

    /**
     * Check for scheduling conflicts
     * @route POST /api/sessions/check-conflicts
     */
    static async checkConflicts(req, res, next) {
        try {
            const { dateTime, duration, participantId } = req.body;
            const userId = req.user.id;

            const result = await SessionService.checkSchedulingConflicts(userId, dateTime, duration, participantId);

            RequestLogger.logDatabaseOperation('check_conflicts', 'sessions', true);

            res.status(200).json({
                success: true,
                data: result,
                message: result.hasConflicts ? 'Scheduling conflicts found' : 'No conflicts found'
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('check_conflicts', 'sessions', false, error);
            next(error);
        }
    }

    /**
     * Get session statistics for a user
     * @route GET /api/sessions/stats
     */
    static async getSessionStats(req, res, next) {
        try {
            const userId = req.user.id;
            const stats = await SessionService.getUserSessionStats(userId);

            RequestLogger.logDatabaseOperation('get_session_stats', 'sessions', true);

            res.status(200).json({
                success: true,
                data: stats,
                message: 'Session statistics retrieved successfully'
            });

        } catch (error) {
            RequestLogger.logDatabaseOperation('get_session_stats', 'sessions', false, error);
            next(error);
        }
    }
}

module.exports = SessionController;