import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from '../components/admin/AdminDashboard';
import { AuthProvider } from '../context/AuthContext';
import { adminAPI } from '../utils/api';

// Mock the API
jest.mock('../utils/api', () => ({
    adminAPI: {
        getDashboardStats: jest.fn()
    }
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
    __esModule: true,
    default: {
        error: jest.fn(),
        success: jest.fn()
    }
}));

const mockDashboardData = {
    overview: {
        totalUsers: 150,
        activeUsers: 75,
        totalSessions: 200,
        completedSessions: 120,
        totalReviews: 85,
        flaggedReviews: 3,
        userGrowthRate: 15.5,
        sessionGrowthRate: 8.2
    },
    recentActivity: {
        recentUsers: [
            {
                _id: '1',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                createdAt: '2024-01-15T10:00:00Z'
            }
        ],
        recentSessions: [
            {
                _id: '1',
                requester: { firstName: 'Alice', lastName: 'Smith' },
                provider: { firstName: 'Bob', lastName: 'Johnson' },
                skill: { name: 'JavaScript' },
                status: 'completed',
                createdAt: '2024-01-15T10:00:00Z'
            }
        ]
    }
};

const renderWithProviders = (component) => {
    return render(
        <BrowserRouter>
            <AuthProvider>
                {component}
            </AuthProvider>
        </BrowserRouter>
    );
};

describe('AdminDashboard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders dashboard with loading state', () => {
        adminAPI.getDashboardStats.mockImplementation(() => new Promise(() => { }));

        renderWithProviders(<AdminDashboard />);

        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('renders dashboard stats when data is loaded', async () => {
        adminAPI.getDashboardStats.mockResolvedValue({
            data: { data: mockDashboardData }
        });

        renderWithProviders(<AdminDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
        });

        expect(screen.getByText('150')).toBeInTheDocument(); // Total Users
        expect(screen.getByText('75')).toBeInTheDocument(); // Active Users
        expect(screen.getByText('200')).toBeInTheDocument(); // Total Sessions
        expect(screen.getByText('15.5%')).toBeInTheDocument(); // Growth rate
    });

    test('displays recent users and sessions', async () => {
        adminAPI.getDashboardStats.mockResolvedValue({
            data: { data: mockDashboardData }
        });

        renderWithProviders(<AdminDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Recent Users')).toBeInTheDocument();
        });

        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('Recent Sessions')).toBeInTheDocument();
        expect(screen.getByText('Alice Smith → Bob Johnson')).toBeInTheDocument();
    });

    test('handles API error gracefully', async () => {
        const errorMessage = 'Failed to load dashboard data';
        adminAPI.getDashboardStats.mockRejectedValue({
            response: { data: { message: errorMessage } }
        });

        renderWithProviders(<AdminDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Error')).toBeInTheDocument();
        });

        expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    test('shows flagged reviews alert when there are flagged reviews', async () => {
        const dataWithFlaggedReviews = {
            ...mockDashboardData,
            overview: {
                ...mockDashboardData.overview,
                flaggedReviews: 5
            }
        };

        adminAPI.getDashboardStats.mockResolvedValue({
            data: { data: dataWithFlaggedReviews }
        });

        renderWithProviders(<AdminDashboard />);

        await waitFor(() => {
            expect(screen.getByText('5')).toBeInTheDocument();
        });

        // Check if the flagged reviews stat has alert styling
        const flaggedReviewsCard = screen.getByText('Flagged Reviews').closest('[class*="ring-2"]');
        expect(flaggedReviewsCard).toHaveClass('ring-2', 'ring-red-500');
    });
});