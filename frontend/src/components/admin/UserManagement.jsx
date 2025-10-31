import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import LoadingSpinner from '../common/LoadingSpinner';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    EyeIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({});
    const [filters, setFilters] = useState({
        page: 1,
        limit: 20,
        search: '',
        status: '',
        role: '',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    });
    const [selectedUser, setSelectedUser] = useState(null);
    const [showUserDetails, setShowUserDetails] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, [filters]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getUsers(filters);
            setUsers(response.data.data.users);
            setPagination(response.data.data.pagination);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const fetchUserDetails = async (userId) => {
        try {
            const response = await adminAPI.getUserDetails(userId);
            setSelectedUser(response.data.data);
            setShowUserDetails(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load user details');
        }
    };

    const updateUserStatus = async (userId, status, reason = '') => {
        try {
            setActionLoading(userId);
            await adminAPI.updateUserStatus(userId, { status, reason });
            toast.success(`User status updated to ${status}`);
            fetchUsers(); // Refresh the list
            if (selectedUser && selectedUser.user._id === userId) {
                setSelectedUser({
                    ...selectedUser,
                    user: { ...selectedUser.user, status }
                });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update user status');
        } finally {
            setActionLoading(null);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: key !== 'page' ? 1 : value // Reset to page 1 when changing filters
        }));
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchUsers();
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            active: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon },
            suspended: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon },
            deactivated: { bg: 'bg-gray-100', text: 'text-gray-800', icon: ExclamationTriangleIcon }
        };

        const config = statusConfig[status] || statusConfig.active;
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                <Icon className="w-3 h-3 mr-1" />
                {status}
            </span>
        );
    };

    const getRoleBadge = (role) => {
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                {role}
            </span>
        );
    };

    if (loading && users.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-gray-200 pb-4">
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Manage user accounts, view details, and update user status
                </p>
            </div>

            {/* Filters and Search */}
            <div className="bg-white shadow rounded-lg p-6">
                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Search */}
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                        </div>

                        {/* Status Filter */}
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="deactivated">Deactivated</option>
                        </select>

                        {/* Role Filter */}
                        <select
                            value={filters.role}
                            onChange={(e) => handleFilterChange('role', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                            <option value="">All Roles</option>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>

                        {/* Sort */}
                        <select
                            value={`${filters.sortBy}-${filters.sortOrder}`}
                            onChange={(e) => {
                                const [sortBy, sortOrder] = e.target.value.split('-');
                                handleFilterChange('sortBy', sortBy);
                                handleFilterChange('sortOrder', sortOrder);
                            }}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                            <option value="createdAt-desc">Newest First</option>
                            <option value="createdAt-asc">Oldest First</option>
                            <option value="firstName-asc">Name A-Z</option>
                            <option value="firstName-desc">Name Z-A</option>
                            <option value="email-asc">Email A-Z</option>
                            <option value="lastLogin-desc">Last Login</option>
                        </select>
                    </div>
                </form>
            </div>

            {/* Users Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Joined
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Last Login
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                {user.avatar ? (
                                                    <img
                                                        className="h-10 w-10 rounded-full"
                                                        src={user.avatar}
                                                        alt=""
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                                        <span className="text-sm font-medium text-gray-700">
                                                            {user.firstName.charAt(0)}
                                                            {user.lastName.charAt(0)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {user.firstName} {user.lastName}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(user.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getRoleBadge(user.role)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.lastLogin
                                            ? new Date(user.lastLogin).toLocaleDateString()
                                            : 'Never'
                                        }
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => fetchUserDetails(user._id)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                <EyeIcon className="h-4 w-4" />
                                            </button>

                                            {user.status === 'active' && (
                                                <button
                                                    onClick={() => updateUserStatus(user._id, 'suspended')}
                                                    disabled={actionLoading === user._id}
                                                    className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                                >
                                                    {actionLoading === user._id ? (
                                                        <LoadingSpinner size="sm" />
                                                    ) : (
                                                        'Suspend'
                                                    )}
                                                </button>
                                            )}

                                            {user.status === 'suspended' && (
                                                <button
                                                    onClick={() => updateUserStatus(user._id, 'active')}
                                                    disabled={actionLoading === user._id}
                                                    className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                                >
                                                    {actionLoading === user._id ? (
                                                        <LoadingSpinner size="sm" />
                                                    ) : (
                                                        'Activate'
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => handleFilterChange('page', pagination.currentPage - 1)}
                                disabled={!pagination.hasPrev}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => handleFilterChange('page', pagination.currentPage + 1)}
                                disabled={!pagination.hasNext}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing{' '}
                                    <span className="font-medium">
                                        {(pagination.currentPage - 1) * filters.limit + 1}
                                    </span>{' '}
                                    to{' '}
                                    <span className="font-medium">
                                        {Math.min(pagination.currentPage * filters.limit, pagination.totalUsers)}
                                    </span>{' '}
                                    of{' '}
                                    <span className="font-medium">{pagination.totalUsers}</span> results
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                    <button
                                        onClick={() => handleFilterChange('page', pagination.currentPage - 1)}
                                        disabled={!pagination.hasPrev}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => handleFilterChange('page', pagination.currentPage + 1)}
                                        disabled={!pagination.hasNext}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* User Details Modal */}
            {showUserDetails && selectedUser && (
                <UserDetailsModal
                    user={selectedUser}
                    onClose={() => setShowUserDetails(false)}
                    onStatusUpdate={updateUserStatus}
                />
            )}
        </div>
    );
};

