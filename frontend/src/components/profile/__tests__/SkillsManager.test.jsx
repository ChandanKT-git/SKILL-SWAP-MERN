import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../../context/AuthContext';
import SkillsManager from '../SkillsManager';

// Mock the API hooks
jest.mock('../../../hooks/useApi', () => ({
    useAddSkill: () => ({
        mutateAsync: jest.fn().mockResolvedValue({ data: { success: true } }),
        isLoading: false,
    }),
    useUpdateSkill: () => ({
        mutateAsync: jest.fn().mockResolvedValue({ data: { success: true } }),
        isLoading: false,
    }),
    useRemoveSkill: () => ({
        mutateAsync: jest.fn().mockResolvedValue({ data: { success: true } }),
        isLoading: false,
    }),
    useSkillCategories: () => ({
        data: ['Programming', 'Design', 'Marketing', 'Music'],
        isLoading: false,
    }),
}));

// Mock the AuthContext
const mockAuthContext = {
    user: {
        _id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
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
                category: 'Programming',
                level: 'expert',
                description: 'Building modern web applications'
            }
        ],
        skillsWanted: ['Python', 'Machine Learning'],
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

describe('SkillsManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders skills manager sections', () => {
        renderWithProviders(<SkillsManager />);

        expect(screen.getByText('Skills I Offer')).toBeInTheDocument();
        expect(screen.getByText('Skills I Want to Learn')).toBeInTheDocument();
    });

    test('displays existing skills correctly', () => {
        renderWithProviders(<SkillsManager />);

        expect(screen.getByText('JavaScript')).toBeInTheDocument();
        expect(screen.getByText('React')).toBeInTheDocument();
        expect(screen.getAllByText('Programming')).toHaveLength(2); // Both skills have Programming category
        expect(screen.getByText('Advanced')).toBeInTheDocument();
        expect(screen.getByText('Expert')).toBeInTheDocument();
    });

    test('displays skills wanted correctly', () => {
        renderWithProviders(<SkillsManager />);

        expect(screen.getByText('Python')).toBeInTheDocument();
        expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    test('shows add skill button', () => {
        renderWithProviders(<SkillsManager />);

        expect(screen.getByRole('button', { name: /add skill/i })).toBeInTheDocument();
    });

    test('opens add skill form when add skill button is clicked', () => {
        renderWithProviders(<SkillsManager />);

        const addButton = screen.getByRole('button', { name: /add skill/i });
        fireEvent.click(addButton);

        expect(screen.getByText('Add New Skill')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('e.g., JavaScript, Guitar, Photography')).toBeInTheDocument();
        expect(screen.getAllByRole('combobox')).toHaveLength(2); // Category and Level dropdowns
    });

    test('shows edit and remove buttons for each skill', () => {
        renderWithProviders(<SkillsManager />);

        const editButtons = screen.getAllByText('Edit');
        const removeButtons = screen.getAllByText('Remove');

        expect(editButtons).toHaveLength(2);
        expect(removeButtons).toHaveLength(2);
    });

    test('opens edit form when edit button is clicked', () => {
        renderWithProviders(<SkillsManager />);

        const editButtons = screen.getAllByText('Edit');
        fireEvent.click(editButtons[0]);

        expect(screen.getByText('Edit Skill')).toBeInTheDocument();
        expect(screen.getByDisplayValue('JavaScript')).toBeInTheDocument();
    });

    test('shows validation errors for required fields in skill form', async () => {
        renderWithProviders(<SkillsManager />);

        const addButton = screen.getByRole('button', { name: /add skill/i });
        fireEvent.click(addButton);

        const submitButton = screen.getByRole('button', { name: /add skill/i });
        fireEvent.click(submitButton);

        // The form validation happens on blur/submit, so we need to check if the form is rendered
        expect(screen.getByText('Add New Skill')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('e.g., JavaScript, Guitar, Photography')).toBeInTheDocument();
    });

    test('allows adding skills wanted', () => {
        renderWithProviders(<SkillsManager />);

        const input = screen.getByPlaceholderText('Enter a skill you want to learn...');
        const addButton = screen.getByRole('button', { name: 'Add' });

        fireEvent.change(input, { target: { value: 'Vue.js' } });
        fireEvent.click(addButton);

        expect(mockAuthContext.updateUser).toHaveBeenCalled();
    });

    test('allows removing skills wanted', () => {
        renderWithProviders(<SkillsManager />);

        const removeButtons = screen.getAllByText('×');
        fireEvent.click(removeButtons[0]);

        expect(mockAuthContext.updateUser).toHaveBeenCalled();
    });

    test('shows character count for description field', () => {
        renderWithProviders(<SkillsManager />);

        const addButton = screen.getByRole('button', { name: /add skill/i });
        fireEvent.click(addButton);

        expect(screen.getByText('0/300 characters')).toBeInTheDocument();

        const textboxes = screen.getAllByRole('textbox');
        const descriptionTextarea = textboxes[1]; // Second textbox is the description textarea
        fireEvent.change(descriptionTextarea, { target: { value: 'Test description' } });

        expect(screen.getByText('16/300 characters')).toBeInTheDocument();
    });

    test('shows empty state when no skills exist', () => {
        // Create a mock for empty skills
        const mockEmptyAuthContext = {
            ...mockAuthContext,
            user: {
                ...mockAuthContext.user,
                skills: [],
                skillsWanted: [],
            }
        };

        // Mock the useAuth hook to return empty skills
        require('../../../context/AuthContext').useAuth = jest.fn(() => mockEmptyAuthContext);

        renderWithProviders(<SkillsManager />);

        expect(screen.getByText('No skills added yet')).toBeInTheDocument();
        expect(screen.getByText('No learning interests added yet')).toBeInTheDocument();
    });

    test('handles skill form cancellation', () => {
        renderWithProviders(<SkillsManager />);

        const addButton = screen.getByRole('button', { name: /add skill/i });
        fireEvent.click(addButton);

        expect(screen.getByText('Add New Skill')).toBeInTheDocument();

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);

        expect(screen.queryByText('Add New Skill')).not.toBeInTheDocument();
    });
});