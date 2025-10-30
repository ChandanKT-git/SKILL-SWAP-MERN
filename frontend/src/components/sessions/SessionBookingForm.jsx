import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { sessionAPI } from '../../utils/api';
import Button from '../common/Button';
import Input from '../common/Input';
import { cn } from '../../utils/helpers';
import toast from 'react-hot-toast';

function SessionBookingForm({ providerId, providerName, onSuccess, onCancel }) {
    const [loading, setLoading] = useState(false);
    const [conflicts, setConflicts] = useState([]);
    const [checkingConflicts, setCheckingConflicts] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
        reset
    } = useForm({
        defaultValues: {
            skill: {
                name: '',
                category: '',
                level: 'beginner'
            },
            scheduledDate: '',
            duration: 60,
            sessionType: 'online',
            requestMessage: '',
            meetingLink: '',
            location: ''
        }
    });

    const watchedDate = watch('scheduledDate');
    const watchedDuration = watch('duration');
    const watchedSessionType = watch('sessionType');

    // Check for conflicts when date/time or duration changes
    useEffect(() => {
        if (watchedDate && watchedDuration) {
            checkConflicts();
        }
    }, [watchedDate, watchedDuration]);

    const checkConflicts = async () => {
        if (!watchedDate || !watchedDuration) return;

        setCheckingConflicts(true);
        try {
            const response = await sessionAPI.checkConflicts({
                dateTime: watchedDate,
                duration: parseInt(watchedDuration),
                participantId: providerId
            });
            setConflicts(response.data.conflicts || []);
        } catch (error) {
            console.error('Error checking conflicts:', error);
        } finally {
            setCheckingConflicts(false);
        }
    };

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            const sessionData = {
                providerId,
                skill: {
                    name: data.skill.name.trim(),
                    category: data.skill.category.trim(),
                    level: data.skill.level
                },
                scheduledDate: new Date(data.scheduledDate).toISOString(),
                duration: parseInt(data.duration),
                sessionType: data.sessionType,
                requestMessage: data.requestMessage?.trim() || '',
                ...(data.sessionType === 'online' && data.meetingLink && {
                    meetingLink: data.meetingLink.trim()
                }),
                ...(data.sessionType !== 'online' && data.location && {
                    location: data.location.trim()
                })
            };

            await sessionAPI.createSession(sessionData);
            toast.success('Session request sent successfully!');
            reset();
            onSuccess?.();
        } catch (error) {
            console.error('Error creating session:', error);
            toast.error(error.response?.data?.message || 'Failed to create session request');
        } finally {
            setLoading(false);
        }
    };

    const skillCategories = [
        'Programming', 'Design', 'Marketing', 'Business', 'Language',
        'Music', 'Art', 'Cooking', 'Fitness', 'Photography', 'Writing', 'Other'
    ];

    const skillLevels = [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'expert', label: 'Expert' }
    ];

    const sessionTypes = [
        { value: 'online', label: 'Online' },
        { value: 'in-person', label: 'In Person' },
        { value: 'hybrid', label: 'Hybrid' }
    ];

    const durationOptions = [
        { value: 15, label: '15 minutes' },
        { value: 30, label: '30 minutes' },
        { value: 60, label: '1 hour' },
        { value: 90, label: '1.5 hours' },
        { value: 120, label: '2 hours' },
        { value: 180, label: '3 hours' }
    ];

    // Get minimum date (tomorrow)
    const getMinDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().slice(0, 16);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                    Book a Session with {providerName}
                </h2>
                <p className="text-gray-600 mt-1">
                    Fill out the details below to request a skill exchange session.
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Skill Information */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Skill Details</h3>

                    <Input
                        label="Skill Name"
                        placeholder="e.g., React Development, Guitar Basics"
                        {...register('skill.name', {
                            required: 'Skill name is required',
                            minLength: { value: 2, message: 'Skill name must be at least 2 characters' },
                            maxLength: { value: 100, message: 'Skill name must be less than 100 characters' }
                        })}
                        error={errors.skill?.name?.message}
                        required
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="skill-category" className="block text-sm font-medium text-gray-700 mb-1">
                                Category <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="skill-category"
                                {...register('skill.category', { required: 'Category is required' })}
                                className={cn(
                                    'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                                    errors.skill?.category ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                )}
                            >
                                <option value="">Select a category</option>
                                {skillCategories.map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                            {errors.skill?.category && (
                                <p className="text-sm text-red-600 mt-1">{errors.skill.category.message}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="skill-level" className="block text-sm font-medium text-gray-700 mb-1">
                                Level <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="skill-level"
                                {...register('skill.level', { required: 'Level is required' })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                {skillLevels.map(level => (
                                    <option key={level.value} value={level.value}>{level.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Session Details */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Session Details</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Date & Time"
                            type="datetime-local"
                            min={getMinDate()}
                            {...register('scheduledDate', {
                                required: 'Date and time is required',
                                validate: (value) => {
                                    const selectedDate = new Date(value);
                                    const now = new Date();
                                    if (selectedDate <= now) {
                                        return 'Session must be scheduled for a future date and time';
                                    }
                                    return true;
                                }
                            })}
                            error={errors.scheduledDate?.message}
                            required
                        />

                        <div>
                            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                                Duration <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="duration"
                                {...register('duration', { required: 'Duration is required' })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                {durationOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Conflict Warning */}
                    {checkingConflicts && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-yellow-800 text-sm">Checking for scheduling conflicts...</p>
                        </div>
                    )}

                    {conflicts.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-red-800 text-sm font-medium">Scheduling Conflicts Detected:</p>
                            <ul className="text-red-700 text-sm mt-1 list-disc list-inside">
                                {conflicts.map((conflict, index) => (
                                    <li key={index}>{conflict}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div>
                        <label htmlFor="session-type" className="block text-sm font-medium text-gray-700 mb-1">
                            Session Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="session-type"
                            {...register('sessionType')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            {sessionTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Conditional fields based on session type */}
                    {watchedSessionType === 'online' && (
                        <Input
                            label="Meeting Link (Optional)"
                            type="url"
                            placeholder="https://zoom.us/j/123456789"
                            {...register('meetingLink', {
                                pattern: {
                                    value: /^https?:\/\/.+/,
                                    message: 'Please enter a valid URL'
                                }
                            })}
                            error={errors.meetingLink?.message}
                            helperText="You can provide this later if the session is accepted"
                        />
                    )}

                    {(watchedSessionType === 'in-person' || watchedSessionType === 'hybrid') && (
                        <Input
                            label="Location (Optional)"
                            placeholder="e.g., Central Library, Downtown Coffee Shop"
                            {...register('location', {
                                maxLength: { value: 200, message: 'Location must be less than 200 characters' }
                            })}
                            error={errors.location?.message}
                            helperText="Specify where you'd like to meet"
                        />
                    )}
                </div>

                {/* Request Message */}
                <div>
                    <label htmlFor="request-message" className="block text-sm font-medium text-gray-700 mb-1">
                        Message (Optional)
                    </label>
                    <textarea
                        id="request-message"
                        {...register('requestMessage', {
                            maxLength: { value: 500, message: 'Message must be less than 500 characters' }
                        })}
                        rows={4}
                        className={cn(
                            'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none',
                            errors.requestMessage ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        )}
                        placeholder="Tell them what you'd like to learn or any specific topics you want to cover..."
                    />
                    {errors.requestMessage && (
                        <p className="text-sm text-red-600 mt-1">{errors.requestMessage.message}</p>
                    )}
                </div>

                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                        type="submit"
                        loading={loading}
                        disabled={conflicts.length > 0}
                        className="flex-1 sm:flex-none"
                    >
                        Send Request
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        className="flex-1 sm:flex-none"
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </div>
    );
}

export default SessionBookingForm;