import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import SessionList from '../components/sessions/SessionList';
import Button from '../components/common/Button';
import { cn } from '../utils/helpers';

function Sessions() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('all');

    const tabs = [
        { id: 'all', label: 'All Sessions', type: 'all' },
        { id: 'requested', label: 'My Requests', type: 'requested' },
        { id: 'received', label: 'Received Requests', type: 'received' },
        { id: 'upcoming', label: 'Upcoming', type: 'all', upcoming: true }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">My Sessions</h1>
                    <p className="text-gray-600 mt-2">
                        Manage your skill exchange sessions and requests
                    </p>
                </div>

                {/* Tabs */}
                <div className="mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                                        activeTab === tab.id
                                            ? 'border-primary-500 text-primary-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Session List */}
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-6">
                        {activeTab === 'upcoming' ? (
                            <SessionList
                                type="all"
                                showFilters={false}
                                key={`${activeTab}-upcoming`}
                                initialFilters={{ upcoming: true }}
                            />
                        ) : (
                            <SessionList
                                type={tabs.find(tab => tab.id === activeTab)?.type || 'all'}
                                showFilters={true}
                                key={activeTab}
                            />
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border border-gray-200 rounded-lg">
                            <h3 className="font-medium text-gray-900 mb-2">Find Skills to Learn</h3>
                            <p className="text-sm text-gray-600 mb-3">
                                Browse available skills and book sessions with experts
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.location.href = '/search'}
                            >
                                Browse Skills
                            </Button>
                        </div>

                        <div className="p-4 border border-gray-200 rounded-lg">
                            <h3 className="font-medium text-gray-900 mb-2">Update Your Profile</h3>
                            <p className="text-sm text-gray-600 mb-3">
                                Add new skills you can teach or update your availability
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.location.href = '/profile/edit'}
                            >
                                Edit Profile
                            </Button>
                        </div>

                        <div className="p-4 border border-gray-200 rounded-lg">
                            <h3 className="font-medium text-gray-900 mb-2">Session Statistics</h3>
                            <p className="text-sm text-gray-600 mb-3">
                                View your session history and performance metrics
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    // This would navigate to a stats page - placeholder for now
                                    alert('Session statistics feature coming soon!');
                                }}
                            >
                                View Stats
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Sessions;