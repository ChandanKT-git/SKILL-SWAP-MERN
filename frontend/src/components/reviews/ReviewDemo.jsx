import React, { useState } from 'react';
import {
    StarRating,
    ReviewForm,
    ReviewCard,
    RatingDisplay,
    SkillRatingDisplay,
    RatingBadge
} from './index';

/**
 * ReviewDemo Component
 * Demonstrates all review components with sample data
 */
const ReviewDemo = () => {
    const [selectedRating, setSelectedRating] = useState(0);

    // Sample data
    const sampleSession = {
        _id: 'session123',
        skill: 'React Development',
        scheduledDate: '2024-01-15T10:00:00Z',
        duration: 90,
        type: 'learning'
    };

    const sampleReviewee = {
        _id: 'user123',
        firstName: 'John',
        lastName: 'Doe',
        profileImage: '/default-avatar.png'
    };

    const sampleReview = {
        _id: 'review123',
        rating: 5,
        comment: 'Excellent session! John explained React concepts very clearly and provided practical examples. The hands-on approach really helped me understand hooks and state management better.',
        createdAt: '2024-01-16T14:30:00Z',
        reviewer: {
            _id: 'reviewer123',
            firstName: 'Jane',
            lastName: 'Smith',
            profileImage: '/default-avatar.png'
        },
        reviewee: {
            _id: 'reviewee123',
            firstName: 'John',
            lastName: 'Doe'
        },
        skillReviewed: {
            name: 'React Development',
            category: 'Programming'
        },
        helpfulness: {
            helpful: ['user1', 'user2', 'user3'],
            notHelpful: ['user4']
        },
        response: {
            comment: 'Thank you for the great feedback! I\'m glad the session was helpful.',
            respondedAt: '2024-01-17T09:15:00Z'
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Review & Rating Components Demo
                    </h1>
                    <p className="text-gray-600">
                        Interactive demonstration of all review and rating components
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Star Rating Demo */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Star Rating Component
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Interactive Rating</h3>
                                <StarRating
                                    rating={selectedRating}
                                    interactive={true}
                                    onChange={setSelectedRating}
                                    size="lg"
                                    showValue={true}
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    Click stars to rate (Selected: {selectedRating})
                                </p>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Different Sizes</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-4">
                                        <span className="text-sm w-12">Small:</span>
                                        <StarRating rating={4.2} size="sm" showValue />
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <span className="text-sm w-12">Medium:</span>
                                        <StarRating rating={4.2} size="md" showValue />
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <span className="text-sm w-12">Large:</span>
                                        <StarRating rating={4.2} size="lg" showValue />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Rating Display Demo */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Rating Display Components
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Horizontal Layout</h3>
                                <RatingDisplay
                                    rating={4.7}
                                    reviewCount={23}
                                    layout="horizontal"
                                />
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Vertical Layout</h3>
                                <RatingDisplay
                                    rating={4.7}
                                    reviewCount={23}
                                    layout="vertical"
                                />
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Compact Layout</h3>
                                <RatingDisplay
                                    rating={4.7}
                                    reviewCount={23}
                                    layout="compact"
                                />
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Rating Badges</h3>
                                <div className="flex flex-wrap gap-2">
                                    <RatingBadge rating={4.8} reviewCount={15} variant="success" />
                                    <RatingBadge rating={4.2} reviewCount={8} variant="primary" />
                                    <RatingBadge rating={3.5} reviewCount={12} variant="warning" />
                                    <RatingBadge rating={2.1} reviewCount={3} variant="default" />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Skill Rating</h3>
                                <SkillRatingDisplay
                                    skillName="React Development"
                                    rating={4.6}
                                    reviewCount={18}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Review Form Demo */}
                    <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Review Form Component
                        </h2>

                        <ReviewForm
                            session={sampleSession}
                            reviewee={sampleReviewee}
                            onSubmit={(review) => {
                                console.log('Review submitted:', review);
                                alert('Review submitted! Check console for details.');
                            }}
                            onCancel={() => {
                                console.log('Review cancelled');
                                alert('Review cancelled');
                            }}
                        />
                    </div>

                    {/* Review Card Demo */}
                    <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Review Card Component
                        </h2>

                        <ReviewCard
                            review={sampleReview}
                            currentUserId="currentUser123"
                            showReviewee={true}
                            showSkill={true}
                            onUpdate={(reviewId, updates) => {
                                console.log('Review updated:', reviewId, updates);
                            }}
                        />
                    </div>

                    {/* Responsive Demo */}
                    <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Responsive Design Demo
                        </h2>

                        <p className="text-gray-600 mb-4">
                            All components are designed to be fully responsive. Try resizing your browser window
                            to see how they adapt to different screen sizes.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="p-4 border border-gray-200 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-2">Mobile (< 640px)</h4>
                                <RatingDisplay rating={4.5} reviewCount={12} layout="compact" />
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-2">Tablet (640px - 1024px)</h4>
                                <RatingDisplay rating={4.5} reviewCount={12} layout="horizontal" />
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-2">Desktop (> 1024px)</h4>
                                <RatingDisplay rating={4.5} reviewCount={12} layout="vertical" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewDemo;