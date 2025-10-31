import React from 'react';
import StarRating from './StarRating';

/**
 * RatingDisplay Component
 * Displays user rating information in various formats
 */
const RatingDisplay = ({
    rating = 0,
    reviewCount = 0,
    size = 'md',
    layout = 'horizontal',
    showCount = true,
    showLabel = true,
    className = ''
}) => {
    const formatRating = (rating) => {
        if (rating === 0) return '0.0';
        return rating.toFixed(1);
    };

    const getRatingText = (rating) => {
        if (rating === 0) return 'No ratings yet';
        if (rating < 2) return 'Poor';
        if (rating < 3) return 'Fair';
        if (rating < 4) return 'Good';
        if (rating < 4.5) return 'Very Good';
        return 'Excellent';
    };

    if (layout === 'vertical') {
        return (
            <div className={`text-center ${className}`}>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                    {formatRating(rating)}
                </div>
                <StarRating
                    rating={rating}
                    size={size}
                    className="justify-center mb-1"
                />
                {showCount && (
                    <p className="text-sm text-gray-600">
                        {reviewCount} review{reviewCount !== 1 ? 's' : ''}
                    </p>
                )}
                {showLabel && (
                    <p className="text-xs text-gray-500 mt-1">
                        {getRatingText(rating)}
                    </p>
                )}
            </div>
        );
    }

    if (layout === 'compact') {
        return (
            <div className={`flex items-center space-x-1 ${className}`}>
                <StarRating rating={rating} size="sm" />
                <span className="text-sm font-medium text-gray-700">
                    {formatRating(rating)}
                </span>
                {showCount && (
                    <span className="text-sm text-gray-500">
                        ({reviewCount})
                    </span>
                )}
            </div>
        );
    }

    // Default horizontal layout
    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            <StarRating rating={rating} size={size} />
            <div className="flex items-center space-x-1">
                <span className="text-sm font-medium text-gray-700">
                    {formatRating(rating)}
                </span>
                {showCount && (
                    <span className="text-sm text-gray-500">
                        ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
                    </span>
                )}
            </div>
            {showLabel && (
                <span className="text-sm text-gray-500">
                    • {getRatingText(rating)}
                </span>
            )}
        </div>
    );
};

/**
 * SkillRatingDisplay Component
 * Displays rating for a specific skill
 */
export const SkillRatingDisplay = ({
    skillName,
    rating = 0,
    reviewCount = 0,
    className = ''
}) => {
    return (
        <div className={`bg-gray-50 rounded-lg p-3 ${className}`}>
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">{skillName}</h4>
                <span className="text-sm font-medium text-gray-700">
                    {rating.toFixed(1)}
                </span>
            </div>
            <div className="flex items-center justify-between">
                <StarRating rating={rating} size="sm" />
                <span className="text-xs text-gray-500">
                    {reviewCount} review{reviewCount !== 1 ? 's' : ''}
                </span>
            </div>
        </div>
    );
};

/**
 * RatingBadge Component
 * Small badge showing rating for use in cards or lists
 */
export const RatingBadge = ({
    rating = 0,
    reviewCount = 0,
    variant = 'default',
    className = ''
}) => {
    const variants = {
        default: 'bg-white border border-gray-200 text-gray-700',
        primary: 'bg-blue-50 border border-blue-200 text-blue-700',
        success: 'bg-green-50 border border-green-200 text-green-700',
        warning: 'bg-yellow-50 border border-yellow-200 text-yellow-700'
    };

    const getVariantByRating = (rating) => {
        if (rating >= 4.5) return 'success';
        if (rating >= 4) return 'primary';
        if (rating >= 3) return 'warning';
        return 'default';
    };

    const badgeVariant = variant === 'auto' ? getVariantByRating(rating) : variant;

    return (
        <div className={`
            inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium
            ${variants[badgeVariant]} ${className}
        `}>
            <StarRating rating={rating} size="sm" />
            <span>{rating.toFixed(1)}</span>
            {reviewCount > 0 && (
                <span className="opacity-75">({reviewCount})</span>
            )}
        </div>
    );
};

export default RatingDisplay;