import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProfileView from '../components/profile/ProfileView';
import { AuthProvider } from '../context/AuthContext';

// Mock the AuthContext
const mockAuthContext = {
    user: {
        _id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        bio: 'Software developer with 5 years of experience',
        location: 'San Francisco, CA',
        avatar: null,
        skills: [
            {
                _id: 'skill1',
                name: 'JavaScript',
                category: 'Programming',
                level: 'advanced',
                description: 'Full-stack JavaScript development'
            },
            {
                _id: 'skill2',
                name: 'React',
                category: 'Frontend',
                level: 'expert',
                description: 'Building modern web applications'
            }
        ],
        skillsWanted: ['Python', 'Machine Learning'],
        rating: {
            average: 4.5,
            count: 10
        },
        createdAt: '2023-01-01T00:00:00.000Z'
    },
    updateUser: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    isLoading: false
};

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>
}));

// Mock the AuthContext
jest.mock('../context/AuthContext', () => ({
    useAuth: () => mockAuthContext,
    AuthProvider: ({ children }) => <div>{children}</div>
}));

// Mock Button component
jest.mock('../components/common/Button', () => {
    return function Button({ children, ...props }) {
        return <button {...props}>{children}</button>;
    };
});

// Mock LoadingSpinner component
jest.mock('../components/common/LoadingSpinner', () => {
    return function LoadingSpinner() {
        return <div data-testid="loading-spinner">Loading...</div>;
    };
});

const renderWithProviders = (component) => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false }
        }
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <AuthProvider>
                    {component}
                </AuthProvider>
            </BrowserRouter>
        </QueryClientProvider>
    );
};

describe('ProfileView', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders user profile information correctly', () => {
        renderWithProviders(<ProfileView isOwnProfile={true} />);

        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
        expect(screen.getByText('Software developer with 5 years of experience')).toBeInTheDocument();
        expect(screen.getByText('4.5 (10 reviews)')).toBeInTheDocument();
    });

    test('displays skills offered correctly', () => {
        renderWithProviders(<ProfileView isOwnProfile={true} />);

        expect(screen.getByText('Skills I Offer')).toBeInTheDocument();
        expect(screen.getByText('JavaScript')).toBeInTheDocument();
        expect(screen.getByText('React')).toBeInTheDocument();
        expect(screen.getByText('Programming')).toBeInTheDocument();
        expect(screen.getByText('Frontend')).toBeInTheDocument();
        expect(screen.getByText('Advanced')).toBeInTheDocument();
        expect(screen.getByText('Expert')).toBeInTheDocument();
    });

    test('displays skills wanted correctly', () => {
        renderWithProviders(<ProfileView isOwnProfile={true} />);

        expect(screen.getByText('Skills I Want to Learn')).toBeInTheDocument();
        expect(screen.getByText('Python')).toBeInTheDocument();
        expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    test('shows edit profile button for own profile', () => {
        renderWithProviders(<ProfileView isOwnProfile={true} />);

        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
        expect(screen.getByText('Manage')).toBeInTheDocument();
    });

    test('does not show edit buttons for other users profile', () => {
        renderWithProviders(<ProfileView isOwnProfile={false} />);

        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
        expect(screen.queryByText('Manage')).not.toBeInTheDocument();
    });

    test('shows action buttons for other users', () => {
        renderWithProviders(<ProfileView isOwnProfile={false} />);

        expect(screen.getByText('Request Session')).toBeInTheDocument();
        expect(screen.getByText('Send Message')).toBeInTheDocument();
    });

    test('displays loading spinner when loading', () => {
        renderWithProviders(<ProfileView isLoading={true} />);

        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    test('displays profile not found message when user is null', () => {
        // Temporarily mock useAuth to return null user
        const originalUseAuth = require('../context/AuthContext').useAuth;
        require('../context/AuthContext').useAuth = jest.fn(() => ({
            ...mockAuthContext,
            user: null
        }));

        renderWithProviders(<ProfileView user={null} />);

        expect(screen.getByText('Profile not found')).toBeInTheDocument();

        // Restore original mock
        require('../context/AuthContext').useAuth = originalUseAuth;
    });

    test('displays empty state for skills when no skills exist', () => {
        const userWithoutSkills = {
            ...mockAuthContext.user,
            skills: [],
            skillsWanted: []
        };

        renderWithProviders(<ProfileView user={userWithoutSkills} isOwnProfile={true} />);

        expect(screen.getByText('Add your first skill to get started')).toBeInTheDocument();
        expect(screen.getByText('Add skills you want to learn')).toBeInTheDocument();
    });

    test('displays user initials when no avatar is present', () => {
        renderWithProviders(<ProfileView isOwnProfile={true} />);

        expect(screen.getByText('JD')).toBeInTheDocument();
    });

    test('displays member since date', () => {
        renderWithProviders(<ProfileView isOwnProfile={true} />);

        expect(screen.getByText(/Member since/)).toBeInTheDocument();
    });
});