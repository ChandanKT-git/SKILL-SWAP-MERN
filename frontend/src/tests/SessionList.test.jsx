import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
    error: jest.fn()
}));

// Mock the API
jest.mock('../utils/api', () => ({
    sessionAPI: {
        getUserSessions: jest.fn()
    }
}));

// Mock SessionCard component
jest.mock('../components/sessions/SessionCard', () => {
    return function MockSessionCard({ session, onUpdate, onDelete }) {
        return (
            <div data-testid={`session-card-${session._id}`}>
                <h3>{session.skill.name}</h3>
                <span>{session.status}</span>
                <button onClick={() => onUpdate(session._id, { status: 'updated' })}>
                    Update
                </button>
                <button onClick={() => onDelete(session._id)}>
                    Delete
                </button>
            </div>
        );
    };
});

import SessionList from '../components/sessions/SessionList';
import { sessionAPI } from '../utils/api';

describe('SessionList', () => {
    const mockSessions = [
        {
            _id: 'session1',
            skill: { name: 'React Development', category: 'Programming', level: 'intermediate' },
            status: 'pending',
            scheduledDate: new Date().toISOString(),
            duration: 60,
            sessionType: 'online'
        },
        {
            _id: 'session2',
            skill: { name: 'Guitar Lessons', category: 'Music', level: 'beginner' },
            status: 'accepted',
            scheduledDate: new Date().toISOString(),
            duration: 90,
            sessionType: 'in-person'
        }
    ];

    const mockApiResponse = {
        data: {
            sessions: mockSessions,
            pagination: {
                total: 2,
                totalPages: 1,
                page: 1,
                limit: 10
            }
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        sessionAPI.getUserSessions.mockResolvedValue(mockApiResponse);
    });

    test('renders loading spinner initially', () => {
        render(<SessionList />);

        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    test('fetches and displays sessions', async () => {
        render(<SessionList />);

        await waitFor(() => {
            expect(sessionAPI.getUserSessions).toHaveBeenCalledWith({
                page: 1,
                limit: 10
            });
        });

        expect(screen.getByTestId('session-card-session1')).toBeInTheDocument();
        expect(screen.getByTestId('session-card-session2')).toBeInTheDocument();
        expect(screen.getByText('React Development')).toBeInTheDocument();
        expect(screen.getByText('Guitar Lessons')).toBeInTheDocument();
    });

    test('displays session count', async () => {
        render(<SessionList />);

        await waitFor(() => {
            expect(screen.getByText('Showing 1 to 2 of 2 sessions')).toBeInTheDocument();
        });
    });

    test('shows filters when showFilters is true', () => {
        render(<SessionList showFilters={true} />);

        expect(screen.getByLabelText('Status')).toBeInTheDocument();
        expect(screen.getByLabelText('Type')).toBeInTheDocument();
        expect(screen.getByLabelText('Upcoming Only')).toBeInTheDocument();
    });

    test('hides filters when showFilters is false', () => {
        render(<SessionList showFilters={false} />);

        expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Type')).not.toBeInTheDocument();
    });

    test('filters sessions by status', async () => {
        const user = userEvent.setup();
        render(<SessionList />);

        await waitFor(() => {
            expect(screen.getByTestId('session-card-session1')).toBeInTheDocument();
        });

        const statusSelect = screen.getByLabelText('Status');
        await user.selectOptions(statusSelect, 'pending');

        await waitFor(() => {
            expect(sessionAPI.getUserSessions).toHaveBeenCalledWith({
                page: 1,
                limit: 10,
                status: 'pending'
            });
        });
    });

    test('filters sessions by type', async () => {
        const user = userEvent.setup();
        render(<SessionList />);

        await waitFor(() => {
            expect(screen.getByTestId('session-card-session1')).toBeInTheDocument();
        });

        const typeSelect = screen.getByLabelText('Type');
        await user.selectOptions(typeSelect, 'requested');

        await waitFor(() => {
            expect(sessionAPI.getUserSessions).toHaveBeenCalledWith({
                page: 1,
                limit: 10,
                type: 'requested'
            });
        });
    });

    test('filters upcoming sessions', async () => {
        const user = userEvent.setup();
        render(<SessionList />);

        await waitFor(() => {
            expect(screen.getByTestId('session-card-session1')).toBeInTheDocument();
        });

        const upcomingCheckbox = screen.getByLabelText('Upcoming Only');
        await user.click(upcomingCheckbox);

        await waitFor(() => {
            expect(sessionAPI.getUserSessions).toHaveBeenCalledWith({
                page: 1,
                limit: 10,
                upcoming: true
            });
        });
    });

    test('refreshes sessions when refresh button is clicked', async () => {
        const user = userEvent.setup();
        render(<SessionList />);

        await waitFor(() => {
            expect(screen.getByTestId('session-card-session1')).toBeInTheDocument();
        });

        const refreshButton = screen.getByText('Refresh');
        await user.click(refreshButton);

        await waitFor(() => {
            expect(sessionAPI.getUserSessions).toHaveBeenCalledTimes(2);
        });
    });

    test('handles session update', async () => {
        const user = userEvent.setup();
        render(<SessionList />);

        await waitFor(() => {
            expect(screen.getByTestId('session-card-session1')).toBeInTheDocument();
        });

        const updateButton = screen.getAllByText('Update')[0];
        await user.click(updateButton);

        // The session should be updated in the local state
        // This would be reflected in the SessionCard component
    });

    test('handles session deletion', async () => {
        const user = userEvent.setup();
        render(<SessionList />);

        await waitFor(() => {
            expect(screen.getByTestId('session-card-session1')).toBeInTheDocument();
            expect(screen.getByTestId('session-card-session2')).toBeInTheDocument();
        });

        const deleteButton = screen.getAllByText('Delete')[0];
        await user.click(deleteButton);

        // The session should be removed from the local state
        await waitFor(() => {
            expect(screen.queryByTestId('session-card-session1')).not.toBeInTheDocument();
            expect(screen.getByTestId('session-card-session2')).toBeInTheDocument();
        });
    });

    test('displays empty state when no sessions found', async () => {
        sessionAPI.getUserSessions.mockResolvedValue({
            data: {
                sessions: [],
                pagination: { total: 0, totalPages: 0, page: 1, limit: 10 }
            }
        });

        render(<SessionList />);

        await waitFor(() => {
            expect(screen.getByText('No sessions found')).toBeInTheDocument();
            expect(screen.getByText("You don't have any sessions yet. Start by booking a session with someone!")).toBeInTheDocument();
        });
    });

    test('displays filtered empty state', async () => {
        const user = userEvent.setup();
        sessionAPI.getUserSessions.mockResolvedValue({
            data: {
                sessions: [],
                pagination: { total: 0, totalPages: 0, page: 1, limit: 10 }
            }
        });

        render(<SessionList />);

        const statusSelect = screen.getByLabelText('Status');
        await user.selectOptions(statusSelect, 'completed');

        await waitFor(() => {
            expect(screen.getByText('No sessions found')).toBeInTheDocument();
            expect(screen.getByText('No sessions found with status "completed".')).toBeInTheDocument();
        });
    });

    test('handles API error', async () => {
        sessionAPI.getUserSessions.mockRejectedValue(new Error('Network error'));

        render(<SessionList />);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to load sessions');
        });
    });

    test('displays pagination when multiple pages exist', async () => {
        const multiPageResponse = {
            data: {
                sessions: mockSessions,
                pagination: {
                    total: 25,
                    totalPages: 3,
                    page: 1,
                    limit: 10
                }
            }
        };

        sessionAPI.getUserSessions.mockResolvedValue(multiPageResponse);

        render(<SessionList />);

        await waitFor(() => {
            expect(screen.getByText('Previous')).toBeInTheDocument();
            expect(screen.getByText('Next')).toBeInTheDocument();
            expect(screen.getByText('1')).toBeInTheDocument();
            expect(screen.getByText('2')).toBeInTheDocument();
            expect(screen.getByText('3')).toBeInTheDocument();
        });
    });

    test('navigates to next page', async () => {
        const user = userEvent.setup();
        const multiPageResponse = {
            data: {
                sessions: mockSessions,
                pagination: {
                    total: 25,
                    totalPages: 3,
                    page: 1,
                    limit: 10
                }
            }
        };

        sessionAPI.getUserSessions.mockResolvedValue(multiPageResponse);

        render(<SessionList />);

        await waitFor(() => {
            expect(screen.getByText('Next')).toBeInTheDocument();
        });

        const nextButton = screen.getByText('Next');
        await user.click(nextButton);

        await waitFor(() => {
            expect(sessionAPI.getUserSessions).toHaveBeenCalledWith({
                page: 2,
                limit: 10
            });
        });
    });

    test('applies initial filters', async () => {
        const initialFilters = { status: 'pending', upcoming: true };
        render(<SessionList initialFilters={initialFilters} />);

        await waitFor(() => {
            expect(sessionAPI.getUserSessions).toHaveBeenCalledWith({
                page: 1,
                limit: 10,
                status: 'pending',
                upcoming: true
            });
        });
    });

    test('resets page when filters change', async () => {
        const user = userEvent.setup();
        const multiPageResponse = {
            data: {
                sessions: mockSessions,
                pagination: {
                    total: 25,
                    totalPages: 3,
                    page: 2,
                    limit: 10
                }
            }
        };

        sessionAPI.getUserSessions.mockResolvedValue(multiPageResponse);

        render(<SessionList />);

        // Go to page 2
        await waitFor(() => {
            expect(screen.getByText('2')).toBeInTheDocument();
        });

        const page2Button = screen.getByText('2');
        await user.click(page2Button);

        // Change filter - should reset to page 1
        const statusSelect = screen.getByLabelText('Status');
        await user.selectOptions(statusSelect, 'pending');

        await waitFor(() => {
            expect(sessionAPI.getUserSessions).toHaveBeenLastCalledWith({
                page: 1,
                limit: 10,
                status: 'pending'
            });
        });
    });
});