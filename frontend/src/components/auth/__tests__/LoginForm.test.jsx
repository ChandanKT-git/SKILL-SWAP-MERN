import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../../context/AuthContext';
import LoginForm from '../LoginForm';

// Mock the API hooks
jest.mock('../../../hooks/useApi', () => ({
    useLogin: () => ({
        mutateAsync: jest.fn(),
        isLoading: false,
    }),
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

describe('LoginForm', () => {
    test('renders login form elements', () => {
        renderWithProviders(<LoginForm />);

        expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    test('shows validation errors for empty fields', async () => {
        renderWithProviders(<LoginForm />);

        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        // Focus and blur to trigger validation
        fireEvent.focus(emailInput);
        fireEvent.blur(emailInput);
        fireEvent.focus(passwordInput);
        fireEvent.blur(passwordInput);

        // Try to submit the form
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Email is required')).toBeInTheDocument();
            expect(screen.getByText('Password is required')).toBeInTheDocument();
        });
    });

    test('shows validation error for invalid email', async () => {
        renderWithProviders(<LoginForm />);

        const emailInput = screen.getByLabelText(/email address/i);
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
        fireEvent.blur(emailInput);

        await waitFor(() => {
            expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
        });
    });

    test('toggles password visibility', () => {
        renderWithProviders(<LoginForm />);

        const passwordInput = screen.getByLabelText(/password/i);
        const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button

        expect(passwordInput.type).toBe('password');

        fireEvent.click(toggleButton);
        expect(passwordInput.type).toBe('text');

        fireEvent.click(toggleButton);
        expect(passwordInput.type).toBe('password');
    });

    test('has link to registration page', () => {
        renderWithProviders(<LoginForm />);

        const registerLink = screen.getByText('create a new account');
        expect(registerLink).toBeInTheDocument();
        expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
    });

    test('has forgot password link', () => {
        renderWithProviders(<LoginForm />);

        const forgotPasswordLink = screen.getByText('Forgot your password?');
        expect(forgotPasswordLink).toBeInTheDocument();
        expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/forgot-password');
    });
});