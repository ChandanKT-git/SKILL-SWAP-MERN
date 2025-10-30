import React, { useState, useEffect } from 'react';
import { sessionAPI } from '../../utils/api';
import SessionCard from './SessionCard';
import LoadingSpinner from '../common/LoadingSpinner';
import Button from '../common/Button';
import { cn } from '../../utils/helpers';
import toast from 'react-hot-toast';

function SessionList({ type = 'all', showFilters = true, initialFilters = {} }) {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'all',
        type: type,
        upcoming: false,
        ...initialFilters
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });

    useEffect(() => {
        fetchSessions();
    }, [filters, pagination.page]);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                ...(filters.status !== 'all' && { status: filters.status }),
                ...(filters.type !== 'all' && { type: filters.type }),
                ...(filters.upcoming && { upcoming: true })
            };

            const response = await sessionAPI.getUserSessions(params);
            const { sessions: sessionData, pagination: paginationData } = response.data;

            setSessions(sessionData);
            setPagination(prev => ({
                ...prev,
                total: paginationData.total,
                totalPages: paginationData.totalPages
            }));
        } catch (error) {
            console.error('Error fetching sessions:', error);
            toast.error('Failed to load sessions');
        } finally {
            setLoading(false);
        }
    };

    const handleSessionUpdate = (sessionId, updatedSession) => {
        setSessions(prev =>
            prev.map(session =>
                session._id === sessionId ? { ...session, ...updatedSession } : session
            )
        );
    };

    const handleSessionDelete = (sessionId) => {
        setSessions(prev => prev.filter(session => session._id !== sessionId));
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const statusOptions = [
        { value: 'all', label: 'All Sessions' },
        { value: 'pending', label: 'Pending' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'rejected', label: 'Rejected' }
    ];

    const typeOptions = [
        { value: 'all', label: 'All Types' },
        { value: 'requested', label: 'Requested by Me' },
        { value: 'received', label: 'Received Requests' }
    ];

    if (loading && sessions.length === 0) {
        return (
            <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            {showFilters && (
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-0">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                {statusOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1 min-w-0">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Type
                            </label>
                            <select
                                value={filters.type}
                                onChange={(e) => handleFilterChange('type', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                {typeOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.upcoming}
                                    onChange={(e) => handleFilterChange('upcoming', e.target.checked)}
                                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Upcoming Only
                                </span>
                            </label>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchSessions}
                            loading={loading}
                        >
                            Refresh
                        </Button>
                    </div>
                </div>
            )}

            {/* Session Count */}
            <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                    {pagination.total > 0 ? (
                        <>
                            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                            {pagination.total} sessions
                        </>
                    ) : (
                        'No sessions found'
                    )}
                </p>
            </div>

            {/* Sessions List */}
            {sessions.length > 0 ? (
                <div className="space-y-4">
                    {sessions.map(session => (
                        <SessionCard
                            key={session._id}
                            session={session}
                            onUpdate={handleSessionUpdate}
                            onDelete={handleSessionDelete}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h3>
                    <p className="text-gray-600 mb-4">
                        {filters.status === 'all'
                            ? "You don't have any sessions yet. Start by booking a session with someone!"
                            : `No sessions found with status "${filters.status}".`
                        }
                    </p>
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                    >
                        Previous
                    </Button>

                    <div className="flex space-x-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            let pageNum;
                            if (pagination.totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (pagination.page <= 3) {
                                pageNum = i + 1;
                            } else if (pagination.page >= pagination.totalPages - 2) {
                                pageNum = pagination.totalPages - 4 + i;
                            } else {
                                pageNum = pagination.page - 2 + i;
                            }

                            return (
                                <Button
                                    key={pageNum}
                                    variant={pagination.page === pageNum ? 'primary' : 'outline'}
                                    size="sm"
                                    onClick={() => handlePageChange(pageNum)}
                                    className="w-10"
                                >
                                    {pageNum}
                                </Button>
                            );
                        })}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}

export default SessionList;