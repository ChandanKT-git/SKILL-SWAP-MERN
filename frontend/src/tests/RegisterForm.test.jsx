import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Register from '../pages/Register';
import { AuthProvider } from '../context/AuthContext';
import '@testing-library/jest-dom';

const MockedRegister = () => (
    <BrowserRouter>
        <AuthProvider>
            <Register />
        </AuthProvider>
    </BrowserRouter>
);

describe('RegisterForm', () => {
    it('should render registration form', () => {
        render(<MockedRegister />);

        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
        render(<MockedRegister />);

        const submitButton = screen.getByRole('button', { name: /sign up/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        });
    });

    it('should validate password strength', async () => {
        render(<MockedRegister />);

        const passwordInput = screen.getByLabelText(/^password$/i);
        fireEvent.change(passwordInput, { target: { value: 'weak' } });
        fireEvent.blur(passwordInput);

        await waitFor(() => {
            expect(screen.getByText(/password must be at least/i)).toBeInTheDocument();
        });
    });

    it('should handle successful registration', async () => {
        render(<MockedRegister />);

        fireEvent.change(screen.getByLabelText(/first name/i), {
            target: { value: 'John' },
        });
        fireEvent.change(screen.getByLabelText(/last name/i), {
            target: { value: 'Doe' },
        });
        fireEvent.change(screen.getByLabelText(/email/i), {
            target: { value: 'john@example.com' },
        });
        fireEvent.change(screen.getByLabelText(/^password$/i), {
            target: { value: 'Password123!' },
        });

        const submitButton = screen.getByRole('button', { name: /sign up/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(submitButton).toBeDisabled();
        });
    });
});
