import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/helpers';
import Button from './Button';

function Header() {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
        setMobileMenuOpen(false);
    };

    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    return (
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
            {/* Skip to main content link for accessibility */}
            <a href="#main-content" className="skip-link">
                Skip to main content
            </a>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link
                        to="/"
                        className="flex items-center space-x-2 focus-visible-ring rounded-lg"
                        aria-label="SkillSwap Home"
                    >
                        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center" aria-hidden="true">
                            <span className="text-white font-bold text-sm">SS</span>
                        </div>
                        <span className="text-xl font-bold text-gray-900">SkillSwap</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-8" aria-label="Main navigation">
                        {isAuthenticated ? (
                            <>
                                <Link
                                    to="/dashboard"
                                    className="text-gray-700 hover:text-primary-600 transition-colors focus-visible-ring rounded px-2 py-1"
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    to="/search"
                                    className="text-gray-700 hover:text-primary-600 transition-colors focus-visible-ring rounded px-2 py-1"
                                >
                                    Find Skills
                                </Link>
                                <Link
                                    to="/sessions"
                                    className="text-gray-700 hover:text-primary-600 transition-colors focus-visible-ring rounded px-2 py-1"
                                >
                                    My Sessions
                                </Link>
                                {user?.role === 'admin' && (
                                    <Link
                                        to="/admin"
                                        className="text-gray-700 hover:text-primary-600 transition-colors focus-visible-ring rounded px-2 py-1"
                                    >
                                        Admin Panel
                                    </Link>
                                )}
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/about"
                                    className="text-gray-700 hover:text-primary-600 transition-colors focus-visible-ring rounded px-2 py-1"
                                >
                                    About
                                </Link>
                                <Link
                                    to="/how-it-works"
                                    className="text-gray-700 hover:text-primary-600 transition-colors focus-visible-ring rounded px-2 py-1"
                                >
                                    How It Works
                                </Link>
                            </>
                        )}
                    </nav>

                    {/* Desktop User menu */}
                    <div className="hidden md:flex items-center space-x-4">
                        {isAuthenticated ? (
                            <div className="flex items-center space-x-3">
                                {/* User avatar */}
                                <Link
                                    to="/profile"
                                    className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors focus-visible-ring"
                                    aria-label={`View profile of ${user?.firstName} ${user?.lastName}`}
                                >
                                    {user?.avatar ? (
                                        <img
                                            src={user.avatar}
                                            alt=""
                                            className="w-8 h-8 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center" aria-hidden="true">
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
                                    aria-label="Logout"
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

                    {/* Mobile menu button */}
                    <button
                        type="button"
                        className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-700 hover:bg-gray-100 focus-visible-ring"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-expanded={mobileMenuOpen}
                        aria-label="Toggle navigation menu"
                    >
                        {mobileMenuOpen ? (
                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        ) : (
                            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-gray-200 bg-white" role="dialog" aria-label="Mobile navigation">
                    <nav className="px-4 pt-2 pb-4 space-y-1" aria-label="Mobile navigation menu">
                        {isAuthenticated ? (
                            <>
                                {/* User info */}
                                <div className="flex items-center space-x-3 px-3 py-3 border-b border-gray-200 mb-2">
                                    {user?.avatar ? (
                                        <img
                                            src={user.avatar}
                                            alt=""
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center" aria-hidden="true">
                                            <span className="text-white font-medium">
                                                {getInitials(user?.firstName, user?.lastName)}
                                            </span>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {user?.firstName} {user?.lastName}
                                        </p>
                                        <p className="text-xs text-gray-500">{user?.email}</p>
                                    </div>
                                </div>

                                <Link
                                    to="/profile"
                                    className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-600 transition-colors focus-visible-ring"
                                    onClick={closeMobileMenu}
                                >
                                    My Profile
                                </Link>
                                <Link
                                    to="/dashboard"
                                    className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-600 transition-colors focus-visible-ring"
                                    onClick={closeMobileMenu}
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    to="/search"
                                    className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-600 transition-colors focus-visible-ring"
                                    onClick={closeMobileMenu}
                                >
                                    Find Skills
                                </Link>
                                <Link
                                    to="/sessions"
                                    className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-600 transition-colors focus-visible-ring"
                                    onClick={closeMobileMenu}
                                >
                                    My Sessions
                                </Link>
                                {user?.role === 'admin' && (
                                    <Link
                                        to="/admin"
                                        className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-600 transition-colors focus-visible-ring"
                                        onClick={closeMobileMenu}
                                    >
                                        Admin Panel
                                    </Link>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors focus-visible-ring"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/about"
                                    className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-600 transition-colors focus-visible-ring"
                                    onClick={closeMobileMenu}
                                >
                                    About
                                </Link>
                                <Link
                                    to="/how-it-works"
                                    className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-600 transition-colors focus-visible-ring"
                                    onClick={closeMobileMenu}
                                >
                                    How It Works
                                </Link>
                                <div className="pt-4 space-y-2">
                                    <Link to="/login" className="block" onClick={closeMobileMenu}>
                                        <Button variant="ghost" size="md" className="w-full">
                                            Sign In
                                        </Button>
                                    </Link>
                                    <Link to="/register" className="block" onClick={closeMobileMenu}>
                                        <Button size="md" className="w-full">
                                            Get Started
                                        </Button>
                                    </Link>
                                </div>
                            </>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
}

export default Header;