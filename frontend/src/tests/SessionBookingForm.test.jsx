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
        createSession: jest.fn(),
        checkConflicts: jest.fn()
    }
}));

import SessionBookingForm from '../components/sessions/SessionBookingForm';
import { sessionAPI } from '../utils/api';

describe('SessionBookingForm', () => {
    const mockProps = {
        providerId: '507f1f77bcf86cd799439011',
        providerName: 'John Doe',
        onSuccess: jest.fn(),
        onCancel: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        sessionAPI.checkConflicts.mockResolvedValue({ data: { conflicts: [] } });
        sessionAPI.createSession.mockResolvedValue({ data: { success: true } });
    });

    test('renders form with provider name', () => {
        render(<SessionBookingForm {...mockProps} />);

        expect(screen.getByText('Book a Session with John Doe')).toBeInTheDocument();
        expect(screen.getByText('Fill out the details below to request a skill exchange session.')).toBeInTheDocument();
    });

    test('renders all required form fields', () => {
        render(<SessionBookingForm {...mockProps} />);

        expect(screen.getByLabelText(/skill name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/level/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/date & time/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/session type/i)).toBeInTheDocument();
    });

    test('shows validation errors for required fields', async () => {
        const user = userEvent.setup();
        render(<SessionBookingForm {...mockProps} />);

        const submitButton = screen.getByText('Send Request');
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Skill name is required')).toBeInTheDocument();
            expect(screen.getByText('Category is required')).toBeInTheDocument();
            expect(screen.getByText('Date and time is required')).toBeInTheDocument();
        });
    });

    test('validates skill name length', async () => {
        const user = userEvent.setup();
        render(<SessionBookingForm {...mockProps} />);

        const skillNameInput = screen.getByLabelText(/skill name/i);
        await user.type(skillNameInput, 'A');

        const submitButton = screen.getByText('Send Request');
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Skill name must be at least 2 characters')).toBeInTheDocument();
        });
    });

    test('validates future date selection', async () => {
        const user = userEvent.setup();
        render(<SessionBookingForm {...mockProps} />);

        // Set a past date
        const dateInput = screen.getByLabelText(/date & time/i);
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        const pastDateString = pastDate.toISOString().slice(0, 16);

        await user.type(dateInput, pastDateString);

        const submitButton = screen.getByText('Send Request');
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Session must be scheduled for a future date and time')).toBeInTheDocument();
        });
    });

    test('shows meeting link field for online sessions', async () => {
        const user = userEvent.setup();
        render(<SessionBookingForm {...mockProps} />);

        const sessionTypeSelect = screen.getByLabelText(/session type/i);
        await user.selectOptions(sessionTypeSelect, 'online');

        expect(screen.getByLabelText(/meeting link/i)).toBeInTheDocument();
    });

    test('shows location field for in-person sessions', async () => {
        const user = userEvent.setup();
        render(<SessionBookingForm {...mockProps} />);

        const sessionTypeSelect = screen.getByLabelText(/session type/i);
        await user.selectOptions(sessionTypeSelect, 'in-person');

        expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    });

    test('checks for conflicts when date/time changes', async () => {
        const user = userEvent.setup();
        render(<SessionBookingForm {...mockProps} />);

        const dateInput = screen.getByLabelText(/date & time/i);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        const futureDateString = futureDate.toISOString().slice(0, 16);

        await user.type(dateInput, futureDateString);

        await waitFor(() => {
            expect(sessionAPI.checkConflicts).toHaveBeenCalledWith({
                dateTime: expect.any(String),
                duration: 60,
                participantId: mockProps.providerId
            });
        });
    });

    test('displays conflict warnings', async () => {
        const user = userEvent.setup();
        sessionAPI.checkConflicts.mockResolvedValue({
            data: { conflicts: ['Provider has another session at this time'] }
        });

        render(<SessionBookingForm {...mockProps} />);

        const dateInput = screen.getByLabelText(/date & time/i);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        const futureDateString = futureDate.toISOString().slice(0, 16);

        await user.type(dateInput, futureDateString);

        await waitFor(() => {
            expect(screen.getByText('Scheduling Conflicts Detected:')).toBeInTheDocument();
            expect(screen.getByText('Provider has another session at this time')).toBeInTheDocument();
        });
    });

    test('disables submit button when conflicts exist', async () => {
        const user = userEvent.setup();
        sessionAPI.checkConflicts.mockResolvedValue({
            data: { conflicts: ['Conflict detected'] }
        });

        render(<SessionBookingForm {...mockProps} />);

        const dateInput = screen.getByLabelText(/date & time/i);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        const futureDateString = futureDate.toISOString().slice(0, 16);

        await user.type(dateInput, futureDateString);

        await waitFor(() => {
            const submitButton = screen.getByText('Send Request');
            expect(submitButton).toBeDisabled();
        });
    });

    test('submits form with valid data', async () => {
        const user = userEvent.setup();
        render(<SessionBookingForm {...mockProps} />);

        // Fill out the form
        await user.type(screen.getByLabelText(/skill name/i), 'React Development');
        await user.selectOptions(screen.getByLabelText(/category/i), 'Programming');
        await user.selectOptions(screen.getByLabelText(/level/i), 'intermediate');

        const dateInput = screen.getByLabelText(/date & time/i);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        const futureDateString = futureDate.toISOString().slice(0, 16);
        await user.type(dateInput, futureDateString);

        await user.selectOptions(screen.getByLabelText(/duration/i), '90');
        await user.type(screen.getByLabelText(/message/i), 'Looking forward to learning React!');

        const submitButton = screen.getByText('Send Request');
        await user.click(submitButton);

        await waitFor(() => {
            expect(sessionAPI.createSession).toHaveBeenCalledWith({
                providerId: mockProps.providerId,
                skill: {
                    name: 'React Development',
                    category: 'Programming',
                    level: 'intermediate'
                },
                scheduledDate: expect.any(String),
                duration: 90,
                sessionType: 'online',
                requestMessage: 'Looking forward to learning React!'
            });
        });

        expect(toast.success).toHaveBeenCalledWith('Session request sent successfully!');
        expect(mockProps.onSuccess).toHaveBeenCalled();
    });

    test('handles API error during submission', async () => {
        const user = userEvent.setup();
        sessionAPI.createSession.mockRejectedValue({
            response: { data: { message: 'Provider is not available' } }
        });

        render(<SessionBookingForm {...mockProps} />);

        // Fill out required fields
        await user.type(screen.getByLabelText(/skill name/i), 'React Development');
        await user.selectOptions(screen.getByLabelText(/category/i), 'Programming');

        const dateInput = screen.getByLabelText(/date & time/i);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        const futureDateString = futureDate.toISOString().slice(0, 16);
        await user.type(dateInput, futureDateString);

        const submitButton = screen.getByText('Send Request');
        await user.click(submitButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Provider is not available');
        });
    });

    test('calls onCancel when cancel button is clicked', async () => {
        const user = userEvent.setup();
        render(<SessionBookingForm {...mockProps} />);

        const cancelButton = screen.getByText('Cancel');
        await user.click(cancelButton);

        expect(mockProps.onCancel).toHaveBeenCalled();
    });

    test('validates URL format for meeting link', async () => {
        const user = userEvent.setup();
        render(<SessionBookingForm {...mockProps} />);

        const sessionTypeSelect = screen.getByLabelText(/session type/i);
        await user.selectOptions(sessionTypeSelect, 'online');

        const meetingLinkInput = screen.getByLabelText(/meeting link/i);
        await user.type(meetingLinkInput, 'invalid-url');

        const submitButton = screen.getByText('Send Request');
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Please enter a valid URL')).toBeInTheDocument();
        });
    });

    test('shows loading state during submission', async () => {
        const user = userEvent.setup();
        // Mock a delayed response
        sessionAPI.createSession.mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 100))
        );

        render(<SessionBookingForm {...mockProps} />);

        // Fill out required fields
        await user.type(screen.getByLabelText(/skill name/i), 'React Development');
        await user.selectOptions(screen.getByLabelText(/category/i), 'Programming');

        const dateInput = screen.getByLabelText(/date & time/i);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        const futureDateString = futureDate.toISOString().slice(0, 16);
        await user.type(dateInput, futureDateString);

        const submitButton = screen.getByText('Send Request');
        await user.click(submitButton);

        expect(submitButton).toBeDisabled();
    });
});