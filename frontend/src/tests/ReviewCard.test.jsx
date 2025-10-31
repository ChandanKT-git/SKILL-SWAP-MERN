import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ReviewCard from '../components/reviews/ReviewCard';
import { reviewAPI } from '../utils/api';

// Mock the API
jest.mock('../utils/api', () => ({
    reviewAPI: {
        markHelpfulness: jest.fn(),
        flagReview: jest.fn(),
        addResponse: jest.fn()
    }
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
    success: jest.fn(),
    error: jest.fn()
}));

describe('ReviewCard Component', () => {
    const mockReview = {
        _id: 'review123',
        rating: 4,
        comment: 'Great session! Very helpful and knowledgeable instructor.',
        createdAt: '2024-01-15T10:00:00Z',
        reviewer: {
            _id: 'reviewer123',
            firstName: 'Jane',
            lastName: 'Smith',
            profileImage: '/avatar.jpg'
        },
        reviewee: {
            _id: 'reviewee123',
            firstName: 'John',
            lastName: 'Doe'
        },
        skillReviewed: {
            name: 'JavaScript',
            category: 'Programming'
        },
        helpfulness: {
            helpful: ['user1', 'user2'],
            notHelpful: ['user3']
        },
        response: null
    };

    const currentUserId = 'currentUser123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders review information correctly', () => {
        render(<ReviewCard review={mockReview} currentUserId={currentUserId} />);

        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Great session! Very helpful and knowledgeable instructor.')).toBeInTheDocument();
        expect(screen.getByText('JavaScript')).toBeInTheDocument();
        expect(screen.getByText(/Review for John Doe/)).toBeInTheDocument();
    });

    test('displays correct helpfulness counts', () => {
        render(<ReviewCard review={mockReview} currentUserId={currentUserId} />);

        expect(screen.getByText('Helpful (2)')).toBeInTheDocument();
        expect(screen.getByText('Not helpful (1)')).toBeInTheDocument();
    });

    test('handles helpfulness voting', async () => {
        const user = userEvent.setup();
        reviewAPI.markHelpfulness.mockResolvedValue({});

        render(<ReviewCard review={mockReview} currentUserId={currentUserId} />);

        const helpfulButton = screen.getByText('Helpful (2)').closest('button');
        await user.click(helpfulButton);

        expect(reviewAPI.markHelpfulness).toHaveBeenCalledWith('review123', true);
    });

    test('shows flag dialog when flag button is clicked', async () => {
        const user = userEvent.setup();

        render(<ReviewCard review={mockReview} currentUserId={currentUserId} />);

        const flagButton = screen.getByTitle('Flag review');
        await user.click(flagButton);

        expect(screen.getByText('Flag Review')).toBeInTheDocument();
        expect(screen.getByText('Reason for flagging *')).toBeInTheDocument();
    });

    test('submits flag with reason', async () => {
        const user = userEvent.setup();
        reviewAPI.flagReview.mockResolvedValue({});

        render(<ReviewCard review={mockReview} currentUserId={currentUserId} />);

        // Open flag dialog
        const flagButton = screen.getByTitle('Flag review');
        await user.click(flagButton);

        // Select reason and submit
        const reasonSelect = screen.getByRole('combobox');
        await user.selectOptions(reasonSelect, 'inappropriate');

        const submitButton = screen.getByRole('button', { name: /flag review/i });
        await user.click(submitButton);

        expect(reviewAPI.flagReview).toHaveBeenCalledWith('review123', {
            reason: 'inappropriate',
            details: ''
        });
    });

    test('shows response when review has one', () => {
        const reviewWithResponse = {
            ...mockReview,
            response: {
                comment: 'Thank you for the positive feedback!',
                respondedAt: '2024-01-16T10:00:00Z'
            }
        };

        render(<ReviewCard review={reviewWithResponse} currentUserId={currentUserId} />);

        expect(screen.getByText('Response')).toBeInTheDocument();
        expect(screen.getByText('Thank you for the positive feedback!')).toBeInTheDocument();
    });

    test('shows respond button for reviewee when no response exists', () => {
        const revieweeUserId = 'reviewee123';

        render(<ReviewCard review={mockReview} currentUserId={revieweeUserId} />);

        expect(screen.getByText('Respond')).toBeInTheDocument();
    });

    test('handles response submission', async () => {
        const user = userEvent.setup();
        reviewAPI.addResponse.mockResolvedValue({});
        const revieweeUserId = 'reviewee123';

        render(<ReviewCard review={mockReview} currentUserId={revieweeUserId} />);

        // Click respond button
        const respondButton = screen.getByText('Respond');
        await user.click(respondButton);

        // Fill out response form
        const responseTextarea = screen.getByPlaceholderText(/Thank the reviewer/);
        await user.type(responseTextarea, 'Thank you for the great feedback!');

        const submitButton = screen.getByRole('button', { name: /post response/i });
        await user.click(submitButton);

        expect(reviewAPI.addResponse).toHaveBeenCalledWith('review123', 'Thank you for the great feedback!');
    });

    test('disables helpfulness buttons for own review', () => {
        const ownReview = {
            ...mockReview,
            reviewer: {
                ...mockReview.reviewer,
                _id: currentUserId
            }
        };

        render(<ReviewCard review={ownReview} currentUserId={currentUserId} />);

        const helpfulButton = screen.getByText('Helpful (2)').closest('button');
        const notHelpfulButton = screen.getByText('Not helpful (1)').closest('button');

        expect(helpfulButton).toBeDisabled();
        expect(notHelpfulButton).toBeDisabled();
    });

    test('does not show flag button for own review', () => {
        const ownReview = {
            ...mockReview,
            reviewer: {
                ...mockReview.reviewer,
                _id: currentUserId
            }
        };

        render(<ReviewCard review={ownReview} currentUserId={currentUserId} />);

        expect(screen.queryByTitle('Flag review')).not.toBeInTheDocument();
    });

    test('handles API errors gracefully', async () => {
        const user = userEvent.setup();
        reviewAPI.markHelpfulness.mockRejectedValue(new Error('API Error'));

        render(<ReviewCard review={mockReview} currentUserId={currentUserId} />);

        const helpfulButton = screen.getByText('Helpful (2)').closest('button');
        await user.click(helpfulButton);

        // Should still call the API but handle error gracefully
        expect(reviewAPI.markHelpfulness).toHaveBeenCalled();
    });

    test('updates helpfulness counts locally after voting', async () => {
        const user = userEvent.setup();
        reviewAPI.markHelpfulness.mockResolvedValue({});

        render(<ReviewCard review={mockReview} currentUserId={currentUserId} />);

        const helpfulButton = screen.getByText('Helpful (2)').closest('button');
        await user.click(helpfulButton);

        await waitFor(() => {
            expect(screen.getByText('Helpful (3)')).toBeInTheDocument();
        });
    });
});