// User Details Modal Component
const UserDetailsModal = ({ user, onClose, onStatusUpdate }) => {
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-medium text-gray-900">User Details</h3>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <span className="sr-only">Close</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* User Info */}
                            <div className="space-y-4">
                                <div className="flex items-center space-x-4">
                                    {user.user.avatar ? (
                                        <img
                                            className="h-16 w-16 rounded-full"
                                            src={user.user.avatar}
                                            alt=""
                                        />
                                    ) : (
                                        <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                                            <span className="text-lg font-medium text-gray-700">
                                                {user.user.firstName.charAt(0)}
                                                {user.user.lastName.charAt(0)}
                                            </span>
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="text-xl font-semibold text-gray-900">
                                            {user.user.firstName} {user.user.lastName}
                                        </h4>
                                        <p className="text-gray-600">{user.user.email}</p>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.user.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    user.user.status === 'suspended' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>
                                                {user.user.status}
                                            </span>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {user.user.role}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium text-gray-500">Joined:</span>
                                        <p className="text-gray-900">{new Date(user.user.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-500">Last Login:</span>
                                        <p className="text-gray-900">
                                            {user.user.lastLogin
                                                ? new Date(user.user.lastLogin).toLocaleDateString()
                                                : 'Never'
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-500">Email Verified:</span>
                                        <p className="text-gray-900">{user.user.isEmailVerified ? 'Yes' : 'No'}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-500">Rating:</span>
                                        <p className="text-gray-900">
                                            {user.user.rating?.average ? `${user.user.rating.average.toFixed(1)} (${user.user.rating.count} reviews)` : 'No ratings'}
                                        </p>
                                    </div>
                                </div>

                                {user.user.bio && (
                                    <div>
                                        <span className="font-medium text-gray-500">Bio:</span>
                                        <p className="text-gray-900 mt-1">{user.user.bio}</p>
                                    </div>
                                )}

                                {user.user.skillsOffered && user.user.skillsOffered.length > 0 && (
                                    <div>
                                        <span className="font-medium text-gray-500">Skills Offered:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {user.user.skillsOffered.map((skill, index) => (
                                                <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Activity Summary */}
                            <div className="space-y-4">
                                <h5 className="font-medium text-gray-900">Recent Activity</h5>

                                {/* Sessions */}
                                <div>
                                    <h6 className="text-sm font-medium text-gray-500 mb-2">Recent Sessions</h6>
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {user.activity.sessions.slice(0, 5).map((session) => (
                                            <div key={session._id} className="text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-900">
                                                        {session.requester?._id === user.user._id ? 'Requested' : 'Provided'} session
                                                    </span>
                                                    <span className={`px-2 py-1 rounded text-xs ${session.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                            session.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {session.status}
                                                    </span>
                                                </div>
                                                <p className="text-gray-500 text-xs">
                                                    {new Date(session.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Reviews */}
                                <div>
                                    <h6 className="text-sm font-medium text-gray-500 mb-2">Recent Reviews</h6>
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {user.activity.reviewsReceived.slice(0, 3).map((review) => (
                                            <div key={review._id} className="text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-900">
                                                        {review.rating}/5 stars
                                                    </span>
                                                    <span className="text-gray-500 text-xs">
                                                        {new Date(review.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                {review.comment && (
                                                    <p className="text-gray-600 text-xs truncate">
                                                        {review.comment}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            onClick={onClose}
                            className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Close
                        </button>
                        {user.user.status === 'active' && (
                            <button
                                onClick={() => {
                                    onStatusUpdate(user.user._id, 'suspended');
                                    onClose();
                                }}
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                            >
                                Suspend User
                            </button>
                        )}
                        {user.user.status === 'suspended' && (
                            <button
                                onClick={() => {
                                    onStatusUpdate(user.user._id, 'active');
                                    onClose();
                                }}
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                            >
                                Activate User
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;