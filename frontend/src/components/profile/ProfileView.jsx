import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getInitials, formatDate, getAvatarColor } from '../../utils/helpers';
import { SKILL_LEVEL_LABELS } from '../../utils/constants';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';

function ProfileView({ user: profileUser, isOwnProfile = false, isLoading = false }) {
    const { user: currentUser } = useAuth();
    const user = profileUser || currentUser;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Profile not found</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Profile Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 h-32 sm:h-40"></div>
                <div className="relative px-6 pb-6">
                    {/* Avatar */}
                    <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6">
                        <div className="relative -mt-16 sm:-mt-20">
                            {user.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={`${user.firstName} ${user.lastName}`}
                                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white bg-white object-cover"
                                />
                            ) : (
                                <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white ${getAvatarColor(user.email)} flex items-center justify-center`}>
                                    <span className="text-white text-2xl sm:text-3xl font-bold">
                                        {getInitials(user.firstName, user.lastName)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 sm:mt-0 flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                                        {user.firstName} {user.lastName}
                                    </h1>
                                    {user.location && (
                                        <p className="text-gray-600 flex items-center mt-1">
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            {user.location}
                                        </p>
                                    )}
                                </div>

                                {isOwnProfile && (
                                    <div className="mt-4 sm:mt-0">
                                        <Link to="/profile/edit">
                                            <Button variant="outline" size="sm">
                                                Edit Profile
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Rating */}
                            {user.rating && user.rating.count > 0 && (
                                <div className="flex items-center mt-3">
                                    <div className="flex items-center">
                                        {[...Array(5)].map((_, i) => (
                                            <svg
                                                key={i}
                                                className={`w-5 h-5 ${i < Math.floor(user.rating.average)
                                                    ? 'text-yellow-400'
                                                    : 'text-gray-300'
                                                    }`}
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>
                                    <span className="ml-2 text-sm text-gray-600">
                                        {user.rating.average.toFixed(1)} ({user.rating.count} reviews)
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bio */}
                    {user.bio && (
                        <div className="mt-6">
                            <p className="text-gray-700 leading-relaxed">{user.bio}</p>
                        </div>
                    )}

                    {/* Member since */}
                    <div className="mt-4 text-sm text-gray-500">
                        Member since {formatDate(user.createdAt)}
                    </div>
                </div>
            </div>

            {/* Skills Section */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Skills Offered */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Skills I Offer</h2>
                        {isOwnProfile && (
                            <Link to="/profile/skills">
                                <Button variant="ghost" size="sm">
                                    Manage
                                </Button>
                            </Link>
                        )}
                    </div>

                    {user.skills && user.skills.length > 0 ? (
                        <div className="space-y-3">
                            {user.skills.map((skill, index) => (
                                <div key={skill._id || index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg space-y-2 sm:space-y-0">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <h3 className="font-medium text-gray-900">{skill.name}</h3>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${skill.level === 'expert' ? 'bg-purple-100 text-purple-800' :
                                                skill.level === 'advanced' ? 'bg-blue-100 text-blue-800' :
                                                    skill.level === 'intermediate' ? 'bg-green-100 text-green-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {SKILL_LEVEL_LABELS[skill.level]}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">{skill.category}</p>
                                        {skill.description && (
                                            <p className="text-sm text-gray-500 mt-1">{skill.description}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <p className="mt-2 text-sm text-gray-500">
                                {isOwnProfile ? 'Add your first skill to get started' : 'No skills listed yet'}
                            </p>
                            {isOwnProfile && (
                                <Link to="/profile/skills" className="mt-2 inline-block">
                                    <Button size="sm">Add Skills</Button>
                                </Link>
                            )}
                        </div>
                    )}
                </div>

                {/* Skills Wanted */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills I Want to Learn</h2>

                    {user.skillsWanted && user.skillsWanted.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {user.skillsWanted.map((skill, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <p className="mt-2 text-sm text-gray-500">
                                {isOwnProfile ? 'Add skills you want to learn' : 'No learning interests listed yet'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons for Other Users */}
            {!isOwnProfile && (
                <div className="mt-8 flex justify-center space-x-4">
                    <Button>
                        Request Session
                    </Button>
                    <Button variant="outline">
                        Send Message
                    </Button>
                </div>
            )}
        </div>
    );
}

export default ProfileView;