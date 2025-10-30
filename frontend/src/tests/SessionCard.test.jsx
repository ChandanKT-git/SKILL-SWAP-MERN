import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
    success: jest.fn(),
    error: jest.fn()
}));

// Mock the API
jest.mock('../utils/api', () => ({
    sessionAPI: {
        cancelSession: jest.fn(),
        completeSession: jest.fn()
    }
}));

import SessionCard from '../components/sessions/SessionCard';
import { sessionAPI } from '../utils/api';

describe('SessionCard', () => {
    const mockSession = {
        _id: '507f1f77bcf86cd799439011',
        skill: {
            name: 'React Development',
            category: 'Programming',
            level: 'intermediate'
        },
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        duration: 90,
        sessionType: 'online',
        status: 'pending',
        requestMessage: 'Looking forward to learning React!',
        requester: {
            _id: 'requester123',
            firstName: 'Jane',
            lastName: 'Smith'
        },
        provider: {
            _id: 'provider123',
            firstName: 'John',
            lastName: 'Doe'
        },
        currentUserId: 'requester123',
        meetingLink: 'https://zoom.us/j/123456789'
    };

    const mockProps = {
        session: mockSession,
        onUpdate: jest.fn(),
        onDelete: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        sessionAPI.cancelSession.mockResolvedValue({ data: { success: true } });
        sessionAPI.completeSession.mockResolvedValue({ data: { success: true } });

        // Mock window.confirm
        window.confirm = jest.fn(() => true);
    });

    test('renders session details correctly', () => {
        render(<SessionCard {...mockProps} />);

        expect(screen.getByText('React Development')).toBeInTheDocument();
        expect(screen.getByText('with John Doe')).toBeInTheDocument();
        expect(screen.getByText('Programming • intermediate')).toBeInTheDocument();
        expect(screen.getByText('Looking forward to learning React!')).toBeInTheDocument();
    });

    test('displays correct status badge', () => {
        render(<SessionCard {...mockProps} />);

        const statusBadge = screen.getByText('Pending');
        expect(statusBadge).toBeInTheDocument();
        expect(statusBadge.closest('span')).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    test('shows different status colors for different statuses', () => {
        const acceptedSession = { ...mockSession, status: 'accepted' };
        const { rerender } = render(<SessionCard {...mockProps} session={acceptedSession} />);

        let statusBadge = screen.getByText('Accepted');
        expect(statusBadge.closest('span')).toHaveClass('bg-green-100', 'text-green-800');

        const rejectedSession = { ...mockSession, status: 'rejected' };
        rerender(<SessionCard {...mockProps} session={rejectedSession} />);

        statusBadge = screen.getByText('Rejected');
        expect(statusBadge.closest('span')).toHaveClass('bg-red-100', 'text-red-800');
    });

    test('displays meeting link for online sessions', () => {
        render(<SessionCard {...mockProps} />);

        const meetingLink = screen.getByText('Meeting Link');
        expect(meetingLink).toBeInTheDocument();
        expect(meetingLink.closest('a')).toHaveAttribute('href', 'https://zoom.us/j/123456789');
    });

    test('shows location for in-person sessions', () => {
        const inPersonSession = {
            ...mockSession,
            sessionType: 'in-person',
            location: 'Central Library',
            meetingLink: undefined
        };

        render(<SessionCard {...mockProps} session={inPersonSession} />);

        expect(screen.getByText('Central Library')).toBeInTheDocument();
        expect(screen.queryByText('Meeting Link')).not.toBeInTheDocument();
    });

    test('shows respond button for received pending sessions', () => {
        const receivedSession = {
            ...mockSession,
            currentUserId: 'provider123' // User is the provider
        };

        render(<SessionCard {...mockProps} session={receivedSession} />);

        expect(screen.getByText('Respond')).toBeInTheDocument();
    });

    test('does not show respond button for own requests', () => {
        render(<SessionCard {...mockProps} />);

        expect(screen.queryByText('Respond')).not.toBeInTheDocument();
    });

    test('shows cancel button for pending and accepted sessions', () => {
        render(<SessionCard {...mockProps} />);

        expect(screen.getByText('Cancel')).toBeInTheDocument();

        const acceptedSession = { ...mockSession, status: 'accepted' };
        const { rerender } = render(<SessionCard {...mockProps} session={acceptedSession} />);

        expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('shows complete button for past accepted sessions', () => {
        const pastSession = {
            ...mockSession,
            status: 'accepted',
            scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
        };

        render(<SessionCard {...mockProps} session={pastSession} />);

        expect(screen.getByText('Mark Complete')).toBeInTheDocument();
    });

    test('shows upcoming badge for future accepted sessions', () => {
        const upcomingSession = {
            ...mockSession,
            status: 'accepted',
            scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
        };

        render(<SessionCard {...mockProps} session={upcomingSession} />);

        expect(screen.getByText('Upcoming')).toBeInTheDocument();
    });

    test('shows join meeting button for upcoming online sessions', () => {
        const upcomingSession = {
            ...mockSession,
            status: 'accepted',
            scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
        };

        render(<SessionCard {...mockProps} session={upcomingSession} />);

        expect(screen.getByText('Join Meeting')).toBeInTheDocument();
    });

    test('handles session cancellation', async () => {
        const user = userEvent.setup();
        render(<SessionCard {...mockProps} />);

        const cancelButton = screen.getByText('Cancel');
        await user.click(cancelButton);

        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to cancel this session?');

        await waitFor(() => {
            expect(sessionAPI.cancelSession).toHaveBeenCalledWith(mockSession._id, 'Cancelled by user');
        });

        expect(toast.success).toHaveBeenCalledWith('Session cancelled successfully');
        expect(mockProps.onUpdate).toHaveBeenCalledWith(mockSession._id, { status: 'cancelled' });
    });

    test('handles session completion', async () => {
        const user = userEvent.setup();
        const pastSession = {
            ...mockSession,
            status: 'accepted',
            scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
        };

        render(<SessionCard {...mockProps} session={pastSession} />);

        const completeButton = screen.getByText('Mark Complete');
        await user.click(completeButton);

        await waitFor(() => {
            expect(sessionAPI.completeSession).toHaveBeenCalledWith(mockSession._id, '');
        });

        expect(toast.success).toHaveBeenCalledWith('Session marked as completed');
        expect(mockProps.onUpdate).toHaveBeenCalledWith(mockSession._id, { status: 'completed' });
    });

    test('handles cancellation confirmation rejection', async () => {
        const user = userEvent.setup();
        window.confirm = jest.fn(() => false);

        render(<SessionCard {...mockProps} />);

        const cancelButton = screen.getByText('Cancel');
        await user.click(cancelButton);

        expect(window.confirm).toHaveBeenCalled();
        expect(sessionAPI.cancelSession).not.toHaveBeenCalled();
    });

    test('handles API error during cancellation', async () => {
        const user = userEvent.setup();
        sessionAPI.cancelSession.mockRejectedValue(new Error('Network error'));

        render(<SessionCard {...mockProps} />);

        const cancelButton = screen.getByText('Cancel');
        await user.click(cancelButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to cancel session');
        });
    });

    test('handles API error during completion', async () => {
        const user = userEvent.setup();
        sessionAPI.completeSession.mockRejectedValue(new Error('Network error'));

        const pastSession = {
            ...mockSession,
            status: 'accepted',
            scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
        };

        render(<SessionCard {...mockProps} session={pastSession} />);

        const completeButton = screen.getByText('Mark Complete');
        await user.click(completeButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to complete session');
        });
    });

    test('formats date and duration correctly', () => {
        render(<SessionCard {...mockProps} />);

        // Check that date is formatted (exact format may vary based on locale)
        expect(screen.getByText(/\d{1,2}\/\d{1,2}\/\d{4}/)).toBeInTheDocument();

        // Check duration formatting
        expect(screen.getByText('1h 30m')).toBeInTheDocument();
    });

    test('shows response message when available', () => {
        const sessionWithResponse = {
            ...mockSession,
            status: 'accepted',
            responseMessage: 'Looking forward to teaching you React!'
        };

        render(<SessionCard {...mockProps} session={sessionWithResponse} />);

        expect(screen.getByText('Response:')).toBeInTheDocument();
        expect(screen.getByText('Looking forward to teaching you React!')).toBeInTheDocument();
    });

    test('shows rejection reason when session is rejected', () => {
        const rejectedSession = {
            ...mockSession,
            status: 'rejected',
            reason: 'Not available at that time'
        };

        render(<SessionCard {...mockProps} session={rejectedSession} />);

        expect(screen.getByText('Reason:')).toBeInTheDocument();
        expect(screen.getByText('Not available at that time')).toBeInTheDocument();
    });

    test('opens response modal when respond button is clicked', async () => {
        const user = userEvent.setup();
        const receivedSession = {
            ...mockSession,
            currentUserId: 'provider123' // User is the provider
        };

        render(<SessionCard {...mockProps} session={receivedSession} />);

        const respondButton = screen.getByText('Respond');
        await user.click(respondButton);

        // Check if modal is opened (this would depend on the modal implementation)
        expect(screen.getByText('Respond to Session Request')).toBeInTheDocument();
    });
});