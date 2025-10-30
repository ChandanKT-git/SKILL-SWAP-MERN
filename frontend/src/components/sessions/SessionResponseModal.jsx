import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { sessionAPI } from '../../utils/api';
import Button from '../common/Button';
import Input from '../common/Input';
import { cn } from '../../utils/helpers';
import toast from 'react-hot-toast';

function SessionResponseModal({ session, onSubmit, onClose }) {
    const [action, setAction] = useState('');
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
        reset
    } = useForm({
        defaultValues: {
            confirmedDateTime: session.scheduledDate ? new Date(session.scheduledDate).toISOString().slice(0, 16) : '',
            responseMessage: '',
            meetingLink: session.meetingLink || '',
            location: session.location || '',
            reason: ''
        }
    });

    const watchedSessionType = session.sessionType;

    const handleActionSelect = (selectedAction) => {
        setAction(selectedAction);
    };

    const onSubmitResponse = async (data) => {
        if (!action) {
            toast.error('Please select an action');
            return;
        }

        setLoading(true);
        try {
            const responseData = {
                action,
                ...(action === 'accept' && {
                    confirmedDateTime: data.confirmedDateTime ? new Date(data.confirmedDateTime).toISOString() : undefined,
                    responseMessage: data.responseMessage?.trim() || '',
                    ...(watchedSessionType === 'online' && data.meetingLink && {
                        meetingLink: data.meetingLink.trim()
                    }),
                    ...(watchedSessionType !== 'online' && data.location && {
                        location: data.location.trim()
                    })
                }),
                ...(action === 'decline' && {
                    reason: data.reason?.trim() || '',
                    responseMessage: data.responseMessage?.trim() || ''
                })
            };

            await sessionAPI.respondToSession(session._id, responseData);

            toast.success(action === 'accept' ? 'Session accepted!' : 'Session declined');
            onSubmit(responseData);
        } catch (error) {
            console.error('Error responding to session:', error);
            toast.error(error.response?.data?.message || 'Failed to respond to session');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDuration = (minutes) => {
        if (minutes < 60) {
            return `${minutes} minutes`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes` : `${hours} hour${hours > 1 ? 's' : ''}`;
    };

    // Get minimum date (now)
    const getMinDate = () => {
        const now = new Date();
        return now.toISOString().slice(0, 16);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                Respond to Session Request
                            </h2>
                            <p className="text-gray-600 mt-1">
                                From {session.requester.firstName} {session.requester.lastName}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Session Details */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h3 className="font-medium text-gray-900 mb-3">Session Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Skill:</span>
                                <p className="font-medium">{session.skill.name}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Category:</span>
                                <p className="font-medium">{session.skill.category} • {session.skill.level}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Proposed Date:</span>
                                <p className="font-medium">{formatDate(session.scheduledDate)}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Duration:</span>
                                <p className="font-medium">{formatDuration(session.duration)}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Type:</span>
                                <p className="font-medium capitalize">{session.sessionType}</p>
                            </div>
                            {session.location && (
                                <div>
                                    <span className="text-gray-600">Location:</span>
                                    <p className="font-medium">{session.location}</p>
                                </div>
                            )}
                        </div>

                        {session.requestMessage && (
                            <div className="mt-4">
                                <span className="text-gray-600">Message:</span>
                                <p className="font-medium mt-1">{session.requestMessage}</p>
                            </div>
                        )}
                    </div>

                    {/* Action Selection */}
                    {!action && (
                        <div className="mb-6">
                            <h3 className="font-medium text-gray-900 mb-3">Choose your response:</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleActionSelect('accept')}
                                    className="p-4 border-2 border-green-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left"
                                >
                                    <div className="flex items-center mb-2">
                                        <span className="text-2xl mr-3">✅</span>
                                        <span className="font-medium text-green-800">Accept Session</span>
                                    </div>
                                    <p className="text-sm text-green-600">
                                        Confirm the session and provide any additional details
                                    </p>
                                </button>

                                <button
                                    onClick={() => handleActionSelect('decline')}
                                    className="p-4 border-2 border-red-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors text-left"
                                >
                                    <div className="flex items-center mb-2">
                                        <span className="text-2xl mr-3">❌</span>
                                        <span className="font-medium text-red-800">Decline Session</span>
                                    </div>
                                    <p className="text-sm text-red-600">
                                        Politely decline with an optional reason
                                    </p>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Response Form */}
                    {action && (
                        <form onSubmit={handleSubmit(onSubmitResponse)} className="space-y-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-medium text-gray-900">
                                    {action === 'accept' ? 'Accept Session' : 'Decline Session'}
                                </h3>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setAction('')}
                                >
                                    Change Response
                                </Button>
                            </div>

                            {action === 'accept' && (
                                <div className="space-y-4">
                                    <Input
                                        label="Confirm Date & Time"
                                        type="datetime-local"
                                        min={getMinDate()}
                                        {...register('confirmedDateTime', {
                                            validate: (value) => {
                                                if (!value) return true; // Optional field
                                                const selectedDate = new Date(value);
                                                const now = new Date();
                                                if (selectedDate <= now) {
                                                    return 'Confirmed time must be in the future';
                                                }
                                                return true;
                                            }
                                        })}
                                        error={errors.confirmedDateTime?.message}
                                        helperText="Leave empty to keep the original proposed time"
                                    />

                                    {watchedSessionType === 'online' && (
                                        <Input
                                            label="Meeting Link"
                                            type="url"
                                            placeholder="https://zoom.us/j/123456789"
                                            {...register('meetingLink', {
                                                pattern: {
                                                    value: /^https?:\/\/.+/,
                                                    message: 'Please enter a valid URL'
                                                }
                                            })}
                                            error={errors.meetingLink?.message}
                                            helperText="Provide the meeting link for the online session"
                                        />
                                    )}

                                    {(watchedSessionType === 'in-person' || watchedSessionType === 'hybrid') && (
                                        <Input
                                            label="Location"
                                            placeholder="e.g., Central Library, Downtown Coffee Shop"
                                            {...register('location', {
                                                maxLength: { value: 200, message: 'Location must be less than 200 characters' }
                                            })}
                                            error={errors.location?.message}
                                            helperText="Confirm or update the meeting location"
                                        />
                                    )}
                                </div>
                            )}

                            {action === 'decline' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Reason (Optional)
                                    </label>
                                    <textarea
                                        {...register('reason', {
                                            maxLength: { value: 500, message: 'Reason must be less than 500 characters' }
                                        })}
                                        rows={3}
                                        className={cn(
                                            'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none',
                                            errors.reason ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                        )}
                                        placeholder="Let them know why you can't take this session (optional)..."
                                    />
                                    {errors.reason && (
                                        <p className="text-sm text-red-600 mt-1">{errors.reason.message}</p>
                                    )}
                                </div>
                            )}

                            {/* Response Message */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Message (Optional)
                                </label>
                                <textarea
                                    {...register('responseMessage', {
                                        maxLength: { value: 500, message: 'Message must be less than 500 characters' }
                                    })}
                                    rows={3}
                                    className={cn(
                                        'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none',
                                        errors.responseMessage ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                    )}
                                    placeholder={action === 'accept'
                                        ? "Add any additional notes or instructions..."
                                        : "Add a polite message with your decline..."
                                    }
                                />
                                {errors.responseMessage && (
                                    <p className="text-sm text-red-600 mt-1">{errors.responseMessage.message}</p>
                                )}
                            </div>

                            {/* Form Actions */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <Button
                                    type="submit"
                                    loading={loading}
                                    variant={action === 'accept' ? 'primary' : 'danger'}
                                    className="flex-1 sm:flex-none"
                                >
                                    {action === 'accept' ? 'Accept Session' : 'Decline Session'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClose}
                                    className="flex-1 sm:flex-none"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SessionResponseModal;