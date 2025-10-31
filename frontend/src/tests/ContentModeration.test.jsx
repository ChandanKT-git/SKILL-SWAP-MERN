import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ContentModeration from '../components/admin/ContentModeration';
import { AuthProvider } from '../context/AuthContext';
import { adminAPI } from '../utils/api';

// Mock the API
jest.mock('../utils/api', () => ({
    adminAPI: {
        getFlaggedReviews: jest.fn(),
        moderateReview: jest.fn()
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

const mockFlaggedReviews = {
    reviews: [
        {
            _id: '1',
            comment: 'This is an inappropriate review comment',
            rating: 1,
            reviewer: {
                _id: 'reviewer1',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com'
            },
            reviewee: {
                _id: 'reviewee1',
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane@example.com'
            },
            createdAt: '2024-01-15T10:00:00Z',
            isFlagged: true
        }
    ],
    pagination: {
        currentPage: 1,
        totalPages: 1,
        totalFlagged: 1,
        hasNext: false,
        hasPrev: false
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

describe('ContentModeration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders content moderation interface', async () => {
        adminAPI.getFlaggedReviews.mockResolvedValue({
            data: { data: mockFlaggedReviews }
        });

        renderWithProviders(<ContentModeration />);

        await waitFor(() => {
            expect(screen.getByText('Content Moderation')).toBeInTheDocument();
        });

        expect(screen.getByText('Review and moderate flagged content to maintain community standards')).toBeInTheDocument();
    });

    test('displays flagged reviews when data is loaded', async () => {
        adminAPI.getFlaggedReviews.mockResolvedValue({
            data: { data: mockFlaggedReviews }
        });

        renderWithProviders(<ContentModeration />);

        await waitFor(() => {
            expect(screen.getByText('This is an inappropriate review comment')).toBeInTheDocument();
        });

        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    test('displays star rating correctly', async () => {
        adminAPI.getFlaggedReviews.mockResolvedValue({
            data: { data: mockFlaggedReviews }
        });

        renderWithProviders(<ContentModeration />);

        await waitFor(() => {
            expect(screen.getByText('(1)')).toBeInTheDocument();
        });
    });

    test('shows no flagged reviews message when list is empty', async () => {
        adminAPI.getFlaggedReviews.mockResolvedValue({
            data: {
                data: {
                    reviews: [],
                    pagination: {
                        currentPage: 1,
                        totalPages: 0,
                        totalFlagged: 0,
                        hasNext: false,
                        hasPrev: false
                    }
                }
            }
        });

        renderWithProviders(<ContentModeration />);

        await waitFor(() => {
            expect(screen.getByText('No flagged reviews')).toBeInTheDocument();
        });

        expect(screen.getByText('All reviews are currently in good standing.')).toBeInTheDocument();
    });

    test('handles review moderation actions', async () => {
        const user = userEvent.setup();
        adminAPI.getFlaggedReviews.mockResolvedValue({
            data: { data: mockFlaggedReviews }
        });
        adminAPI.moderateReview.mockResolvedValue({
            data: { success: true }
        });

        renderWithProviders(<ContentModeration />);

        await waitFor(() => {
            expect(screen.getByTitle('Approve')).toBeInTheDocument();
        });

        const approveButton = screen.getByTitle('Approve');
        await user.click(approveButton);

        await waitFor(() => {
            expect(adminAPI.moderateReview).toHaveBeenCalledWith('1', { action: 'approve', reason: '' });
        });
    });

    test('opens review details modal', async () => {
        const user = userEvent.setup();
        adminAPI.getFlaggedReviews.mockResolvedValue({
            data: { data: mockFlaggedReviews }
        });

        renderWithProviders(<ContentModeration />);

        await waitFor(() => {
            expect(screen.getByTitle('View Details')).toBeInTheDocument();
        });

        const viewButton = screen.getByTitle('View Details');
        await user.click(viewButton);

        await waitFor(() => {
            expect(screen.getByText('Review Details')).toBeInTheDocument();
        });

        expect(screen.getByText('Flagged Review')).toBeInTheDocument();
    });

    test('handles filter changes', async () => {
        const user = userEvent.setup();
        adminAPI.getFlaggedReviews.mockResolvedValue({
            data: { data: mockFlaggedReviews }
        });

        renderWithProviders(<ContentModeration />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('Newest First')).toBeInTheDocument();
        });

        const sortFilter = screen.getByDisplayValue('Newest First');
        await user.selectOptions(sortFilter, 'rating-desc');

        expect(sortFilter).toHaveValue('rating-desc');
    });

    test('handles API error gracefully', async () => {
        const errorMessage = 'Failed to load flagged reviews';
        adminAPI.getFlaggedReviews.mockRejectedValue({
            response: { data: { message: errorMessage } }
        });

        renderWithProviders(<ContentModeration />);

        // The component should still render the header even with an error
        await waitFor(() => {
            expect(screen.getByText('Content Moderation')).toBeInTheDocument();
        });
    });

    test('displays pagination when multiple pages exist', async () => {
        const paginatedData = {
            ...mockFlaggedReviews,
            pagination: {
                currentPage: 1,
                totalPages: 3,
                totalFlagged: 25,
                hasNext: true,
                hasPrev: false
            }
        };

        adminAPI.getFlaggedReviews.mockResolvedValue({
            data: { data: paginatedData }
        });

        renderWithProviders(<ContentModeration />);

        await waitFor(() => {
            expect(screen.getByText('Showing')).toBeInTheDocument();
        });

        expect(screen.getByText(/of 25 results/)).toBeInTheDocument();
        expect(screen.getByText('Next')).toBeInTheDocument();
    });

    test('review details modal allows moderation action selection', async () => {
        const user = userEvent.setup();
        adminAPI.getFlaggedReviews.mockResolvedValue({
            data: { data: mockFlaggedReviews }
        });

        renderWithProviders(<ContentModeration />);

        await waitFor(() => {
            expect(screen.getByTitle('View Details')).toBeInTheDocument();
        });

        // Open modal
        const viewButton = screen.getByTitle('View Details');
        await user.click(viewButton);

        await waitFor(() => {
            expect(screen.getByText('Moderation Action')).toBeInTheDocument();
        });

        // Select approve action
        const approveRadio = screen.getByLabelText(/Approve/);
        await user.click(approveRadio);

        expect(approveRadio).toBeChecked();

        // Apply action button should be enabled
        const applyButton = screen.getByText('Apply Action');
        expect(applyButton).not.toBeDisabled();
    });
});