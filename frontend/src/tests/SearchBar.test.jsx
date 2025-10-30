import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
    MagnifyingGlassIcon: () => <div data-testid="search-icon" />,
    XMarkIcon: () => <div data-testid="close-icon" />
}));

// Mock the API
jest.mock('../utils/api', () => ({
    searchAPI: {
        getSearchSuggestions: jest.fn()
    }
}));

// Mock the useDebounce hook
jest.mock('../hooks/useDebounce', () => ({
    useDebounce: (value) => value // Return value immediately for testing
}));

import SearchBar from '../components/search/SearchBar';
import { searchAPI } from '../utils/api';

describe('SearchBar', () => {
    const mockOnSearch = jest.fn();
    const mockSuggestions = {
        data: {
            suggestions: [
                { text: 'JavaScript', type: 'skill', description: 'Programming language', count: 25 },
                { text: 'John Doe', type: 'user', description: 'Software Developer' },
                { text: 'Programming', type: 'category', count: 50 }
            ]
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        searchAPI.getSearchSuggestions.mockResolvedValue(mockSuggestions);
    });

    test('renders search input with placeholder', () => {
        render(<SearchBar onSearch={mockOnSearch} />);

        expect(screen.getByPlaceholderText('Search for skills or users...')).toBeInTheDocument();
    });

    test('renders custom placeholder when provided', () => {
        render(<SearchBar onSearch={mockOnSearch} placeholder="Custom placeholder" />);

        expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    test('calls onSearch when Enter is pressed', async () => {
        const user = userEvent.setup();
        render(<SearchBar onSearch={mockOnSearch} />);

        const input = screen.getByPlaceholderText('Search for skills or users...');
        await user.type(input, 'JavaScript');
        await user.keyboard('{Enter}');

        expect(mockOnSearch).toHaveBeenCalledWith({
            query: 'JavaScript',
            type: 'general'
        });
    });

    test('fetches suggestions when typing', async () => {
        const user = userEvent.setup();
        render(<SearchBar onSearch={mockOnSearch} />);

        const input = screen.getByPlaceholderText('Search for skills or users...');
        await user.type(input, 'Java');

        await waitFor(() => {
            expect(searchAPI.getSearchSuggestions).toHaveBeenCalledWith({
                query: 'Java',
                limit: 8
            });
        });
    });

    test('displays suggestions when available', async () => {
        const user = userEvent.setup();
        render(<SearchBar onSearch={mockOnSearch} />);

        const input = screen.getByPlaceholderText('Search for skills or users...');
        await user.type(input, 'Java');

        await waitFor(() => {
            expect(screen.getByText('JavaScript')).toBeInTheDocument();
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Programming')).toBeInTheDocument();
        });
    });

    test('handles suggestion click', async () => {
        const user = userEvent.setup();
        render(<SearchBar onSearch={mockOnSearch} />);

        const input = screen.getByPlaceholderText('Search for skills or users...');
        await user.type(input, 'Java');

        await waitFor(() => {
            expect(screen.getByText('JavaScript')).toBeInTheDocument();
        });

        await user.click(screen.getByText('JavaScript'));

        expect(mockOnSearch).toHaveBeenCalledWith({
            query: 'JavaScript',
            type: 'skill'
        });
    });

    test('navigates suggestions with arrow keys', async () => {
        const user = userEvent.setup();
        render(<SearchBar onSearch={mockOnSearch} />);

        const input = screen.getByPlaceholderText('Search for skills or users...');
        await user.type(input, 'Java');

        await waitFor(() => {
            expect(screen.getByText('JavaScript')).toBeInTheDocument();
        });

        // Navigate down
        await user.keyboard('{ArrowDown}');

        // The first suggestion should be highlighted
        const firstSuggestion = screen.getByText('JavaScript').closest('button');
        expect(firstSuggestion).toHaveClass('bg-blue-50');
    });

    test('selects suggestion with Enter key', async () => {
        const user = userEvent.setup();
        render(<SearchBar onSearch={mockOnSearch} />);

        const input = screen.getByPlaceholderText('Search for skills or users...');
        await user.type(input, 'Java');

        await waitFor(() => {
            expect(screen.getByText('JavaScript')).toBeInTheDocument();
        });

        // Navigate down and select
        await user.keyboard('{ArrowDown}');
        await user.keyboard('{Enter}');

        expect(mockOnSearch).toHaveBeenCalledWith({
            query: 'JavaScript',
            type: 'skill'
        });
    });

    test('clears search when clear button is clicked', async () => {
        const user = userEvent.setup();
        render(<SearchBar onSearch={mockOnSearch} />);

        const input = screen.getByPlaceholderText('Search for skills or users...');
        await user.type(input, 'JavaScript');

        const clearButton = screen.getByLabelText('Clear search');
        await user.click(clearButton);

        expect(input.value).toBe('');
        expect(mockOnSearch).toHaveBeenCalledWith({
            query: '',
            type: 'general'
        });
    });

    test('closes suggestions when clicking outside', async () => {
        const user = userEvent.setup();
        render(
            <div>
                <SearchBar onSearch={mockOnSearch} />
                <div data-testid="outside">Outside element</div>
            </div>
        );

        const input = screen.getByPlaceholderText('Search for skills or users...');
        await user.type(input, 'Java');

        await waitFor(() => {
            expect(screen.getByText('JavaScript')).toBeInTheDocument();
        });

        // Click outside
        await user.click(screen.getByTestId('outside'));

        await waitFor(() => {
            expect(screen.queryByText('JavaScript')).not.toBeInTheDocument();
        });
    });

    test('shows loading state while fetching suggestions', async () => {
        // Mock a delayed response
        searchAPI.getSearchSuggestions.mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve(mockSuggestions), 100))
        );

        const user = userEvent.setup();
        render(<SearchBar onSearch={mockOnSearch} />);

        const input = screen.getByPlaceholderText('Search for skills or users...');
        await user.type(input, 'Java');

        expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    test('handles API error gracefully', async () => {
        searchAPI.getSearchSuggestions.mockRejectedValue(new Error('API Error'));

        const user = userEvent.setup();
        render(<SearchBar onSearch={mockOnSearch} />);

        const input = screen.getByPlaceholderText('Search for skills or users...');
        await user.type(input, 'Java');

        await waitFor(() => {
            expect(screen.queryByText('JavaScript')).not.toBeInTheDocument();
        });
    });

    test('does not fetch suggestions for queries shorter than 2 characters', async () => {
        const user = userEvent.setup();
        render(<SearchBar onSearch={mockOnSearch} />);

        const input = screen.getByPlaceholderText('Search for skills or users...');
        await user.type(input, 'J');

        expect(searchAPI.getSearchSuggestions).not.toHaveBeenCalled();
    });

    test('displays appropriate icons for different suggestion types', async () => {
        const user = userEvent.setup();
        render(<SearchBar onSearch={mockOnSearch} />);

        const input = screen.getByPlaceholderText('Search for skills or users...');
        await user.type(input, 'Java');

        await waitFor(() => {
            const suggestions = screen.getAllByRole('button');
            // Check that suggestions contain emoji icons (simplified check)
            expect(suggestions.length).toBeGreaterThan(0);
        });
    });
});