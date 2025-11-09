import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import { AuthProvider } from '../context/AuthContext';
import '@testing-library/jest-dom';

const mockUser = {
    id: 'user123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
};

jest.mock('../context/AuthContext', () => ({
    ...jest.requireActual('../context/AuthContext'),
    useAuth: () => ({
        user: mockUser,
        isAuthenticated: true,
    }),
}));

const MockedDashboard = () => (
    <BrowserRouter>
        <AuthProvider>
            <Dashboard />
        </AuthProvider>
    </BrowserRouter>
);

describe('Dashboard', () => {
    it('should render dashboard for authenticated user', async () => {
        render(<MockedDashboard />);

        await waitFor(() => {
            expect(screen.getByText(/welcome/i)).toBeInTheDocument();
        });
    });

    it('should display user information', async () => {
        render(<MockedDashboard />);

        await waitFor(() => {
            expect(screen.getByText(/john/i)).toBeInTheDocument();
        });
    });

    it('should show navigation links', () => {
        render(<MockedDashboard />);

        expect(screen.getByText(/profile/i)).toBeInTheDocument();
        expect(screen.getByText(/search/i)).toBeInTheDocument();
        expect(screen.getByText(/sessions/i)).toBeInTheDocument();
    });
});
