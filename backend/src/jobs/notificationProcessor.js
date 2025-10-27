const cron = require('node-cron');
const NotificationService = require('../services/notificationService');

/**
 * Notification Processor Job
 * Handles scheduled notification processing and cleanup
 */
class NotificationProcessor {
    constructor() {
        this.isRunning = false;
        this.jobs = [];
    }

    /**
     * Start all notification processing jobs
     */
    start() {
        console.log('🔔 Starting notification processor jobs...');

        // Process pending notifications every minute
        const processJob = cron.schedule('* * * * *', async () => {
            if (this.isRunning) {
                console.log('⏭️ Skipping notification processing - already running');
                return;
            }

            try {
                this.isRunning = true;
                await this.processScheduledNotifications();
            } catch (error) {
                console.error('❌ Error processing notifications:', error);
            } finally {
                this.isRunning = false;
            }
        }, {
            scheduled: false,
            timezone: 'UTC'
        });

        // Clean up old notifications daily at 2 AM UTC
        const cleanupJob = cron.schedule('0 2 * * *', async () => {
            try {
                await this.cleanupOldNotifications();
            } catch (error) {
                console.error('❌ Error cleaning up notifications:', error);
            }
        }, {
            scheduled: false,
            timezone: 'UTC'
        });

        // Retry failed notifications every 5 minutes
        const retryJob = cron.schedule('*/5 * * * *', async () => {
            try {
                await this.retryFailedNotifications();
            } catch (error) {
                console.error('❌ Error retrying failed notifications:', error);
            }
        }, {
            scheduled: false,
            timezone: 'UTC'
        });

        this.jobs = [processJob, cleanupJob, retryJob];

        // Start all jobs
        this.jobs.forEach(job => job.start());

        console.log('✅ Notification processor jobs started');
    }

    /**
     * Stop all notification processing jobs
     */
    stop() {
        console.log('🛑 Stopping notification processor jobs...');

        this.jobs.forEach(job => {
            if (job) {
                job.stop();
            }
        });

        this.jobs = [];
        console.log('✅ Notification processor jobs stopped');
    }

    /**
     * Process scheduled notifications
     */
    async processScheduledNotifications() {
        try {
            const result = await NotificationService.processScheduledNotifications();

            if (result.total > 0) {
                console.log(`📤 Processed ${result.processed}/${result.total} notifications (${result.failed} failed)`);
            }

            return result;
        } catch (error) {
            console.error('❌ Failed to process scheduled notifications:', error);
            throw error;
        }
    }

    /**
     * Clean up old notifications
     */
    async cleanupOldNotifications() {
        try {
            const result = await NotificationService.cleanupOldNotifications(90); // 90 days

            if (result.deletedCount > 0) {
                console.log(`🧹 Cleaned up ${result.deletedCount} old notifications`);
            }

            return result;
        } catch (error) {
            console.error('❌ Failed to cleanup old notifications:', error);
            throw error;
        }
    }

    /**
     * Retry failed notifications
     */
    async retryFailedNotifications() {
        try {
            const Notification = require('../models/Notification');

            // Find notifications that should be retried
            const failedNotifications = await Notification.find({
                status: 'failed',
                retryCount: { $lt: 3 },
                $or: [
                    { lastRetryAt: { $exists: false } },
                    { lastRetryAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } } // 5 minutes ago
                ]
            }).limit(50);

            if (failedNotifications.length === 0) {
                return { retried: 0, total: 0 };
            }

            let retriedCount = 0;
            const retryPromises = failedNotifications.map(async (notification) => {
                try {
                    // Reset status to pending for retry
                    notification.status = 'pending';
                    await notification.save();

                    // Process the notification
                    await NotificationService.processNotification(notification._id);
                    retriedCount++;
                } catch (error) {
                    console.error(`❌ Failed to retry notification ${notification._id}:`, error);
                }
            });

            await Promise.allSettled(retryPromises);

            if (retriedCount > 0) {
                console.log(`🔄 Retried ${retriedCount}/${failedNotifications.length} failed notifications`);
            }

            return {
                retried: retriedCount,
                total: failedNotifications.length
            };
        } catch (error) {
            console.error('❌ Failed to retry failed notifications:', error);
            throw error;
        }
    }

    /**
     * Get job status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            activeJobs: this.jobs.length,
            jobs: this.jobs.map((job, index) => ({
                id: index,
                running: job.running || false
            }))
        };
    }

    /**
     * Process a single notification immediately (for testing)
     */
    async processNotificationNow(notificationId) {
        try {
            return await NotificationService.processNotification(notificationId);
        } catch (error) {
            console.error(`❌ Failed to process notification ${notificationId}:`, error);
            throw error;
        }
    }

    /**
     * Get notification processing statistics
     */
    async getProcessingStats() {
        try {
            const Notification = require('../models/Notification');

            const stats = await Notification.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const statusCounts = {};
            stats.forEach(stat => {
                statusCounts[stat._id] = stat.count;
            });

            // Get pending notifications count
            const pendingCount = await Notification.countDocuments({
                status: 'pending',
                $or: [
                    { scheduledFor: { $lte: new Date() } },
                    { scheduledFor: { $exists: false } }
                ]
            });

            // Get failed notifications that can be retried
            const retryableCount = await Notification.countDocuments({
                status: 'failed',
                retryCount: { $lt: 3 }
            });

            return {
                statusCounts,
                pendingCount,
                retryableCount,
                isProcessorRunning: this.isRunning,
                lastProcessedAt: new Date()
            };
        } catch (error) {
            console.error('❌ Failed to get processing stats:', error);
            throw error;
        }
    }
}

// Create singleton instance
const notificationProcessor = new NotificationProcessor();

module.exports = notificationProcessor;