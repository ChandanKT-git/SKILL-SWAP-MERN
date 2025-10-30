import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import SearchResults from '../components/search/SearchResults';

// Mock UserCard component
jest.mock('../components/search/UserCard', () => {
    return function MockUserCard({ user, onBookSession }) {
        return (
            <div data-testid={`user-card-${user._id}`}>
                <h3>{user.firstName} {user.lastName}</h3>
                <button onClick={() => onBookSession(user)}>Book Session</button>
            </div>
        );
    };
});

const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('SearchResults', () => {
    const mockOnPageChange = jest.fn();
    const mockOnBookSession = jest.fn();

    const mockResults = [
        {
            _id: 'user1',
            firstName: 'John',
            lastName: 'Doe',
            skillsOffered: ['JavaScript', 'React']
        },
        {
            _id: 'user2',
            firstName: 'Jane',
            lastName: 'Smith',
            skillsOffered: ['Python', 'Django']
        }
    ];

    const mockPagination = {
        currentPage: 1,
        totalPages: 3,
        pageSize: 20,
        hasNextPage: true,
        hasPrevPage: false
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders search results header', () => {
        renderWithRouter(
            <SearchResults
                results={mockResults}
                onPageChange={mockOnPageChange}
                onBookSession={mockOnBookSession}
                searchQuery="JavaScript"
                totalResults={42}
            />
        );

        expect(screen.getByText('Search Results')).toBeInTheDocument();
        expect(screen.getByText('Results for "JavaScript"')).toBeInTheDocument();
        expect(screen.getByText('42 results')).toBeInTheDocument();
    });

    test('renders user cards for results', () => {
        renderWithRouter(
            <SearchResults
                results={mockResults}
                onPageChange={mockOnPageChange}
                onBookSession={mockOnBookSession}
            />
        );

        expect(screen.getByTestId('user-card-user1')).toBeInTheDocument();
        expect(screen.getByTestId('user-card-user2')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    test('displays loading state', () => {
        renderWithRouter(
            <SearchResults
                results={[]}
                isLoading={true}
                onPageChange={mockOnPageChange}
                onBookSession={mockOnBookSession}
            />
        );

        expect(screen.getByText('Searching for users...')).toBeInTheDocument();
        expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument(); // Loading spinner
    });

    test('displays no results message when no results found', () => {
        renderWithRouter(
            <SearchResults
                results={[]}
                isLoading={false}
                onPageChange={mockOnPageChange}
                onBookSession={mockOnBookSession}
                searchQuery="NonexistentSkill"
            />
        );

        expect(screen.getByText('No results found')).toBeInTheDocument();
        expect(screen.getByText(/We couldn't find any users matching "NonexistentSkill"/)).toBeInTheDocument();
    });

    test('displays generic no results message when no search query', () => {
        renderWithRouter(
            <SearchResults
                results={[]}
                isLoading={false}
                onPageChange={mockOnPageChange}
                onBookSession={mockOnBookSession}
            />
        );

        expect(screen.getByText('No results found')).toBeInTheDocument();
        expect(screen.getByText(/Try searching for a skill or adjusting your filters/)).toBeInTheDocument();
    });

    test('displays error state', () => {
        const error = { message: 'Network error occurred' };

        renderWithRouter(
            <SearchResults
                results={[]}
                error={error}
                onPageChange={mockOnPageChange}
                onBookSession={mockOnBookSession}
            />
        );

        expect(screen.getByText('Search Error')).toBeInTheDocument();
        expect(screen.getByText('Network error occurred')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    test('displays pagination when multiple pages exist', () => {
        renderWithRouter(
            <SearchResults
                results={mockResults}
                pagination={mockPagination}
                onPageChange={mockOnPageChange}
                onBookSession={mockOnBookSession}
                totalResults={60}
            />
        );

        expect(screen.getByText('Showing 1 to 20 of 60 results')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // Current page
        expect(screen.getByText('2')).toBeInTheDocument(); // Next page
        expect(screen.getByText('3')).toBeInTheDocument(); // Last page
    });

    test('handles page navigation', async () => {
        const user = userEvent.setup();
        renderWithRouter(
            <SearchResults
                results={mockResults}
                pagination={mockPagination}
                onPageChange={mockOnPageChange}
                onBookSession={mockOnBookSession}
                totalResults={60}
            />
        );

        const page2Button = screen.getByText('2');
        await user.click(page2Button);

        expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    test('handles next page navigation', async () => {
        const user = userEvent.setup();
        renderWithRouter(
            <SearchResults
                results={mockResults}
                pagination={mockPagination}
                onPageChange={mockOnPageChange}
                onBookSession={mockOnBookSession}
                totalResults={60}
            />
        );

        const nextButton = screen.getByRole('button', { name: /next/i });
        await user.click(nextButton);

        expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    test('handles previous page navigation', async () => {
        const user = userEvent.setup();
        const paginationWithPrevPage = {
            ...mockPagination,
            currentPage: 2,
            hasPrevPage: true,
            hasNextPage: true
        };

        renderWithRouter(
            <SearchResults
                results={mockResults}
                pagination={paginationWithPrevPage}
                onPageChange={mockOnPageChange}
                onBookSession={mockOnBookSession}
                totalResults={60}
            />
        );

        const prevButton = screen.getByRole('button', { name: /previous/i });
        await user.click(prevButton);

        expect(mockOnPageChange).toHaveBeenCalledWith(1);
    });

    test('disables navigation buttons appropriately', () => {
        renderWithRouter(
            <SearchResults
                results={mockResults}
                pagination={mockPagination}
                onPageChange={mockOnPageChange}
                onBookSession={mockOnBookSession}
                totalResults={60}
            />
        );

        const prevButton = screen.getByRole('button', { name: /previous/i });
        expect(prevButton).toBeDisabled();

        const nextButton = screen.getByRole('button', { name: /next/i });
        expect(nextButton).not.toBeDisabled();
    });

    test('does not render pagination for single page', () => {
        const singlePagePagination = {
            currentPage: 1,
            totalPages: 1,
            pageSize: 20,
            hasNextPage: false,
            hasPrevPage: false
        };

        renderWithRouter(
            <SearchResults
                results={mockResults}
                pagination={singlePagePagination}
                onPageChange={mockOnPageChange}
                onBookSession={mockOnBookSession}
                totalResults={2}
            />
        );

        expect(screen.queryByText('Showing')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });

    test('renders pagination with ellipsis for many pages', () => {
        const manyPagesPagination = {
            currentPage: 5,
            totalPages: 20,
            pageSize: 20,
            hasNextPage: true,
            hasPrevPage: true
        };

        renderWithRouter(
            <SearchResults
                results={mockResults}
                pagination={manyPagesPagination}
                onPageChange={mockOnPageChange}
                onBookSession={mockOnBookSession}
                totalResults={400}
            />
        );

        expect(screen.getByText('1')).toBeInTheDocument(); // First page
        expect(screen.getByText('20')).toBeInTheDocument(); // Last page
        expect(screen.getByText('5')).toBeInTheDocument(); // Current page
        expect(screen.getAllByText('...')).toHaveLength(2); // Ellipsis
    });

    test('calls onBookSession when user card book button is clicked', async () => {
        const user = userEvent.setup();
        renderWithRouter(
            <SearchResults
                results={mockResults}
                onPageChange={mockOnPageChange}
                onBookSession={mockOnBookSession}
            />
        );

        const bookButtons = screen.getAllByText('Book Session');
        await user.click(bookButtons[0]);

        expect(mockOnBookSession).toHaveBeenCalledWith(mockResults[0]);
    });

    test('applies custom className', () => {
        const { container } = renderWithRouter(
            <SearchResults
                results={mockResults}
                onPageChange={mockOnPageChange}
                onBookSession={mockOnBookSession}
                className="custom-class"
            />
        );

        expect(container.firstChild).toHaveClass('custom-class');
    });

    test('displays correct result count for single result', () => {
        renderWithRouter(
            <SearchResults
                results={[mockResults[0]]}
                onPageChange={mockOnPageChange}
                onBookSession={mockOnBookSession}
                totalResults={1}
            />
        );

        expect(screen.getByText('1 result')).toBeInTheDocument();
    });

    test('displays correct result count for multiple results', () => {
        renderWithRouter(
            <SearchResults
                results={mockResults}
                onPageChange={mockOnPageChange}
                onBookSession={mockOnBookSession}
                totalResults={42}
            />
        );

        expect(screen.getByText('42 results')).toBeInTheDocument();
    });

    test('scrolls to top when page changes', async () => {
        const user = userEvent.setup();

        // Mock scrollIntoView
        const mockScrollIntoView = jest.fn();
        jest.spyOn(document, 'getElementById').mockReturnValue({
            scrollIntoView: mockScrollIntoView
        });

        renderWithRouter(
            <SearchResults
                results={mockResults}
                pagination={mockPagination}
                onPageChange={mockOnPageChange}
                onBookSession={mockOnBookSession}
                totalResults={60}
            />
        );

        const page2Button = screen.getByText('2');
        await user.click(page2Button);

        expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

        // Restore mock
        document.getElementById.mockRestore();
    });
});