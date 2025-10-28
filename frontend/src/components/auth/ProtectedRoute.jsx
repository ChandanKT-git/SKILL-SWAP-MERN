import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

function ProtectedRoute({
    children,
    requireAuth = true,
    requireVerification = true,
    requireRole = null,
    redirectTo = '/login'
}) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // Show loading spinner while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Check if authentication is required
    if (requireAuth && !isAuthenticated) {
        return (
            <Navigate
                to={redirectTo}
                state={{ from: location }}
                replace
            />
        );
    }

    // Check if email verification is required
    if (requireAuth && requireVerification && user && !user.isEmailVerified) {
        return (
            <Navigate
                to="/verify-email"
                state={{
                    email: user.email,
                    message: 'Please verify your email to continue.'
                }}
                replace
            />
        );
    }

    // Check role-based access
    if (requireAuth && requireRole && user && user.role !== requireRole) {
        return (
            <Navigate
                to="/unauthorized"
                state={{ from: location }}
                replace
            />
        );
    }

    // If user is authenticated but trying to access auth pages, redirect to dashboard
    if (!requireAuth && isAuthenticated) {
        const authPages = ['/login', '/register', '/verify-email', '/forgot-password'];
        if (authPages.includes(location.pathname)) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return children;
}

// Convenience wrapper for admin-only routes
export function AdminRoute({ children }) {
    return (
        <ProtectedRoute
            requireAuth={true}
            requireVerification={true}
            requireRole="admin"
            redirectTo="/unauthorized"
        >
            {children}
        </ProtectedRoute>
    );
}

// Convenience wrapper for public routes (redirect if authenticated)
export function PublicRoute({ children }) {
    return (
        <ProtectedRoute requireAuth={false}>
            {children}
        </ProtectedRoute>
    );
}

export default ProtectedRoute;