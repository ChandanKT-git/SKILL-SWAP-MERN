import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import UserManagement from '../components/admin/UserManagement';
import { AuthProvider } from '../context/AuthContext';
import { adminAPI } from '../utils/api';

// Mock the API
jest.mock('../utils/api', () => ({
    adminAPI: {
        getUsers: jest.fn(),
        getUserDetails: jest.fn(),
        updateUserStatus: jest.fn()
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

const mockUsersData = {
    users: [
        {
            _id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            status: 'active',
            role: 'user',
            createdAt: '2024-01-15T10:00:00Z',
            lastLogin: '2024-01-20T10:00:00Z',
            avatar: null
        },
        {
            _id: '2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            status: 'suspended',
            role: 'admin',
            createdAt: '2024-01-10T10:00:00Z',
            lastLogin: null,
            avatar: 'https://example.com/avatar.jpg'
        }
    ],
    pagination: {
        currentPage: 1,
        totalPages: 1,
        totalUsers: 2,
        hasNext: false,
        hasPrev: false
    }
};

const mockUserDetails = {
    user: mockUsersData.users[0],
    activity: {
        sessions: [],
        reviewsGiven: [],
        reviewsReceived: []
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

describe('UserManagement', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders user management interface', async () => {
        adminAPI.getUsers.mockResolvedValue({
            data: { data: mockUsersData }
        });

        renderWithProviders(<UserManagement />);

        await waitFor(() => {
            expect(screen.getByText('User Management')).toBeInTheDocument();
        });

        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    test('displays user status badges correctly', async () => {
        adminAPI.getUsers.mockResolvedValue({
            data: { data: mockUsersData }
        });

        renderWithProviders(<UserManagement />);

        await waitFor(() => {
            expect(screen.getByText('active')).toBeInTheDocument();
        });

        expect(screen.getByText('suspended')).toBeInTheDocument();
    });

    test('displays role badges correctly', async () => {
        adminAPI.getUsers.mockResolvedValue({
            data: { data: mockUsersData }
        });

        renderWithProviders(<UserManagement />);

        await waitFor(() => {
            expect(screen.getAllByText('user')).toHaveLength(1);
        });

        expect(screen.getByText('admin')).toBeInTheDocument();
    });

    test('handles search functionality', async () => {
        const user = userEvent.setup();
        adminAPI.getUsers.mockResolvedValue({
            data: { data: mockUsersData }
        });

        renderWithProviders(<UserManagement />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText('Search users...');
        await user.type(searchInput, 'john');

        expect(searchInput).toHaveValue('john');
    });

    test('handles filter changes', async () => {
        const user = userEvent.setup();
        adminAPI.getUsers.mockResolvedValue({
            data: { data: mockUsersData }
        });

        renderWithProviders(<UserManagement />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
        });

        const statusFilter = screen.getByDisplayValue('All Statuses');
        await user.selectOptions(statusFilter, 'active');

        expect(statusFilter).toHaveValue('active');
    });

    test('opens user details modal', async () => {
        const user = userEvent.setup();
        adminAPI.getUsers.mockResolvedValue({
            data: { data: mockUsersData }
        });
        adminAPI.getUserDetails.mockResolvedValue({
            data: { data: mockUserDetails }
        });

        renderWithProviders(<UserManagement />);

        await waitFor(() => {
            expect(screen.getByText('User Management')).toBeInTheDocument();
        });

        // Click the view details button (eye icon) - first button with indigo color
        const viewButton = screen.getAllByRole('button').find(button =>
            button.className.includes('text-indigo-600')
        );

        if (viewButton) {
            await user.click(viewButton);

            await waitFor(() => {
                expect(adminAPI.getUserDetails).toHaveBeenCalledWith('1');
            });
        }
    });

    test('handles user status update', async () => {
        const user = userEvent.setup();
        adminAPI.getUsers.mockResolvedValue({
            data: { data: mockUsersData }
        });
        adminAPI.updateUserStatus.mockResolvedValue({
            data: { success: true }
        });

        renderWithProviders(<UserManagement />);

        await waitFor(() => {
            expect(screen.getByText('Suspend')).toBeInTheDocument();
        });

        const suspendButton = screen.getByText('Suspend');
        await user.click(suspendButton);

        await waitFor(() => {
            expect(adminAPI.updateUserStatus).toHaveBeenCalledWith('1', { status: 'suspended', reason: '' });
        });
    });

    test('handles API error gracefully', async () => {
        const errorMessage = 'Failed to load users';
        adminAPI.getUsers.mockRejectedValue({
            response: { data: { message: errorMessage } }
        });

        renderWithProviders(<UserManagement />);

        // The component should still render the header even with an error
        await waitFor(() => {
            expect(screen.getByText('User Management')).toBeInTheDocument();
        });
    });

    test('displays pagination when multiple pages exist', async () => {
        const paginatedData = {
            ...mockUsersData,
            pagination: {
                currentPage: 1,
                totalPages: 3,
                totalUsers: 50,
                hasNext: true,
                hasPrev: false
            }
        };

        adminAPI.getUsers.mockResolvedValue({
            data: { data: paginatedData }
        });

        renderWithProviders(<UserManagement />);

        await waitFor(() => {
            expect(screen.getByText('User Management')).toBeInTheDocument();
        });

        // Check if pagination controls are rendered when there are multiple pages
        expect(screen.getAllByText('Next')).toHaveLength(2); // Mobile and desktop versions
    });
});