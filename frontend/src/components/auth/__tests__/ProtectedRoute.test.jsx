import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext';
import ProtectedRoute from '../ProtectedRoute';

// Mock the Navigate component to prevent actual navigation in tests
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    Navigate: ({ to, state }) => (
        <div data-testid="navigate" data-to={to} data-state={JSON.stringify(state)}>
            Redirecting to {to}
        </div>
    ),
    useLocation: () => ({ pathname: '/test' }),
}));

// Mock the useAuth hook
const mockUseAuth = jest.fn();
jest.mock('../../../context/AuthContext', () => ({
    ...jest.requireActual('../../../context/AuthContext'),
    useAuth: () => mockUseAuth(),
}));

const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('ProtectedRoute', () => {
    const TestComponent = () => <div>Protected Content</div>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('shows loading spinner when authentication is loading', () => {
        mockUseAuth.mockReturnValue({
            isLoading: true,
            isAuthenticated: false,
            user: null,
        });

        renderWithRouter(
            <ProtectedRoute>
                <TestComponent />
            </ProtectedRoute>
        );

        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    test('redirects to login when user is not authenticated', () => {
        mockUseAuth.mockReturnValue({
            isLoading: false,
            isAuthenticated: false,
            user: null,
        });

        renderWithRouter(
            <ProtectedRoute>
                <TestComponent />
            </ProtectedRoute>
        );

        // Should show redirect component
        expect(screen.getByTestId('navigate')).toBeInTheDocument();
        expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('renders children when user is authenticated and verified', () => {
        mockUseAuth.mockReturnValue({
            isLoading: false,
            isAuthenticated: true,
            user: { isEmailVerified: true, role: 'user' },
        });

        renderWithRouter(
            <ProtectedRoute>
                <TestComponent />
            </ProtectedRoute>
        );

        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('redirects to verification when user is not verified', () => {
        mockUseAuth.mockReturnValue({
            isLoading: false,
            isAuthenticated: true,
            user: {
                isEmailVerified: false,
                email: 'test@example.com',
                role: 'user'
            },
        });

        renderWithRouter(
            <ProtectedRoute requireVerification={true}>
                <TestComponent />
            </ProtectedRoute>
        );

        // Should show redirect to verification
        expect(screen.getByTestId('navigate')).toBeInTheDocument();
        expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/verify-email');
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('allows access when verification is not required', () => {
        mockUseAuth.mockReturnValue({
            isLoading: false,
            isAuthenticated: true,
            user: {
                isEmailVerified: false,
                email: 'test@example.com',
                role: 'user'
            },
        });

        renderWithRouter(
            <ProtectedRoute requireVerification={false}>
                <TestComponent />
            </ProtectedRoute>
        );

        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('redirects when user does not have required role', () => {
        mockUseAuth.mockReturnValue({
            isLoading: false,
            isAuthenticated: true,
            user: {
                isEmailVerified: true,
                role: 'user'
            },
        });

        renderWithRouter(
            <ProtectedRoute requireRole="admin">
                <TestComponent />
            </ProtectedRoute>
        );

        // Should show redirect due to insufficient role
        expect(screen.getByTestId('navigate')).toBeInTheDocument();
        expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/unauthorized');
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
});