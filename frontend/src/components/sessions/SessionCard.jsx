import React, { useState } from 'react';
import { sessionAPI } from '../../utils/api';
import Button from '../common/Button';
import { cn } from '../../utils/helpers';
import toast from 'react-hot-toast';
import SessionResponseModal from './SessionResponseModal';

function SessionCard({ session, onUpdate, onDelete }) {
    const [showResponseModal, setShowResponseModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDuration = (minutes) => {
        if (minutes < 60) {
            return `${minutes} min`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    };

    const getStatusConfig = (status) => {
        const configs = {
            pending: {
                color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                icon: '⏳',
                label: 'Pending'
            },
            accepted: {
                color: 'bg-green-100 text-green-800 border-green-200',
                icon: '✅',
                label: 'Accepted'
            },
            rejected: {
                color: 'bg-red-100 text-red-800 border-red-200',
                icon: '❌',
                label: 'Rejected'
            },
            cancelled: {
                color: 'bg-gray-100 text-gray-800 border-gray-200',
                icon: '🚫',
                label: 'Cancelled'
            },
            completed: {
                color: 'bg-blue-100 text-blue-800 border-blue-200',
                icon: '🎉',
                label: 'Completed'
            },
            'no-show': {
                color: 'bg-orange-100 text-orange-800 border-orange-200',
                icon: '👻',
                label: 'No Show'
            }
        };
        return configs[status] || configs.pending;
    };

    const getSessionTypeIcon = (type) => {
        const icons = {
            online: '💻',
            'in-person': '🤝',
            hybrid: '🔄'
        };
        return icons[type] || '💻';
    };

    const handleCancelSession = async () => {
        if (!window.confirm('Are you sure you want to cancel this session?')) {
            return;
        }

        setLoading(true);
        try {
            await sessionAPI.cancelSession(session._id, 'Cancelled by user');
            toast.success('Session cancelled successfully');
            onUpdate(session._id, { status: 'cancelled' });
        } catch (error) {
            console.error('Error cancelling session:', error);
            toast.error('Failed to cancel session');
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteSession = async () => {
        setLoading(true);
        try {
            await sessionAPI.completeSession(session._id, '');
            toast.success('Session marked as completed');
            onUpdate(session._id, { status: 'completed' });
        } catch (error) {
            console.error('Error completing session:', error);
            toast.error('Failed to complete session');
        } finally {
            setLoading(false);
        }
    };

    const handleResponseSubmit = (response) => {
        onUpdate(session._id, {
            status: response.action === 'accept' ? 'accepted' : 'rejected',
            ...(response.confirmedDateTime && { scheduledDate: response.confirmedDateTime }),
            ...(response.responseMessage && { responseMessage: response.responseMessage }),
            ...(response.meetingLink && { meetingLink: response.meetingLink }),
            ...(response.location && { location: response.location })
        });
        setShowResponseModal(false);
    };

    const statusConfig = getStatusConfig(session.status);
    const isRequester = session.requester._id === session.currentUserId;
    const canRespond = !isRequester && session.status === 'pending';
    const canCancel = ['pending', 'accepted'].includes(session.status);
    const canComplete = session.status === 'accepted' && new Date(session.scheduledDate) < new Date();
    const isUpcoming = session.status === 'accepted' && new Date(session.scheduledDate) > new Date();

    return (
        <>
            <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {session.skill.name}
                                </h3>
                                <span className={cn(
                                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                                    statusConfig.color
                                )}>
                                    <span className="mr-1">{statusConfig.icon}</span>
                                    {statusConfig.label}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600">
                                {isRequester ? 'with' : 'from'} {' '}
                                <span className="font-medium">
                                    {isRequester
                                        ? `${session.provider.firstName} ${session.provider.lastName}`
                                        : `${session.requester.firstName} ${session.requester.lastName}`
                                    }
                                </span>
                            </p>
                        </div>

                        {isUpcoming && (
                            <div className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
                                Upcoming
                            </div>
                        )}
                    </div>

                    {/* Session Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                                <span className="mr-2">📅</span>
                                <span>{formatDate(session.scheduledDate)}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <span className="mr-2">⏱️</span>
                                <span>{formatDuration(session.duration)}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <span className="mr-2">{getSessionTypeIcon(session.sessionType)}</span>
                                <span className="capitalize">{session.sessionType}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                                <span className="mr-2">🎯</span>
                                <span>{session.skill.category} • {session.skill.level}</span>
                            </div>
                            {session.meetingLink && (
                                <div className="flex items-center text-sm text-gray-600">
                                    <span className="mr-2">🔗</span>
                                    <a
                                        href={session.meetingLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary-600 hover:text-primary-700 underline truncate"
                                    >
                                        Meeting Link
                                    </a>
                                </div>
                            )}
                            {session.location && (
                                <div className="flex items-center text-sm text-gray-600">
                                    <span className="mr-2">📍</span>
                                    <span className="truncate">{session.location}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Messages */}
                    {session.requestMessage && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                            <p className="text-sm text-gray-700">
                                <span className="font-medium">Request message:</span> {session.requestMessage}
                            </p>
                        </div>
                    )}

                    {session.responseMessage && (
                        <div className="bg-blue-50 rounded-lg p-3 mb-4">
                            <p className="text-sm text-gray-700">
                                <span className="font-medium">Response:</span> {session.responseMessage}
                            </p>
                        </div>
                    )}

                    {session.status === 'rejected' && session.reason && (
                        <div className="bg-red-50 rounded-lg p-3 mb-4">
                            <p className="text-sm text-gray-700">
                                <span className="font-medium">Reason:</span> {session.reason}
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t">
                        {canRespond && (
                            <Button
                                size="sm"
                                onClick={() => setShowResponseModal(true)}
                            >
                                Respond
                            </Button>
                        )}

                        {canComplete && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCompleteSession}
                                loading={loading}
                            >
                                Mark Complete
                            </Button>
                        )}

                        {canCancel && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelSession}
                                loading={loading}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                                Cancel
                            </Button>
                        )}

                        {session.status === 'completed' && !session.hasReview && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    // This would open a review modal - placeholder for now
                                    toast.info('Review functionality will be implemented in the next task');
                                }}
                            >
                                Leave Review
                            </Button>
                        )}

                        {isUpcoming && session.meetingLink && (
                            <Button
                                size="sm"
                                variant="primary"
                                onClick={() => window.open(session.meetingLink, '_blank')}
                            >
                                Join Meeting
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Response Modal */}
            {showResponseModal && (
                <SessionResponseModal
                    session={session}
                    onSubmit={handleResponseSubmit}
                    onClose={() => setShowResponseModal(false)}
                />
            )}
        </>
    );
}

export default SessionCard;