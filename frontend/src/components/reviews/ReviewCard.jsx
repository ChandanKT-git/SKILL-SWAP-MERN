import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
    HandThumbUpIcon,
    HandThumbDownIcon,
    FlagIcon,
    ChatBubbleLeftIcon
} from '@heroicons/react/24/outline';
import {
    HandThumbUpIcon as HandThumbUpSolidIcon,
    HandThumbDownIcon as HandThumbDownSolidIcon
} from '@heroicons/react/24/solid';
import StarRating from './StarRating';
import { reviewAPI } from '../../utils/api';
import toast from 'react-hot-toast';

/**
 * ReviewCard Component
 * Displays individual review with rating, comment, and interaction options
 */
const ReviewCard = ({
    review,
    currentUserId,
    showReviewee = true,
    showSkill = true,
    onUpdate = null,
    className = ''
}) => {
    const [isHelpful, setIsHelpful] = useState(
        review.helpfulness?.helpful?.includes(currentUserId)
    );
    const [isNotHelpful, setIsNotHelpful] = useState(
        review.helpfulness?.notHelpful?.includes(currentUserId)
    );
    const [helpfulCount, setHelpfulCount] = useState(
        review.helpfulness?.helpful?.length || 0
    );
    const [notHelpfulCount, setNotHelpfulCount] = useState(
        review.helpfulness?.notHelpful?.length || 0
    );
    const [showResponse, setShowResponse] = useState(false);
    const [showFlagDialog, setShowFlagDialog] = useState(false);

    const isOwnReview = review.reviewer._id === currentUserId;
    const isReviewee = review.reviewee._id === currentUserId;

    const handleHelpfulness = async (helpful) => {
        try {
            await reviewAPI.markHelpfulness(review._id, helpful);

            // Update local state
            if (helpful) {
                if (isHelpful) {
                    // Remove helpful vote
                    setIsHelpful(false);
                    setHelpfulCount(prev => prev - 1);
                } else {
                    // Add helpful vote, remove not helpful if exists
                    setIsHelpful(true);
                    setHelpfulCount(prev => prev + 1);
                    if (isNotHelpful) {
                        setIsNotHelpful(false);
                        setNotHelpfulCount(prev => prev - 1);
                    }
                }
            } else {
                if (isNotHelpful) {
                    // Remove not helpful vote
                    setIsNotHelpful(false);
                    setNotHelpfulCount(prev => prev - 1);
                } else {
                    // Add not helpful vote, remove helpful if exists
                    setIsNotHelpful(true);
                    setNotHelpfulCount(prev => prev + 1);
                    if (isHelpful) {
                        setIsHelpful(false);
                        setHelpfulCount(prev => prev - 1);
                    }
                }
            }

            if (onUpdate) {
                onUpdate(review._id, { helpful });
            }
        } catch (error) {
            console.error('Error marking helpfulness:', error);
            toast.error('Failed to update helpfulness');
        }
    };

    const handleFlag = async (reason, details) => {
        try {
            await reviewAPI.flagReview(review._id, { reason, details });
            toast.success('Review flagged for moderation');
            setShowFlagDialog(false);
        } catch (error) {
            console.error('Error flagging review:', error);
            toast.error(error.response?.data?.message || 'Failed to flag review');
        }
    };

    return (
        <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <img
                        src={review.reviewer.profileImage || '/default-avatar.png'}
                        alt={`${review.reviewer.firstName} ${review.reviewer.lastName}`}
                        className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                        <h4 className="font-medium text-gray-900">
                            {review.reviewer.firstName} {review.reviewer.lastName}
                        </h4>
                        <p className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <StarRating rating={review.rating} size="sm" showValue />

                    {/* Flag button for non-own reviews */}
                    {!isOwnReview && (
                        <button
                            onClick={() => setShowFlagDialog(true)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Flag review"
                        >
                            <FlagIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Skill and reviewee info */}
            {(showSkill || showReviewee) && (
                <div className="mb-3 text-sm text-gray-600">
                    {showSkill && review.skillReviewed && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                            {review.skillReviewed.name}
                        </span>
                    )}
                    {showReviewee && (
                        <span>
                            Review for {review.reviewee.firstName} {review.reviewee.lastName}
                        </span>
                    )}
                </div>
            )}

            {/* Review comment */}
            <div className="mb-4">
                <p className="text-gray-700 leading-relaxed">{review.comment}</p>
            </div>

            {/* Response from reviewee */}
            {review.response && (
                <div className="mb-4 bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                    <div className="flex items-center mb-2">
                        <ChatBubbleLeftIcon className="w-4 h-4 text-blue-500 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Response</span>
                        <span className="text-xs text-gray-500 ml-2">
                            {formatDistanceToNow(new Date(review.response.respondedAt), { addSuffix: true })}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600">{review.response.comment}</p>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                {/* Helpfulness buttons */}
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => handleHelpfulness(true)}
                        className={`flex items-center space-x-1 text-sm transition-colors ${isHelpful
                                ? 'text-green-600'
                                : 'text-gray-500 hover:text-green-600'
                            }`}
                        disabled={isOwnReview}
                    >
                        {isHelpful ? (
                            <HandThumbUpSolidIcon className="w-4 h-4" />
                        ) : (
                            <HandThumbUpIcon className="w-4 h-4" />
                        )}
                        <span>Helpful ({helpfulCount})</span>
                    </button>

                    <button
                        onClick={() => handleHelpfulness(false)}
                        className={`flex items-center space-x-1 text-sm transition-colors ${isNotHelpful
                                ? 'text-red-600'
                                : 'text-gray-500 hover:text-red-600'
                            }`}
                        disabled={isOwnReview}
                    >
                        {isNotHelpful ? (
                            <HandThumbDownSolidIcon className="w-4 h-4" />
                        ) : (
                            <HandThumbDownIcon className="w-4 h-4" />
                        )}
                        <span>Not helpful ({notHelpfulCount})</span>
                    </button>
                </div>

                {/* Response button for reviewee */}
                {isReviewee && !review.response && (
                    <button
                        onClick={() => setShowResponse(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                        Respond
                    </button>
                )}
            </div>

            {/* Flag Dialog */}
            {showFlagDialog && (
                <FlagDialog
                    onFlag={handleFlag}
                    onCancel={() => setShowFlagDialog(false)}
                />
            )}

            {/* Response Form */}
            {showResponse && (
                <ResponseForm
                    reviewId={review._id}
                    onSubmit={(response) => {
                        // Update review with response
                        if (onUpdate) {
                            onUpdate(review._id, { response });
                        }
                        setShowResponse(false);
                    }}
                    onCancel={() => setShowResponse(false)}
                />
            )}
        </div>
    );
};

/**
 * FlagDialog Component
 * Modal for flagging inappropriate reviews
 */
const FlagDialog = ({ onFlag, onCancel }) => {
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');

    const reasons = [
        { value: 'inappropriate', label: 'Inappropriate content' },
        { value: 'spam', label: 'Spam or promotional' },
        { value: 'fake', label: 'Fake or misleading' },
        { value: 'offensive', label: 'Offensive language' },
        { value: 'other', label: 'Other' }
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (reason) {
            onFlag(reason, details);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Flag Review
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reason for flagging *
                        </label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            required
                        >
                            <option value="">Select a reason</option>
                            {reasons.map(r => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Additional details (optional)
                        </label>
                        <textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Provide more context about why you're flagging this review..."
                            maxLength={500}
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                        >
                            Flag Review
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/**
 * ResponseForm Component
 * Form for reviewees to respond to reviews
 */
const ResponseForm = ({ reviewId, onSubmit, onCancel }) => {
    const [response, setResponse] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (response.trim().length < 5) return;

        setIsSubmitting(true);
        try {
            await reviewAPI.addResponse(reviewId, response.trim());
            toast.success('Response added successfully');
            onSubmit({ comment: response.trim(), respondedAt: new Date() });
        } catch (error) {
            console.error('Error adding response:', error);
            toast.error('Failed to add response');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mt-4 pt-4 border-t border-gray-200">
            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Response
                    </label>
                    <textarea
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Thank the reviewer or provide additional context..."
                        maxLength={500}
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        {response.length}/500 characters
                    </p>
                </div>

                <div className="flex justify-end space-x-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || response.trim().length < 5}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Posting...' : 'Post Response'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ReviewCard;