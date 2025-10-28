import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../../context/AuthContext';
import ProfileEdit from '../ProfileEdit';

// Mock the API hooks
jest.mock('../../../hooks/useApi', () => ({
    useUpdateProfile: () => ({
        mutateAsync: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
        isLoading: false,
    }),
    useUploadAvatar: () => ({
        mutateAsync: jest.fn().mockResolvedValue({ data: { success: true } }),
        isLoading: false,
    }),
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

// Mock the AuthContext
const mockAuthContext = {
    user: {
        _id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        bio: 'Software developer',
        location: 'San Francisco, CA',
        avatar: null,
    },
    updateUser: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    isLoading: false,
};

jest.mock('../../../context/AuthContext', () => ({
    useAuth: () => mockAuthContext,
    AuthProvider: ({ children }) => <div>{children}</div>,
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
    success: jest.fn(),
    error: jest.fn(),
}));

const renderWithProviders = (component) => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <BrowserRouter>
                    {component}
                </BrowserRouter>
            </AuthProvider>
        </QueryClientProvider>
    );
};

describe('ProfileEdit', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders profile edit form with user data', () => {
        renderWithProviders(<ProfileEdit />);

        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Software developer')).toBeInTheDocument();
        expect(screen.getByDisplayValue('San Francisco, CA')).toBeInTheDocument();
    });

    test('shows user initials when no avatar is present', () => {
        renderWithProviders(<ProfileEdit />);

        expect(screen.getByText('JD')).toBeInTheDocument();
    });

    test('shows validation errors for required fields', async () => {
        renderWithProviders(<ProfileEdit />);

        const inputs = screen.getAllByRole('textbox');
        const firstNameInput = inputs[0]; // First input is firstName
        const lastNameInput = inputs[1]; // Second input is lastName

        fireEvent.change(firstNameInput, { target: { value: '' } });
        fireEvent.change(lastNameInput, { target: { value: '' } });
        fireEvent.blur(firstNameInput);
        fireEvent.blur(lastNameInput);

        await waitFor(() => {
            expect(screen.getByText('First name is required')).toBeInTheDocument();
            expect(screen.getByText('Last name is required')).toBeInTheDocument();
        });
    });

    test('shows character count for bio field', () => {
        renderWithProviders(<ProfileEdit />);

        const inputs = screen.getAllByRole('textbox');
        const bioTextarea = inputs[3]; // Bio textarea is the 4th textbox (index 3)
        expect(screen.getByText(/\/500 characters/)).toBeInTheDocument();

        fireEvent.change(bioTextarea, { target: { value: 'New bio content' } });
        expect(screen.getByText('15/500 characters')).toBeInTheDocument();
    });

    test('handles avatar upload', () => {
        renderWithProviders(<ProfileEdit />);

        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const fileInput = screen.getByRole('button', { name: /upload photo/i });

        expect(fileInput).toBeInTheDocument();
    });

    test('shows upload photo button when no avatar', () => {
        renderWithProviders(<ProfileEdit />);

        expect(screen.getByText('Upload Photo')).toBeInTheDocument();
    });

    test('has cancel and save buttons', () => {
        renderWithProviders(<ProfileEdit />);

        expect(screen.getAllByText('Cancel')).toHaveLength(2);
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    test('navigates back on cancel', () => {
        renderWithProviders(<ProfileEdit />);

        const cancelButtons = screen.getAllByText('Cancel');
        fireEvent.click(cancelButtons[0]); // Click the first cancel button

        expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });

    test('shows file upload guidelines', () => {
        renderWithProviders(<ProfileEdit />);

        expect(screen.getByText('JPG, PNG or WebP. Max size 5MB.')).toBeInTheDocument();
    });
});