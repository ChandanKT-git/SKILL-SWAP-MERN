import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import LoadingSpinner from '../common/LoadingSpinner';
import {
    ChartBarIcon,
    UsersIcon,
    ClockIcon,
    ArrowTrendingUpIcon as TrendingUpIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const AdminAnalytics = () => {
    const [analytics, setAnalytics] = useState(null);
    const [systemHealth, setSystemHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState('30d');
    const [exportLoading, setExportLoading] = useState(false);

    useEffect(() => {
        fetchAnalytics();
        fetchSystemHealth();
    }, [selectedPeriod]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getAnalytics({ period: selectedPeriod });
            setAnalytics(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    const fetchSystemHealth = async () => {
        try {
            const response = await adminAPI.getSystemHealth();
            setSystemHealth(response.data.data);
        } catch (err) {
            console.error('Failed to load system health:', err);
        }
    };

    const exportUserData = async (format = 'json') => {
        try {
            setExportLoading(true);
            const response = await adminAPI.exportUserData({ format });

            if (format === 'csv') {
                // Handle CSV download
                const blob = new Blob([response.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                // Handle JSON download
                const blob = new Blob([JSON.stringify(response.data.data, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `users-export-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setExportLoading(false);
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatUptime = (seconds) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    };

    if (loading && !analytics) {
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
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Error</h3>
                        <p className="mt-1 text-sm text-red-700">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-gray-200 pb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Platform insights and performance metrics
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 90 days</option>
                            <option value="1y">Last year</option>
                        </select>
                        <div className="relative">
                            <button
                                onClick={() => document.getElementById('export-menu').classList.toggle('hidden')}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                disabled={exportLoading}
                            >
                                {exportLoading ? (
                                    <LoadingSpinner size="sm" />
                                ) : (
                                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                                )}
                                Export
                            </button>
                            <div id="export-menu" className="hidden absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                <div className="py-1">
                                    <button
                                        onClick={() => exportUserData('json')}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Export as JSON
                                    </button>
                                    <button
                                        onClick={() => exportUserData('csv')}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Export as CSV
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {analytics && (
                <>
                    {/* Engagement Metrics */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <UsersIcon className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">
                                                Total Users
                                            </dt>
                                            <dd className="text-lg font-medium text-gray-900">
                                                {analytics.engagement.totalUsers}
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <TrendingUpIcon className="h-6 w-6 text-green-400" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">
                                                Verified Users
                                            </dt>
                                            <dd className="text-lg font-medium text-gray-900">
                                                {analytics.engagement.verifiedUsers}
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <ClockIcon className="h-6 w-6 text-blue-400" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">
                                                Active Users
                                            </dt>
                                            <dd className="text-lg font-medium text-gray-900">
                                                {analytics.engagement.activeUsers}
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <ChartBarIcon className="h-6 w-6 text-purple-400" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">
                                                Engagement Rate
                                            </dt>
                                            <dd className="text-lg font-medium text-gray-900">
                                                {analytics.engagement.totalUsers > 0
                                                    ? ((analytics.engagement.activeUsers / analytics.engagement.totalUsers) * 100).toFixed(1)
                                                    : 0
                                                }%
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* User Growth Chart */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">User Growth</h3>
                            <div className="space-y-3">
                                {analytics.userGrowth.map((data, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">
                                            {data._id.year}-{String(data._id.month).padStart(2, '0')}-{String(data._id.day).padStart(2, '0')}
                                        </span>
                                        <div className="flex items-center">
                                            <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full"
                                                    style={{
                                                        width: `${Math.min((data.count / Math.max(...analytics.userGrowth.map(d => d.count))) * 100, 100)}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-medium text-gray-900 w-8 text-right">
                                                {data.count}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Top Skills */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Skills</h3>
                            <div className="space-y-3">
                                {analytics.topSkills.map((skill, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span className="text-sm font-medium text-gray-900 mr-2">
                                                #{index + 1}
                                            </span>
                                            <span className="text-sm text-gray-600">
                                                {skill._id}
                                            </span>
                                            {skill.category && (
                                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    {skill.category}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center">
                                            <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                                                <div
                                                    className="bg-green-600 h-2 rounded-full"
                                                    style={{
                                                        width: `${Math.min((skill.sessionCount / Math.max(...analytics.topSkills.map(s => s.sessionCount))) * 100, 100)}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-medium text-gray-900 w-8 text-right">
                                                {skill.sessionCount}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* System Health */}
            {systemHealth && (
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            {/* Database Status */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-500 mb-3">Database</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Status</span>
                                        <span className={`text-sm font-medium ${systemHealth.database.connected ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {systemHealth.database.connected ? 'Connected' : 'Disconnected'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Data Size</span>
                                        <span className="text-sm text-gray-900">
                                            {formatBytes(systemHealth.database.stats.dataSize)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Storage Size</span>
                                        <span className="text-sm text-gray-900">
                                            {formatBytes(systemHealth.database.stats.storageSize)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Objects</span>
                                        <span className="text-sm text-gray-900">
                                            {systemHealth.database.stats.objects.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Server Status */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-500 mb-3">Server</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Uptime</span>
                                        <span className="text-sm text-gray-900">
                                            {formatUptime(systemHealth.server.uptime)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Memory Usage</span>
                                        <span className="text-sm text-gray-900">
                                            {formatBytes(systemHealth.server.memory.used)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Node Version</span>
                                        <span className="text-sm text-gray-900">
                                            {systemHealth.server.nodeVersion}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Platform</span>
                                        <span className="text-sm text-gray-900">
                                            {systemHealth.server.platform}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Collections */}
                        <div className="mt-6">
                            <h4 className="text-sm font-medium text-gray-500 mb-3">Collections</h4>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                {Object.entries(systemHealth.collections).map(([name, stats]) => (
                                    <div key={name} className="bg-gray-50 rounded-lg p-3">
                                        <h5 className="text-sm font-medium text-gray-900 capitalize mb-2">{name}</h5>
                                        {stats.error ? (
                                            <p className="text-xs text-red-600">{stats.error}</p>
                                        ) : (
                                            <div className="space-y-1">
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-gray-600">Count</span>
                                                    <span className="text-xs text-gray-900">{stats.count}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-gray-600">Size</span>
                                                    <span className="text-xs text-gray-900">{formatBytes(stats.size)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAnalytics;