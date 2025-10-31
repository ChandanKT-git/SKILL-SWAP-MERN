import React, { useState } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';

/**
 * StarRating Component
 * Displays and allows interaction with star ratings
 */
const StarRating = ({
    rating = 0,
    maxRating = 5,
    size = 'md',
    interactive = false,
    onChange = null,
    showValue = false,
    className = ''
}) => {
    const [hoverRating, setHoverRating] = useState(0);

    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
        xl: 'w-8 h-8'
    };

    const handleClick = (value) => {
        if (interactive && onChange) {
            onChange(value);
        }
    };

    const handleMouseEnter = (value) => {
        if (interactive) {
            setHoverRating(value);
        }
    };

    const handleMouseLeave = () => {
        if (interactive) {
            setHoverRating(0);
        }
    };

    const displayRating = interactive ? (hoverRating || rating) : rating;

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            <div className="flex items-center">
                {[...Array(maxRating)].map((_, index) => {
                    const starValue = index + 1;
                    const isFilled = starValue <= displayRating;

                    return (
                        <button
                            key={index}
                            type="button"
                            className={`
                                ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
                                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded
                            `}
                            onClick={() => handleClick(starValue)}
                            onMouseEnter={() => handleMouseEnter(starValue)}
                            onMouseLeave={handleMouseLeave}
                            disabled={!interactive}
                            aria-label={`${starValue} star${starValue !== 1 ? 's' : ''}`}
                        >
                            {isFilled ? (
                                <StarIcon
                                    className={`${sizes[size]} text-yellow-400 drop-shadow-sm`}
                                />
                            ) : (
                                <StarOutlineIcon
                                    className={`${sizes[size]} text-gray-300 hover:text-yellow-200 transition-colors`}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {showValue && (
                <span className="ml-2 text-sm font-medium text-gray-700">
                    {rating.toFixed(1)}
                </span>
            )}
        </div>
    );
};

export default StarRating;