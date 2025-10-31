import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/helpers';
import Button from './Button';

function Header() {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">SS</span>
                        </div>
                        <span className="text-xl font-bold text-gray-900">SkillSwap</span>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center space-x-8">
                        {isAuthenticated ? (
                            <>
                                <Link
                                    to="/dashboard"
                                    className="text-gray-700 hover:text-primary-600 transition-colors"
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    to="/search"
                                    className="text-gray-700 hover:text-primary-600 transition-colors"
                                >
                                    Find Skills
                                </Link>
                                <Link
                                    to="/sessions"
                                    className="text-gray-700 hover:text-primary-600 transition-colors"
                                >
                                    My Sessions
                                </Link>
                                {user?.role === 'admin' && (
                                    <Link
                                        to="/admin"
                                        className="text-gray-700 hover:text-primary-600 transition-colors"
                                    >
                                        Admin Panel
                                    </Link>
                                )}
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/about"
                                    className="text-gray-700 hover:text-primary-600 transition-colors"
                                >
                                    About
                                </Link>
                                <Link
                                    to="/how-it-works"
                                    className="text-gray-700 hover:text-primary-600 transition-colors"
                                >
                                    How It Works
                                </Link>
                            </>
                        )}
                    </nav>

                    {/* User menu */}
                    <div className="flex items-center space-x-4">
                        {isAuthenticated ? (
                            <div className="flex items-center space-x-3">
                                {/* User avatar */}
                                <Link
                                    to="/profile"
                                    className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors"
                                >
                                    {user?.avatar ? (
                                        <img
                                            src={user.avatar}
                                            alt={`${user.firstName} ${user.lastName}`}
                                            className="w-8 h-8 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                                            <span className="text-white text-sm font-medium">
                                                {getInitials(user?.firstName, user?.lastName)}
                                            </span>
                                        </div>
                                    )}
                                    <span className="text-sm font-medium text-gray-700 hidden sm:block">
                                        {user?.firstName}
                                    </span>
                                </Link>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleLogout}
                                >
                                    Logout
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-3">
                                <Link to="/login">
                                    <Button variant="ghost" size="sm">
                                        Sign In
                                    </Button>
                                </Link>
                                <Link to="/register">
                                    <Button size="sm">
                                        Get Started
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;