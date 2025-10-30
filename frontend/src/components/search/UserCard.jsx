import React from 'react';
import {
    StarIcon,
    MapPinIcon,
    ClockIcon,
    ChatBubbleLeftRightIcon,
    UserIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';

const UserCard = ({ user, onBookSession, className = "" }) => {
    const navigate = useNavigate();

    const handleViewProfile = () => {
        navigate(`/profile/${user._id}`);
    };

    const handleBookSession = (e) => {
        e.stopPropagation();
        onBookSession(user);
    };

    const handleStartChat = (e) => {
        e.stopPropagation();
        // Navigate to chat with this user
        navigate(`/chat/${user._id}`);
    };

    const renderStars = (rating, count = 0) => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars.push(
                    <StarIconSolid key={i} className="h-4 w-4 text-yellow-400" />
                );
            } else if (i === fullStars && hasHalfStar) {
                stars.push(
                    <div key={i} className="relative">
                        <StarIcon className="h-4 w-4 text-gray-300" />
                        <div className="absolute inset-0 overflow-hidden w-1/2">
                            <StarIconSolid className="h-4 w-4 text-yellow-400" />
                        </div>
                    </div>
                );
            } else {
                stars.push(
                    <StarIcon key={i} className="h-4 w-4 text-gray-300" />
                );
            }
        }

        return (
            <div className="flex items-center space-x-1">
                <div className="flex">{stars}</div>
                <span className="text-sm text-gray-600">
                    {rating.toFixed(1)} ({count} reviews)
                </span>
            </div>
        );
    };

    const getAvailabilityStatus = (availability) => {
        if (!availability || availability.length === 0) {
            return { text: 'Availability not set', color: 'text-gray-500' };
        }

        const now = new Date();
        const currentDay = now.toLocaleLowerCase();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const todayAvailability = availability.find(slot =>
            slot.day.toLowerCase() === currentDay
        );

        if (todayAvailability) {
            const [startHour, startMin] = todayAvailability.startTime.split(':').map(Number);
            const [endHour, endMin] = todayAvailability.endTime.split(':').map(Number);
            const startTime = startHour * 60 + startMin;
            const endTime = endHour * 60 + endMin;

            if (currentTime >= startTime && currentTime <= endTime) {
                return { text: 'Available now', color: 'text-green-600' };
            }
        }

        return { text: 'Available soon', color: 'text-blue-600' };
    };

    const availabilityStatus = getAvailabilityStatus(user.availability);

    return (
        <div
            className={`bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md 
                       transition-shadow cursor-pointer ${className}`}
            onClick={handleViewProfile}
        >
            {/* Header */}
            <div className="flex items-start space-x-4 mb-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    {user.avatar ? (
                        <img
                            src={user.avatar}
                            alt={`${user.firstName} ${user.lastName}`}
                            className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                        />
                    ) : (
                        <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center 
                                      justify-center border-2 border-gray-200">
                            <UserIcon className="h-8 w-8 text-gray-400" />
                        </div>
                    )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {user.firstName} {user.lastName}
                            </h3>
                            {user.title && (
                                <p className="text-sm text-gray-600 truncate">
                                    {user.title}
                                </p>
                            )}
                        </div>

                        {/* Online Status */}
                        {user.isOnline && (
                            <div className="flex items-center space-x-1">
                                <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                                <span className="text-xs text-green-600">Online</span>
                            </div>
                        )}
                    </div>

                    {/* Rating */}
                    {user.rating && user.rating.count > 0 && (
                        <div className="mt-2">
                            {renderStars(user.rating.average, user.rating.count)}
                        </div>
                    )}
                </div>
            </div>

            {/* Bio */}
            {user.bio && (
                <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                    {user.bio}
                </p>
            )}

            {/* Skills */}
            <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Skills Offered</h4>
                <div className="flex flex-wrap gap-2">
                    {user.skillsOffered?.slice(0, 4).map((skill, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full 
                                     text-xs font-medium bg-blue-100 text-blue-800"
                        >
                            {skill}
                        </span>
                    ))}
                    {user.skillsOffered?.length > 4 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full 
                                       text-xs font-medium bg-gray-100 text-gray-600">
                            +{user.skillsOffered.length - 4} more
                        </span>
                    )}
                </div>
            </div>

            {/* Location and Availability */}
            <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <div className="flex items-center space-x-4">
                    {user.location && (
                        <div className="flex items-center space-x-1">
                            <MapPinIcon className="h-4 w-4" />
                            <span>{user.location}</span>
                        </div>
                    )}

                    <div className="flex items-center space-x-1">
                        <ClockIcon className="h-4 w-4" />
                        <span className={availabilityStatus.color}>
                            {availabilityStatus.text}
                        </span>
                    </div>
                </div>

                {user.distance && (
                    <span className="text-gray-500">
                        {user.distance.toFixed(1)} miles away
                    </span>
                )}
            </div>

            {/* Session Stats */}
            {user.sessionStats && (
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                    <span>{user.sessionStats.completed || 0} sessions completed</span>
                    <span>•</span>
                    <span>Response rate: {user.sessionStats.responseRate || 0}%</span>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
                <button
                    onClick={handleBookSession}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md 
                             hover:bg-blue-700 transition-colors text-sm font-medium
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Book Session
                </button>

                <button
                    onClick={handleStartChat}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md 
                             hover:bg-gray-50 transition-colors text-sm font-medium
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

export default UserCard;