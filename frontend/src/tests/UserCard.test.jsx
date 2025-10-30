import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import UserCard from '../components/search/UserCard';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate
}));

const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('UserCard', () => {
    const mockOnBookSession = jest.fn();

    const mockUser = {
        _id: 'user123',
        firstName: 'John',
        lastName: 'Doe',
        title: 'Software Developer',
        bio: 'Experienced full-stack developer with a passion for teaching',
        avatar: 'https://example.com/avatar.jpg',
        location: 'San Francisco, CA',
        skillsOffered: ['JavaScript', 'React', 'Node.js', 'Python', 'MongoDB'],
        rating: {
            average: 4.5,
            count: 12
        },
        availability: [
            { day: 'monday', startTime: '09:00', endTime: '17:00' },
            { day: 'tuesday', startTime: '09:00', endTime: '17:00' }
        ],
        sessionStats: {
            completed: 25,
            responseRate: 95
        },
        distance: 2.5,
        isOnline: true
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders user information correctly', () => {
        renderWithRouter(
            <UserCard user={mockUser} onBookSession={mockOnBookSession} />
        );

        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Software Developer')).toBeInTheDocument();
        expect(screen.getByText('Experienced full-stack developer with a passion for teaching')).toBeInTheDocument();
        expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
    });

    test('displays user avatar when available', () => {
        renderWithRouter(
            <UserCard user={mockUser} onBookSession={mockOnBookSession} />
        );

        const avatar = screen.getByAltText('John Doe');
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    test('displays user initials when no avatar', () => {
        const userWithoutAvatar = { ...mockUser, avatar: null };

        renderWithRouter(
            <UserCard user={userWithoutAvatar} onBookSession={mockOnBookSession} />
        );

        // Should show initials or user icon
        expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    });

    test('displays rating with stars', () => {
        renderWithRouter(
            <UserCard user={mockUser} onBookSession={mockOnBookSession} />
        );

        expect(screen.getByText('4.5 (12 reviews)')).toBeInTheDocument();
    });

    test('displays skills offered with limit', () => {
        renderWithRouter(
            <UserCard user={mockUser} onBookSession={mockOnBookSession} />
        );

        expect(screen.getByText('JavaScript')).toBeInTheDocument();
        expect(screen.getByText('React')).toBeInTheDocument();
        expect(screen.getByText('Node.js')).toBeInTheDocument();
        expect(screen.getByText('Python')).toBeInTheDocument();
        expect(screen.getByText('+1 more')).toBeInTheDocument(); // 5 skills, showing 4 + more
    });

    test('displays online status when user is online', () => {
        renderWithRouter(
            <UserCard user={mockUser} onBookSession={mockOnBookSession} />
        );

        expect(screen.getByText('Online')).toBeInTheDocument();
    });

    test('displays distance when available', () => {
        renderWithRouter(
            <UserCard user={mockUser} onBookSession={mockOnBookSession} />
        );

        expect(screen.getByText('2.5 miles away')).toBeInTheDocument();
    });

    test('displays session statistics', () => {
        renderWithRouter(
            <UserCard user={mockUser} onBookSession={mockOnBookSession} />
        );

        expect(screen.getByText('25 sessions completed')).toBeInTheDocument();
        expect(screen.getByText('Response rate: 95%')).toBeInTheDocument();
    });

    test('navigates to user profile when card is clicked', async () => {
        const user = userEvent.setup();
        renderWithRouter(
            <UserCard user={mockUser} onBookSession={mockOnBookSession} />
        );

        const card = screen.getByText('John Doe').closest('div');
        await user.click(card);

        expect(mockNavigate).toHaveBeenCalledWith('/profile/user123');
    });

    test('calls onBookSession when book session button is clicked', async () => {
        const user = userEvent.setup();
        renderWithRouter(
            <UserCard user={mockUser} onBookSession={mockOnBookSession} />
        );

        const bookButton = screen.getByText('Book Session');
        await user.click(bookButton);

        expect(mockOnBookSession).toHaveBeenCalledWith(mockUser);
        expect(mockNavigate).not.toHaveBeenCalled(); // Should not navigate to profile
    });

    test('navigates to chat when chat button is clicked', async () => {
        const user = userEvent.setup();
        renderWithRouter(
            <UserCard user={mockUser} onBookSession={mockOnBookSession} />
        );

        const chatButton = screen.getByRole('button', { name: '' }); // Chat icon button
        await user.click(chatButton);

        expect(mockNavigate).toHaveBeenCalledWith('/chat/user123');
    });

    test('displays availability status correctly', () => {
        renderWithRouter(
            <UserCard user={mockUser} onBookSession={mockOnBookSession} />
        );

        // Should show some availability status
        expect(screen.getByText(/Available/)).toBeInTheDocument();
    });

    test('handles user without rating', () => {
        const userWithoutRating = { ...mockUser, rating: null };

        renderWithRouter(
            <UserCard user={userWithoutRating} onBookSession={mockOnBookSession} />
        );

        // Should not crash and should not display rating
        expect(screen.queryByText(/reviews/)).not.toBeInTheDocument();
    });

    test('handles user without skills', () => {
        const userWithoutSkills = { ...mockUser, skillsOffered: [] };

        renderWithRouter(
            <UserCard user={userWithoutSkills} onBookSession={mockOnBookSession} />
        );

        // Should still render the skills section but empty
        expect(screen.getByText('Skills Offered')).toBeInTheDocument();
    });

    test('handles user without location', () => {
        const userWithoutLocation = { ...mockUser, location: null };

        renderWithRouter(
            <UserCard user={userWithoutLocation} onBookSession={mockOnBookSession} />
        );

        // Should not display location
        expect(screen.queryByText('San Francisco, CA')).not.toBeInTheDocument();
    });

    test('handles user without session stats', () => {
        const userWithoutStats = { ...mockUser, sessionStats: null };

        renderWithRouter(
            <UserCard user={userWithoutStats} onBookSession={mockOnBookSession} />
        );

        // Should not display session stats
        expect(screen.queryByText(/sessions completed/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Response rate/)).not.toBeInTheDocument();
    });

    test('displays correct availability status for different scenarios', () => {
        // Test with no availability
        const userWithoutAvailability = { ...mockUser, availability: [] };

        renderWithRouter(
            <UserCard user={userWithoutAvailability} onBookSession={mockOnBookSession} />
        );

        expect(screen.getByText('Availability not set')).toBeInTheDocument();
    });

    test('applies custom className', () => {
        const { container } = renderWithRouter(
            <UserCard
                user={mockUser}
                onBookSession={mockOnBookSession}
                className="custom-class"
            />
        );

        expect(container.firstChild).toHaveClass('custom-class');
    });

    test('stops event propagation on button clicks', async () => {
        const user = userEvent.setup();
        const mockCardClick = jest.fn();

        renderWithRouter(
            <div onClick={mockCardClick}>
                <UserCard user={mockUser} onBookSession={mockOnBookSession} />
            </div>
        );

        const bookButton = screen.getByText('Book Session');
        await user.click(bookButton);

        // Card click should not be triggered when button is clicked
        expect(mockCardClick).not.toHaveBeenCalled();
    });
});