import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { joiResolver } from '@hookform/resolvers/joi';
import Joi from 'joi';
import toast from 'react-hot-toast';
import StarRating from './StarRating';
import { reviewAPI } from '../../utils/api';

// Validation schema
const reviewSchema = Joi.object({
    rating: Joi.number().integer().min(1).max(5).required()
        .messages({
            'number.min': 'Please select a rating',
            'number.max': 'Rating cannot exceed 5 stars',
            'any.required': 'Rating is required'
        }),
    comment: Joi.string().trim().min(10).max(1000).required()
        .messages({
            'string.min': 'Review must be at least 10 characters',
            'string.max': 'Review cannot exceed 1000 characters',
            'any.required': 'Review comment is required'
        })
});

/**
 * ReviewForm Component
 * Form for submitting reviews after completed sessions
 */
const ReviewForm = ({
    session,
    reviewee,
    onSubmit,
    onCancel,
    className = ''
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rating, setRating] = useState(0);

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch
    } = useForm({
        resolver: joiResolver(reviewSchema),
        defaultValues: {
            rating: 0,
            comment: ''
        }
    });

    const watchedComment = watch('comment', '');

    const handleRatingChange = (newRating) => {
        setRating(newRating);
        setValue('rating', newRating, { shouldValidate: true });
    };

    const onSubmitForm = async (data) => {
        setIsSubmitting(true);

        try {
            const reviewData = {
                sessionId: session._id,
                revieweeId: reviewee._id,
                rating: data.rating,
                comment: data.comment,
                reviewType: session.type || 'exchange'
            };

            const response = await reviewAPI.submitReview(reviewData);

            toast.success('Review submitted successfully!');

            if (onSubmit) {
                onSubmit(response.data);
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            toast.error(error.response?.data?.message || 'Failed to submit review');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Rate Your Experience
                </h3>
                <p className="text-sm text-gray-600">
                    How was your session with {reviewee.firstName} {reviewee.lastName}?
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
                {/* Rating Section */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Overall Rating *
                    </label>
                    <div className="flex items-center gap-4">
                        <StarRating
                            rating={rating}
                            interactive={true}
                            onChange={handleRatingChange}
                            size="lg"
                        />
                        <span className="text-sm text-gray-500">
                            {rating > 0 && (
                                <>
                                    {rating} star{rating !== 1 ? 's' : ''}
                                    {rating === 1 && ' - Poor'}
                                    {rating === 2 && ' - Fair'}
                                    {rating === 3 && ' - Good'}
                                    {rating === 4 && ' - Very Good'}
                                    {rating === 5 && ' - Excellent'}
                                </>
                            )}
                        </span>
                    </div>
                    {errors.rating && (
                        <p className="mt-1 text-sm text-red-600">{errors.rating.message}</p>
                    )}
                </div>

                {/* Comment Section */}
                <div>
                    <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                        Your Review *
                    </label>
                    <textarea
                        id="comment"
                        {...register('comment')}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Share your experience with this session. What did you learn? How was the teaching style?"
                    />
                    <div className="flex justify-between items-center mt-1">
                        {errors.comment ? (
                            <p className="text-sm text-red-600">{errors.comment.message}</p>
                        ) : (
                            <p className="text-sm text-gray-500">
                                Minimum 10 characters required
                            </p>
                        )}
                        <span className="text-sm text-gray-400">
                            {watchedComment.length}/1000
                        </span>
                    </div>
                </div>

                {/* Session Info */}
                <div className="bg-gray-50 rounded-md p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Session Details</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                        <p><span className="font-medium">Skill:</span> {session.skill}</p>
                        <p><span className="font-medium">Date:</span> {new Date(session.scheduledDate).toLocaleDateString()}</p>
                        {session.duration && (
                            <p><span className="font-medium">Duration:</span> {session.duration} minutes</p>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || rating === 0}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? (
                            <div className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Submitting...
                            </div>
                        ) : (
                            'Submit Review'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ReviewForm;