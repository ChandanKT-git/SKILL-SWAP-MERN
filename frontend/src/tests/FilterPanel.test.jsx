import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FilterPanel from '../components/search/FilterPanel';

// Mock the useSkillCategories hook
jest.mock('../hooks/useApi', () => ({
    useSkillCategories: () => ({
        data: [
            { name: 'Programming', count: 25 },
            { name: 'Design', count: 15 },
            { name: 'Languages', count: 10 }
        ]
    })
}));

const renderWithProviders = (component) => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false }
        }
    });

    return render(
        <QueryClientProvider client={queryClient}>
            {component}
        </QueryClientProvider>
    );
};

describe('FilterPanel', () => {
    const mockOnFiltersChange = jest.fn();
    const mockOnToggle = jest.fn();

    const defaultFilters = {
        location: '',
        minRating: 0,
        maxDistance: '',
        availability: [],
        skillLevel: [],
        categories: [],
        sortBy: 'relevance'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders filter button when closed', () => {
        renderWithProviders(
            <FilterPanel
                filters={defaultFilters}
                onFiltersChange={mockOnFiltersChange}
                isOpen={false}
                onToggle={mockOnToggle}
            />
        );

        expect(screen.getByText('Filters')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
    });

    test('shows active filter count on button when filters are applied', () => {
        const filtersWithValues = {
            ...defaultFilters,
            location: 'San Francisco',
            minRating: 4,
            availability: ['weekdays']
        };

        renderWithProviders(
            <FilterPanel
                filters={filtersWithValues}
                onFiltersChange={mockOnFiltersChange}
                isOpen={false}
                onToggle={mockOnToggle}
            />
        );

        expect(screen.getByText('3')).toBeInTheDocument(); // 3 active filters
    });

    test('renders full filter panel when open', () => {
        renderWithProviders(
            <FilterPanel
                filters={defaultFilters}
                onFiltersChange={mockOnFiltersChange}
                isOpen={true}
                onToggle={mockOnToggle}
            />
        );

        expect(screen.getByText('Location')).toBeInTheDocument();
        expect(screen.getByText('Minimum Rating')).toBeInTheDocument();
        expect(screen.getByText('Availability')).toBeInTheDocument();
        expect(screen.getByText('Skill Level')).toBeInTheDocument();
        expect(screen.getByText('Sort by')).toBeInTheDocument();
    });

    test('updates location filter', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <FilterPanel
                filters={defaultFilters}
                onFiltersChange={mockOnFiltersChange}
                isOpen={true}
                onToggle={mockOnToggle}
            />
        );

        const locationInput = screen.getByPlaceholderText('Enter city or zip code');
        await user.type(locationInput, 'San Francisco');

        expect(mockOnFiltersChange).toHaveBeenCalledWith({
            ...defaultFilters,
            location: 'San Francisco'
        });
    });

    test('updates rating filter', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <FilterPanel
                filters={defaultFilters}
                onFiltersChange={mockOnFiltersChange}
                isOpen={true}
                onToggle={mockOnToggle}
            />
        );

        const ratingRadio = screen.getByDisplayValue('4');
        await user.click(ratingRadio);

        expect(mockOnFiltersChange).toHaveBeenCalledWith({
            ...defaultFilters,
            minRating: 4
        });
    });

    test('updates availability filters', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <FilterPanel
                filters={defaultFilters}
                onFiltersChange={mockOnFiltersChange}
                isOpen={true}
                onToggle={mockOnToggle}
            />
        );

        const weekdaysCheckbox = screen.getByLabelText('Weekdays');
        await user.click(weekdaysCheckbox);

        expect(mockOnFiltersChange).toHaveBeenCalledWith({
            ...defaultFilters,
            availability: ['weekdays']
        });
    });

    test('updates skill level filters', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <FilterPanel
                filters={defaultFilters}
                onFiltersChange={mockOnFiltersChange}
                isOpen={true}
                onToggle={mockOnToggle}
            />
        );

        const beginnerCheckbox = screen.getByLabelText('Beginner');
        await user.click(beginnerCheckbox);

        expect(mockOnFiltersChange).toHaveBeenCalledWith({
            ...defaultFilters,
            skillLevel: ['beginner']
        });
    });

    test('updates sort option', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <FilterPanel
                filters={defaultFilters}
                onFiltersChange={mockOnFiltersChange}
                isOpen={true}
                onToggle={mockOnToggle}
            />
        );

        const sortSelect = screen.getByDisplayValue('Most Relevant');
        await user.selectOptions(sortSelect, 'rating');

        expect(mockOnFiltersChange).toHaveBeenCalledWith({
            ...defaultFilters,
            sortBy: 'rating'
        });
    });

    test('clears all filters when clear all is clicked', async () => {
        const user = userEvent.setup();
        const filtersWithValues = {
            ...defaultFilters,
            location: 'San Francisco',
            minRating: 4,
            availability: ['weekdays']
        };

        renderWithProviders(
            <FilterPanel
                filters={filtersWithValues}
                onFiltersChange={mockOnFiltersChange}
                isOpen={true}
                onToggle={mockOnToggle}
            />
        );

        const clearAllButton = screen.getByText('Clear all');
        await user.click(clearAllButton);

        expect(mockOnFiltersChange).toHaveBeenCalledWith({
            location: '',
            minRating: 0,
            maxDistance: '',
            availability: [],
            skillLevel: [],
            categories: [],
            sortBy: 'relevance'
        });
    });

    test('toggles filter sections', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <FilterPanel
                filters={defaultFilters}
                onFiltersChange={mockOnFiltersChange}
                isOpen={true}
                onToggle={mockOnToggle}
            />
        );

        // Location section should be expanded by default
        expect(screen.getByPlaceholderText('Enter city or zip code')).toBeInTheDocument();

        // Click to collapse location section
        const locationHeader = screen.getByText('Location');
        await user.click(locationHeader);

        // Location input should be hidden
        await waitFor(() => {
            expect(screen.queryByPlaceholderText('Enter city or zip code')).not.toBeInTheDocument();
        });
    });

    test('displays category filters when categories are available', () => {
        renderWithProviders(
            <FilterPanel
                filters={defaultFilters}
                onFiltersChange={mockOnFiltersChange}
                isOpen={true}
                onToggle={mockOnToggle}
            />
        );

        expect(screen.getByText('Categories')).toBeInTheDocument();
        expect(screen.getByText('Programming')).toBeInTheDocument();
        expect(screen.getByText('Design')).toBeInTheDocument();
        expect(screen.getByText('Languages')).toBeInTheDocument();
    });

    test('updates category filters', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <FilterPanel
                filters={defaultFilters}
                onFiltersChange={mockOnFiltersChange}
                isOpen={true}
                onToggle={mockOnToggle}
            />
        );

        // First expand the categories section
        const categoriesHeader = screen.getByText('Categories');
        await user.click(categoriesHeader);

        await waitFor(() => {
            expect(screen.getByLabelText('Programming')).toBeInTheDocument();
        });

        const programmingCheckbox = screen.getByLabelText('Programming');
        await user.click(programmingCheckbox);

        expect(mockOnFiltersChange).toHaveBeenCalledWith({
            ...defaultFilters,
            categories: ['Programming']
        });
    });

    test('handles multiple selections in array filters', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <FilterPanel
                filters={defaultFilters}
                onFiltersChange={mockOnFiltersChange}
                isOpen={true}
                onToggle={mockOnToggle}
            />
        );

        // Select multiple availability options
        const weekdaysCheckbox = screen.getByLabelText('Weekdays');
        const weekendsCheckbox = screen.getByLabelText('Weekends');

        await user.click(weekdaysCheckbox);
        await user.click(weekendsCheckbox);

        expect(mockOnFiltersChange).toHaveBeenCalledWith({
            ...defaultFilters,
            availability: ['weekends']
        });
    });

    test('removes items from array filters when unchecked', async () => {
        const user = userEvent.setup();
        const filtersWithAvailability = {
            ...defaultFilters,
            availability: ['weekdays', 'weekends']
        };

        renderWithProviders(
            <FilterPanel
                filters={filtersWithAvailability}
                onFiltersChange={mockOnFiltersChange}
                isOpen={true}
                onToggle={mockOnToggle}
            />
        );

        const weekdaysCheckbox = screen.getByLabelText('Weekdays');
        await user.click(weekdaysCheckbox);

        expect(mockOnFiltersChange).toHaveBeenCalledWith({
            ...defaultFilters,
            availability: ['weekends']
        });
    });

    test('closes panel when close button is clicked', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <FilterPanel
                filters={defaultFilters}
                onFiltersChange={mockOnFiltersChange}
                isOpen={true}
                onToggle={mockOnToggle}
            />
        );

        const closeButton = screen.getByRole('button', { name: '' }); // X button
        await user.click(closeButton);

        expect(mockOnToggle).toHaveBeenCalled();
    });

    test('displays star ratings correctly', () => {
        renderWithProviders(
            <FilterPanel
                filters={defaultFilters}
                onFiltersChange={mockOnFiltersChange}
                isOpen={true}
                onToggle={mockOnToggle}
            />
        );

        // Check that rating options are displayed
        expect(screen.getByText('& up')).toBeInTheDocument();
    });
});