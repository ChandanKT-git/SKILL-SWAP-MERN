import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import LoadingSpinner from '../common/LoadingSpinner';
import {
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XCircleIcon,
    EyeIcon,
    FlagIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ContentModeration = () => {
    const [flaggedReviews, setFlaggedReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({});
    const [filters, setFilters] = useState({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
    });
    const [selectedReview, setSelectedReview] = useState(null);
    const [showReviewDetails, setShowReviewDetails] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [moderationReason, setModerationReason] = useState('');

    useEffect(() => {
        fetchFlaggedReviews();
    }, [filters]);

    const fetchFlaggedReviews = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getFlaggedReviews(filters);
            setFlaggedReviews(response.data.data.reviews);
            setPagination(response.data.data.pagination);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load flagged reviews');
        } finally {
            setLoading(false);
        }
    };

    const moderateReview = async (reviewId, action, reason = '') => {
        try {
            setActionLoading(reviewId);
            await adminAPI.moderateReview(reviewId, { action, reason });

            const actionMessages = {
                approve: 'Review approved and unflagged',
                remove: 'Review removed from platform',
                warn: 'Review flagged with warning'
            };

            toast.success(actionMessages[action]);
            fetchFlaggedReviews(); // Refresh the list

            if (selectedReview && selectedReview._id === reviewId) {
                setShowReviewDetails(false);
                setSelectedReview(null);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to moderate review');
        } finally {
            setActionLoading(null);
            setModerationReason('');
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: key !== 'page' ? 1 : value
        }));
    };

    const openReviewDetails = (review) => {
        setSelectedReview(review);
        setShowReviewDetails(true);
    };

    const getStarRating = (rating) => {
        return (
            <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                        key={star}
                        className={`h-4 w-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
                <span className="ml-1 text-sm text-gray-600">({rating})</span>
            </div>
        );
    };

    if (loading && flaggedReviews.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-gray-200 pb-4">
                <h1 className="text-2xl font-bold text-gray-900">Content Moderation</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Review and moderate flagged content to maintain community standards
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <FlagIcon className="h-6 w-6 text-red-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Flagged Reviews
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {pagination.totalFlagged || 0}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <select
                        value={`${filters.sortBy}-${filters.sortOrder}`}
                        onChange={(e) => {
                            const [sortBy, sortOrder] = e.target.value.split('-');
                            handleFilterChange('sortBy', sortBy);
                            handleFilterChange('sortOrder', sortOrder);
                        }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                        <option value="createdAt-desc">Newest First</option>
                        <option value="createdAt-asc">Oldest First</option>
                        <option value="rating-desc">Highest Rating</option>
                        <option value="rating-asc">Lowest Rating</option>
                    </select>
                </div>
            </div>

            {/* Flagged Reviews */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                {flaggedReviews.length === 0 ? (
                    <div className="text-center py-12">
                        <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No flagged reviews</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            All reviews are currently in good standing.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Review
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Reviewer
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Reviewee
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Rating
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {flaggedReviews.map((review) => (
                                        <tr key={review._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="max-w-xs">
                                                    <p className="text-sm text-gray-900 truncate">
                                                        {review.comment || 'No comment provided'}
                                                    </p>
                                                    <div className="flex items-center mt-1">
                                                        <FlagIcon className="h-4 w-4 text-red-400 mr-1" />
                                                        <span className="text-xs text-red-600">Flagged</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-8 w-8">
                                                        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                                            <span className="text-xs font-medium text-gray-700">
                                                                {review.reviewer?.firstName?.charAt(0)}
                                                                {review.reviewer?.lastName?.charAt(0)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {review.reviewer?.firstName} {review.reviewer?.lastName}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {review.reviewer?.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-8 w-8">
                                                        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                                            <span className="text-xs font-medium text-gray-700">
                                                                {review.reviewee?.firstName?.charAt(0)}
                                                                {review.reviewee?.lastName?.charAt(0)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {review.reviewee?.firstName} {review.reviewee?.lastName}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {review.reviewee?.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStarRating(review.rating)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(review.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button
                                                        onClick={() => openReviewDetails(review)}
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                        title="View Details"
                                                    >
                                                        <EyeIcon className="h-4 w-4" />
                                                    </button>

                                                    <button
                                                        onClick={() => moderateReview(review._id, 'approve')}
                                                        disabled={actionLoading === review._id}
                                                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                                        title="Approve"
                                                    >
                                                        {actionLoading === review._id ? (
                                                            <LoadingSpinner size="sm" />
                                                        ) : (
                                                            <CheckCircleIcon className="h-4 w-4" />
                                                        )}
                                                    </button>

                                                    <button
                                                        onClick={() => moderateReview(review._id, 'remove')}
                                                        disabled={actionLoading === review._id}
                                                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                                        title="Remove"
                                                    >
                                                        {actionLoading === review._id ? (
                                                            <LoadingSpinner size="sm" />
                                                        ) : (
                                                            <XCircleIcon className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                <div className="flex-1 flex justify-between sm:hidden">
                                    <button
                                        onClick={() => handleFilterChange('page', pagination.currentPage - 1)}
                                        disabled={!pagination.hasPrev}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => handleFilterChange('page', pagination.currentPage + 1)}
                                        disabled={!pagination.hasNext}
                                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Showing{' '}
                                            <span className="font-medium">
                                                {(pagination.currentPage - 1) * filters.limit + 1}
                                            </span>{' '}
                                            to{' '}
                                            <span className="font-medium">
                                                {Math.min(pagination.currentPage * filters.limit, pagination.totalFlagged)}
                                            </span>{' '}
                                            of{' '}
                                            <span className="font-medium">{pagination.totalFlagged}</span> results
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                            <button
                                                onClick={() => handleFilterChange('page', pagination.currentPage - 1)}
                                                disabled={!pagination.hasPrev}
                                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => handleFilterChange('page', pagination.currentPage + 1)}
                                                disabled={!pagination.hasNext}
                                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                Next
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Review Details Modal */}
            {showReviewDetails && selectedReview && (
                <ReviewDetailsModal
                    review={selectedReview}
                    onClose={() => setShowReviewDetails(false)}
                    onModerate={moderateReview}
                    moderationReason={moderationReason}
                    setModerationReason={setModerationReason}
                />
            )}
        </div>
    );
};

// Review Details Modal Component
const ReviewDetailsModal = ({ review, onClose, onModerate, moderationReason, setModerationReason }) => {
    const [selectedAction, setSelectedAction] = useState('');

    const handleModerate = () => {
        if (selectedAction) {
            onModerate(review._id, selectedAction, moderationReason);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Review Details</h3>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <span className="sr-only">Close</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Review Info */}
                            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                                <div className="flex">
                                    <FlagIcon className="h-5 w-5 text-red-400" />
                                    <div className="ml-3">
                                        <h4 className="text-sm font-medium text-red-800">Flagged Review</h4>
                                        <p className="mt-1 text-sm text-red-700">
                                            This review has been flagged for violating community guidelines.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Reviewer and Reviewee */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h5 className="text-sm font-medium text-gray-500 mb-2">Reviewer</h5>
                                    <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                            <span className="text-sm font-medium text-gray-700">
                                                {review.reviewer?.firstName?.charAt(0)}
                                                {review.reviewer?.lastName?.charAt(0)}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {review.reviewer?.firstName} {review.reviewer?.lastName}
                                            </p>
                                            <p className="text-sm text-gray-500">{review.reviewer?.email}</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h5 className="text-sm font-medium text-gray-500 mb-2">Reviewee</h5>
                                    <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                            <span className="text-sm font-medium text-gray-700">
                                                {review.reviewee?.firstName?.charAt(0)}
                                                {review.reviewee?.lastName?.charAt(0)}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {review.reviewee?.firstName} {review.reviewee?.lastName}
                                            </p>
                                            <p className="text-sm text-gray-500">{review.reviewee?.email}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Review Content */}
                            <div>
                                <h5 className="text-sm font-medium text-gray-500 mb-2">Review Content</h5>
                                <div className="bg-gray-50 rounded-md p-4">
                                    <div className="flex items-center mb-2">
                                        <div className="flex items-center">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <svg
                                                    key={star}
                                                    className={`h-5 w-5 ${star <= review.rating ? 'text-yellow-400' : 'text-gray-300'
                                                        }`}
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            ))}
                                            <span className="ml-2 text-sm text-gray-600">({review.rating}/5)</span>
                                        </div>
                                        <span className="ml-auto text-sm text-gray-500">
                                            {new Date(review.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-900">
                                        {review.comment || 'No comment provided'}
                                    </p>
                                </div>
                            </div>

                            {/* Moderation Actions */}
                            <div>
                                <h5 className="text-sm font-medium text-gray-500 mb-2">Moderation Action</h5>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-3">
                                        <input
                                            id="approve"
                                            name="action"
                                            type="radio"
                                            value="approve"
                                            checked={selectedAction === 'approve'}
                                            onChange={(e) => setSelectedAction(e.target.value)}
                                            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                        />
                                        <label htmlFor="approve" className="text-sm text-gray-900">
                                            <span className="font-medium text-green-600">Approve</span> - Remove flag and keep review visible
                                        </label>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <input
                                            id="warn"
                                            name="action"
                                            type="radio"
                                            value="warn"
                                            checked={selectedAction === 'warn'}
                                            onChange={(e) => setSelectedAction(e.target.value)}
                                            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                        />
                                        <label htmlFor="warn" className="text-sm text-gray-900">
                                            <span className="font-medium text-yellow-600">Warn</span> - Send warning to reviewer and unflag
                                        </label>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <input
                                            id="remove"
                                            name="action"
                                            type="radio"
                                            value="remove"
                                            checked={selectedAction === 'remove'}
                                            onChange={(e) => setSelectedAction(e.target.value)}
                                            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                        />
                                        <label htmlFor="remove" className="text-sm text-gray-900">
                                            <span className="font-medium text-red-600">Remove</span> - Hide review from platform
                                        </label>
                                    </div>
                                </div>

                                {selectedAction && (
                                    <div className="mt-3">
                                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                                            Reason (optional)
                                        </label>
                                        <textarea
                                            id="reason"
                                            rows={3}
                                            value={moderationReason}
                                            onChange={(e) => setModerationReason(e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            placeholder="Provide a reason for this moderation action..."
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            onClick={handleModerate}
                            disabled={!selectedAction}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Apply Action
                        </button>
                        <button
                            onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContentModeration;