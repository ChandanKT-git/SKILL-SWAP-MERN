import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    ReviewForm,
    ReviewList,
    RatingDisplay,
    StarRating
} from '../components/reviews';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { reviewAPI, profileAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * Reviews Page
 * Displays user reviews and allows submitting new reviews
 */
const Reviews = () => {
    const { userId } = useParams();
    const { user: currentUser } = useAuth();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [pendingReviews, setPendingReviews] = useState([]);

    useEffect(() => {
        loadUserData();
        if (currentUser) {
            loadPendingReviews();
        }
    }, [userId, currentUser]);

    const loadUserData = async () => {
        try {
            setLoading(true);
            const response = await profileAPI.getUserProfile(userId);
            setUser(response.data);
        } catch (error) {
            console.error('Error loading user:', error);
            toast.error('Failed to load user profile');
        } finally {
            setLoading(false);
        }
    };

    const loadPendingReviews = async () => {
        try {
            const response = await reviewAPI.getPendingReviews();
            setPendingReviews(response.data.reviews || []);
        } catch (error) {
            console.error('Error loading pending reviews:', error);
        }
    };

    const handleReviewSubmit = (review) => {
        setShowReviewForm(false);
        toast.success('Review submitted successfully!');
        // Refresh the reviews list
        window.location.reload();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">User Not Found</h2>
                    <p className="text-gray-600">The user you're looking for doesn't exist.</p>
                </div>
            </div>
        );
    }

    const isOwnProfile = currentUser && currentUser._id === userId;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center space-x-4">
                        <img
                            src={user.profileImage || '/default-avatar.png'}
                            alt={`${user.firstName} ${user.lastName}`}
                            className="w-16 h-16 rounded-full object-cover"
                        />
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {user.firstName} {user.lastName}
                                {isOwnProfile && <span className="text-sm text-gray-500 ml-2">(You)</span>}
                            </h1>
                            <p className="text-gray-600">{user.bio}</p>
                            <div className="mt-2">
                                <RatingDisplay
                                    rating={user.rating?.average || 0}
                                    reviewCount={user.rating?.count || 0}
                                    size="md"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pending Reviews (for current user) */}
                {isOwnProfile && pendingReviews.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Pending Reviews
                        </h2>
                        <p className="text-sm text-gray-600 mb-4">
                            You have {pendingReviews.length} completed session{pendingReviews.length !== 1 ? 's' : ''} waiting for your review.
                        </p>
                        <div className="space-y-3">
                            {pendingReviews.slice(0, 3).map(session => (
                                <div key={session._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                    <div>
                                        <p className="font-medium text-gray-900">{session.skill}</p>
                                        <p className="text-sm text-gray-600">
                                            with {session.provider.firstName} {session.provider.lastName}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowReviewForm(session)}
                                        className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                                    >
                                        Write Review
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Skills Overview */}
                {user.skillsOffered && user.skillsOffered.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Skills Offered
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {user.skillsOffered.map((skill, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Reviews List */}
                <ReviewList
                    userId={userId}
                    currentUserId={currentUser?._id}
                    showFilters={true}
                    showStats={true}
                />

                {/* Review Form Modal */}
                {showReviewForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <ReviewForm
                                session={showReviewForm}
                                reviewee={showReviewForm.provider}
                                onSubmit={handleReviewSubmit}
                                onCancel={() => setShowReviewForm(false)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reviews;