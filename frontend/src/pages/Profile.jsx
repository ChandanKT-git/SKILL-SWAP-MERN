import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUserProfile } from '../hooks/useApi';
import ProfileView from '../components/profile/ProfileView';
import LoadingSpinner from '../components/common/LoadingSpinner';

function Profile() {
    const { userId } = useParams();
    const { user: currentUser } = useAuth();

    // If no userId in params, show current user's profile
    const isOwnProfile = !userId || userId === currentUser?._id;

    // Use different hooks based on whether it's own profile or another user's
    const { data: profileUser, isLoading } = useUserProfile(
        isOwnProfile ? null : userId
    );

    // For own profile, use current user data
    const user = isOwnProfile ? currentUser : profileUser?.data;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-center items-center py-12">
                        <LoadingSpinner size="lg" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <ProfileView
                    user={user}
                    isOwnProfile={isOwnProfile}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
}

export default Profile;