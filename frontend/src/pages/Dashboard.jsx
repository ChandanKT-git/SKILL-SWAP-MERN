import React from 'react';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        Welcome to your Dashboard, {user?.firstName}!
                    </h1>
                    <p className="text-gray-600">
                        This is your personalized dashboard where you can manage your skills,
                        sessions, and connect with other learners.
                    </p>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-primary-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-primary-900 mb-2">
                                My Skills
                            </h3>
                            <p className="text-primary-700">
                                Manage the skills you offer and want to learn.
                            </p>
                        </div>

                        <div className="bg-green-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-green-900 mb-2">
                                Sessions
                            </h3>
                            <p className="text-green-700">
                                View and manage your upcoming skill exchange sessions.
                            </p>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">
                                Find Skills
                            </h3>
                            <p className="text-blue-700">
                                Discover new skills and connect with other learners.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;