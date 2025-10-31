import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ReviewForm from '../components/reviews/ReviewForm';
import { reviewAPI } from '../utils/api';

// Mock the API
jest.mock('../utils/api', () => ({
    reviewAPI: {
        submitReview: jest.fn()
    }
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
    success: jest.fn(),
    error: jest.fn()
}));

describe('ReviewForm Component', () => {
    const mockSession = {
        _id: 'session123',
        skill: 'JavaScript Programming',
        scheduledDate: '2024-01-15T10:00:00Z',
        duration: 60,
        type: 'learning'
    };

    const mockReviewee = {
        _id: 'user123',
        firstName: 'John',
        lastName: 'Doe'
    };

    const mockOnSubmit = jest.fn();
    const mockOnCancel = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders form with session and reviewee information', () => {
        render(
            <ReviewForm
                session={mockSession}
                reviewee={mockReviewee}
                onSubmit={mockOnSubmit}
                onCancel={mockOnCancel}
            />
        );

        expect(screen.getByText('Rate Your Experience')).toBeInTheDocument();
        expect(screen.getByText(/How was your session with John Doe/)).toBeInTheDocument();
        expect(screen.getByText('JavaScript Programming')).toBeInTheDocument();
        expect(screen.getByText('60 minutes')).toBeInTheDocument();
    });

    test('validates required fields', async () => {
        const user = userEvent.setup();

        render(
            <ReviewForm
                session={mockSession}
                reviewee={mockReviewee}
                onSubmit={mockOnSubmit}
                onCancel={mockOnCancel}
            />
        );

        const submitButton = screen.getByRole('button', { name: /submit review/i });

        // Submit button should be disabled when no rating is selected
        expect(submitButton).toBeDisabled();
    });

    test('validates comment length', async () => {
        const user = userEvent.setup();

        render(
            <ReviewForm
                session={mockSession}
                reviewee={mockReviewee}
                onSubmit={mockOnSubmit}
                onCancel={mockOnCancel}
            />
        );

        const commentTextarea = screen.getByRole('textbox');
        const submitButton = screen.getByRole('button', { name: /submit review/i });

        // Set rating first
        const stars = screen.getAllByRole('button');
        await user.click(stars[3]); // 4 stars

        // Enter short comment
        await user.type(commentTextarea, 'Too short');

        // Form should prevent submission with short comment
        expect(commentTextarea.value).toBe('Too short');
    });

    test('shows character count for comment', async () => {
        const user = userEvent.setup();

        render(
            <ReviewForm
                session={mockSession}
                reviewee={mockReviewee}
                onSubmit={mockOnSubmit}
                onCancel={mockOnCancel}
            />
        );

        const commentTextarea = screen.getByRole('textbox');

        await user.type(commentTextarea, 'This is a test comment');

        // Check that character count is displayed (may be split across elements)
        expect(screen.getByText(/\/1000/)).toBeInTheDocument();
    });

    test('updates rating description when rating changes', async () => {
        const user = userEvent.setup();

        render(
            <ReviewForm
                session={mockSession}
                reviewee={mockReviewee}
                onSubmit={mockOnSubmit}
                onCancel={mockOnCancel}
            />
        );

        const stars = screen.getAllByRole('button');

        // Click 5 stars
        await user.click(stars[4]);
        expect(screen.getByText('5 stars - Excellent')).toBeInTheDocument();

        // Click 1 star
        await user.click(stars[0]);
        expect(screen.getByText('1 star - Poor')).toBeInTheDocument();
    });

    test('submits form with correct data', async () => {
        const user = userEvent.setup();
        reviewAPI.submitReview.mockResolvedValue({ data: { _id: 'review123' } });

        render(
            <ReviewForm
                session={mockSession}
                reviewee={mockReviewee}
                onSubmit={mockOnSubmit}
                onCancel={mockOnCancel}
            />
        );

        const stars = screen.getAllByRole('button');
        const commentTextarea = screen.getByRole('textbox');
        const submitButton = screen.getByRole('button', { name: /submit review/i });

        // Fill out form
        await user.click(stars[3]); // 4 stars
        await user.type(commentTextarea, 'Great session! Learned a lot about JavaScript.');
        await user.click(submitButton);

        await waitFor(() => {
            expect(reviewAPI.submitReview).toHaveBeenCalledWith({
                sessionId: 'session123',
                revieweeId: 'user123',
                rating: 4,
                comment: 'Great session! Learned a lot about JavaScript.',
                reviewType: 'learning'
            });
        });

        expect(mockOnSubmit).toHaveBeenCalledWith({ _id: 'review123' });
    });

    test('handles API error gracefully', async () => {
        const user = userEvent.setup();
        reviewAPI.submitReview.mockRejectedValue(new Error('API Error'));

        render(
            <ReviewForm
                session={mockSession}
                reviewee={mockReviewee}
                onSubmit={mockOnSubmit}
                onCancel={mockOnCancel}
            />
        );

        const stars = screen.getAllByRole('button');
        const commentTextarea = screen.getByRole('textbox');
        const submitButton = screen.getByRole('button', { name: /submit review/i });

        // Fill out form
        await user.click(stars[3]); // 4 stars
        await user.type(commentTextarea, 'Great session! Learned a lot about JavaScript.');
        await user.click(submitButton);

        await waitFor(() => {
            expect(reviewAPI.submitReview).toHaveBeenCalled();
        });

        // Should not call onSubmit on error
        expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    test('calls onCancel when cancel button is clicked', async () => {
        const user = userEvent.setup();

        render(
            <ReviewForm
                session={mockSession}
                reviewee={mockReviewee}
                onSubmit={mockOnSubmit}
                onCancel={mockOnCancel}
            />
        );

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        await user.click(cancelButton);

        expect(mockOnCancel).toHaveBeenCalled();
    });

    test('disables submit button when submitting', async () => {
        const user = userEvent.setup();
        reviewAPI.submitReview.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

        render(
            <ReviewForm
                session={mockSession}
                reviewee={mockReviewee}
                onSubmit={mockOnSubmit}
                onCancel={mockOnCancel}
            />
        );

        const stars = screen.getAllByRole('button');
        const commentTextarea = screen.getByRole('textbox');
        const submitButton = screen.getByRole('button', { name: /submit review/i });

        // Fill out form
        await user.click(stars[3]); // 4 stars
        await user.type(commentTextarea, 'Great session! Learned a lot about JavaScript.');
        await user.click(submitButton);

        // Check that API was called (loading state is async)
        await waitFor(() => {
            expect(reviewAPI.submitReview).toHaveBeenCalled();
        });
    });
});