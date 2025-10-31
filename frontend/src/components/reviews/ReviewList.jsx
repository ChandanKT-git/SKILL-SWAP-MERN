import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, FunnelIcon } from '@heroicons/react/24/outline';
import ReviewCard from './ReviewCard';
import StarRating from './StarRating';
import LoadingSpinner from '../common/LoadingSpinner';
import { reviewAPI } from '../../utils/api';
import toast from 'react-hot-toast';

/**
 * ReviewList Component
 * Displays a list of reviews with filtering and sorting options
 */
const ReviewList = ({
    userId,
    currentUserId,
    showFilters = true,
    showStats = true,
    className = ''
}) => {
    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        sortBy: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        limit: 10
    });
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Load reviews and stats
    useEffect(() => {
        loadReviews(true);
        if (showStats) {
            loadStats();
        }
    }, [userId, filters.sortBy, filters.sortOrder]);

    const loadReviews = async (reset = false) => {
        try {
            if (reset) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const params = {
                ...filters,
                page: reset ? 1 : filters.page
            };

            const response = await reviewAPI.getUserReviews(userId, params);
            const newReviews = response.data.reviews || [];

            if (reset) {
                setReviews(newReviews);
                setFilters(prev => ({ ...prev, page: 1 }));
            } else {
                setReviews(prev => [...prev, ...newReviews]);
            }

            setHasMore(newReviews.length === filters.limit);
        } catch (error) {
            console.error('Error loading reviews:', error);
            toast.error('Failed to load reviews');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await reviewAPI.getUserRatingStats(userId);
            setStats(response.data);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const handleSortChange = (sortBy, sortOrder) => {
        setFilters(prev => ({
            ...prev,
            sortBy,
            sortOrder,
            page: 1
        }));
    };

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            setFilters(prev => ({
                ...prev,
                page: prev.page + 1
            }));
            loadReviews(false);
        }
    };

    const handleReviewUpdate = (reviewId, updates) => {
        setReviews(prev => prev.map(review =>
            review._id === reviewId
                ? { ...review, ...updates }
                : review
        ));
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Stats Section */}
            {showStats && stats && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Rating Overview
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Overall Rating */}
                        <div className="text-center">
                            <div className="text-3xl font-bold text-gray-900 mb-2">
                                {stats.averageRating.toFixed(1)}
                            </div>
                            <StarRating
                                rating={stats.averageRating}
                                size="lg"
                                className="justify-center mb-2"
                            />
                            <p className="text-sm text-gray-600">
                                Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
                            </p>
                        </div>

                        {/* Rating Distribution */}
                        <div className="space-y-2">
                            {[5, 4, 3, 2, 1].map(rating => {
                                const count = stats.ratingDistribution[rating] || 0;
                                const percentage = stats.totalReviews > 0
                                    ? (count / stats.totalReviews) * 100
                                    : 0;

                                return (
                                    <div key={rating} className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-gray-700 w-8">
                                            {rating}★
                                        </span>
                                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <span className="text-sm text-gray-600 w-8">
                                            {count}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters and Sorting */}
            {showFilters && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center space-x-2">
                            <FunnelIcon className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">
                                Sort by:
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <SortButton
                                active={filters.sortBy === 'createdAt' && filters.sortOrder === 'desc'}
                                onClick={() => handleSortChange('createdAt', 'desc')}
                            >
                                Newest First
                            </SortButton>
                            <SortButton
                                active={filters.sortBy === 'createdAt' && filters.sortOrder === 'asc'}
                                onClick={() => handleSortChange('createdAt', 'asc')}
                            >
                                Oldest First
                            </SortButton>
                            <SortButton
                                active={filters.sortBy === 'rating' && filters.sortOrder === 'desc'}
                                onClick={() => handleSortChange('rating', 'desc')}
                            >
                                Highest Rated
                            </SortButton>
                            <SortButton
                                active={filters.sortBy === 'rating' && filters.sortOrder === 'asc'}
                                onClick={() => handleSortChange('rating', 'asc')}
                            >
                                Lowest Rated
                            </SortButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Reviews List */}
            <div className="space-y-4">
                {reviews.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-gray-400 mb-4">
                            <StarRating rating={0} size="xl" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No reviews yet
                        </h3>
                        <p className="text-gray-600">
                            This user hasn't received any reviews yet.
                        </p>
                    </div>
                ) : (
                    <>
                        {reviews.map(review => (
                            <ReviewCard
                                key={review._id}
                                review={review}
                                currentUserId={currentUserId}
                                onUpdate={handleReviewUpdate}
                                showReviewee={false}
                            />
                        ))}

                        {/* Load More Button */}
                        {hasMore && (
                            <div className="text-center pt-4">
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loadingMore ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                                            Loading...
                                        </>
                                    ) : (
                                        <>
                                            Load More Reviews
                                            <ChevronDownIcon className="ml-2 w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

/**
 * SortButton Component
 * Reusable button for sorting options
 */
const SortButton = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${active
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
    >
        {children}
    </button>
);

export default ReviewList;