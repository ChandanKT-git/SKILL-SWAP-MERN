import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import LoadingSpinner from '../common/LoadingSpinner';
import {
    UsersIcon,
    ChartBarIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
    ArrowTrendingUpIcon as TrendingUpIcon,
    ArrowTrendingDownIcon as TrendingDownIcon
} from '@heroicons/react/24/outline';

const AdminDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getDashboardStats();
            setDashboardData(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Error</h3>
                        <p className="mt-1 text-sm text-red-700">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    const { overview, recentActivity } = dashboardData;

    const stats = [
        {
            name: 'Total Users',
            value: overview.totalUsers,
            change: overview.userGrowthRate,
            changeType: overview.userGrowthRate >= 0 ? 'increase' : 'decrease',
            icon: UsersIcon,
        },
        {
            name: 'Active Users',
            value: overview.activeUsers,
            change: null,
            changeType: null,
            icon: CheckCircleIcon,
        },
        {
            name: 'Total Sessions',
            value: overview.totalSessions,
            change: overview.sessionGrowthRate,
            changeType: overview.sessionGrowthRate >= 0 ? 'increase' : 'decrease',
            icon: ClockIcon,
        },
        {
            name: 'Completed Sessions',
            value: overview.completedSessions,
            change: null,
            changeType: null,
            icon: CheckCircleIcon,
        },
        {
            name: 'Total Reviews',
            value: overview.totalReviews,
            change: null,
            changeType: null,
            icon: ChartBarIcon,
        },
        {
            name: 'Flagged Reviews',
            value: overview.flaggedReviews,
            change: null,
            changeType: null,
            icon: ExclamationTriangleIcon,
            alert: overview.flaggedReviews > 0,
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-gray-200 pb-4">
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Overview of platform activity and key metrics
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {stats.map((stat) => (
                    <div
                        key={stat.name}
                        className={`relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow ${stat.alert ? 'ring-2 ring-red-500' : ''
                            }`}
                    >
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <stat.icon
                                    className={`h-6 w-6 ${stat.alert ? 'text-red-600' : 'text-gray-400'
                                        }`}
                                />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        {stat.name}
                                    </dt>
                                    <dd className="flex items-baseline">
                                        <div className="text-2xl font-semibold text-gray-900">
                                            {stat.value.toLocaleString()}
                                        </div>
                                        {stat.change !== null && (
                                            <div
                                                className={`ml-2 flex items-baseline text-sm font-semibold ${stat.changeType === 'increase'
                                                    ? 'text-green-600'
                                                    : 'text-red-600'
                                                    }`}
                                            >
                                                {stat.changeType === 'increase' ? (
                                                    <TrendingUpIcon className="h-4 w-4 flex-shrink-0 self-center" />
                                                ) : (
                                                    <TrendingDownIcon className="h-4 w-4 flex-shrink-0 self-center" />
                                                )}
                                                <span className="ml-1">
                                                    {Math.abs(stat.change)}%
                                                </span>
                                            </div>
                                        )}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Recent Users */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Recent Users
                        </h3>
                        <div className="space-y-3">
                            {recentActivity.recentUsers.map((user) => (
                                <div key={user._id} className="flex items-center space-x-3">
                                    <div className="flex-shrink-0">
                                        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                            <span className="text-sm font-medium text-gray-700">
                                                {user.firstName.charAt(0)}
                                                {user.lastName.charAt(0)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {user.firstName} {user.lastName}
                                        </p>
                                        <p className="text-sm text-gray-500 truncate">
                                            {user.email}
                                        </p>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Sessions */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Recent Sessions
                        </h3>
                        <div className="space-y-3">
                            {recentActivity.recentSessions.map((session) => (
                                <div key={session._id} className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {session.requester?.firstName} {session.requester?.lastName} →{' '}
                                            {session.provider?.firstName} {session.provider?.lastName}
                                        </p>
                                        <p className="text-sm text-gray-500 truncate">
                                            {session.skill?.name || 'Unknown Skill'}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${session.status === 'completed'
                                                ? 'bg-green-100 text-green-800'
                                                : session.status === 'accepted'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : session.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}
                                        >
                                            {session.status}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            {new Date(session.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;