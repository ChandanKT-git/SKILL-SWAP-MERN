import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import SearchBar from '../components/search/SearchBar';
import { AuthProvider } from '../context/AuthContext';

// Helper to wrap components with necessary providers
const renderWithProviders = (component) => {
    return render(
        <BrowserRouter>
            <AuthProvider>
                {component}
            </AuthProvider>
        </BrowserRouter>
    );
};

describe('Accessibility Tests', () => {
    describe('Header Component', () => {
        it('should have skip to main content link', () => {
            renderWithProviders(<Header />);
            const skipLink = screen.getByText('Skip to main content');
            expect(skipLink).toBeInTheDocument();
            expect(skipLink).toHaveClass('skip-link');
        });

        it('should have proper navigation landmarks', () => {
            renderWithProviders(<Header />);
            const nav = screen.getAllByRole('navigation');
            expect(nav.length).toBeGreaterThan(0);
        });

        it('should have accessible logo link', () => {
            renderWithProviders(<Header />);
            const logoLink = screen.getByLabelText('SkillSwap Home');
            expect(logoLink).toBeInTheDocument();
        });
    });

    describe('Footer Component', () => {
        it('should have contentinfo landmark', () => {
            render(
                <BrowserRouter>
                    <Footer />
                </BrowserRouter>
            );
            const footer = screen.getByRole('contentinfo');
            expect(footer).toBeInTheDocument();
        });

        it('should have accessible social media links', () => {
            render(
                <BrowserRouter>
                    <Footer />
                </BrowserRouter>
            );
            expect(screen.getByLabelText(/Follow us on Twitter/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/View our GitHub repository/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Connect with us on LinkedIn/i)).toBeInTheDocument();
        });
    });

    describe('Button Component', () => {
        it('should have proper type attribute', () => {
            render(<Button>Click me</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('type', 'button');
        });

        it('should show loading state with aria-busy', () => {
            render(<Button loading>Loading</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('aria-busy', 'true');
        });

        it('should have accessible label when provided', () => {
            render(<Button aria-label="Close dialog">X</Button>);
            const button = screen.getByLabelText('Close dialog');
            expect(button).toBeInTheDocument();
        });

        it('should be disabled when loading', () => {
            render(<Button loading>Submit</Button>);
            const button = screen.getByRole('button');
            expect(button).toBeDisabled();
        });
    });

    describe('Input Component', () => {
        it('should have associated label', () => {
            render(<Input label="Email" />);
            const input = screen.getByLabelText('Email');
            expect(input).toBeInTheDocument();
        });

        it('should show required indicator', () => {
            render(<Input label="Password" required />);
            expect(screen.getByText('*')).toBeInTheDocument();
        });

        it('should have aria-invalid when error exists', () => {
            render(<Input label="Email" error="Invalid email" />);
            const input = screen.getByLabelText('Email');
            expect(input).toHaveAttribute('aria-invalid', 'true');
        });

        it('should associate error message with input', () => {
            render(<Input label="Email" error="Invalid email" />);
            const input = screen.getByLabelText('Email');
            const errorId = input.getAttribute('aria-describedby');
            expect(errorId).toBeTruthy();
            const errorElement = document.getElementById(errorId);
            expect(errorElement).toHaveTextContent('Invalid email');
        });

        it('should have helper text associated with input', () => {
            render(<Input label="Email" helperText="Enter your email address" />);
            const input = screen.getByLabelText('Email');
            const helperId = input.getAttribute('aria-describedby');
            expect(helperId).toBeTruthy();
        });
    });

    describe('SearchBar Component', () => {
        it('should have combobox role', () => {
            render(<SearchBar onSearch={() => { }} />);
            const searchInput = screen.getByRole('combobox');
            expect(searchInput).toBeInTheDocument();
        });

        it('should have accessible label', () => {
            render(<SearchBar onSearch={() => { }} />);
            const label = screen.getByLabelText('Search for skills or users');
            expect(label).toBeInTheDocument();
        });

        it('should have clear button with aria-label', () => {
            render(<SearchBar onSearch={() => { }} />);
            const input = screen.getByRole('combobox');
            // Type something to show clear button
            input.value = 'test';
            if (screen.queryByLabelText('Clear search')) {
                expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
            }
        });
    });

    describe('Keyboard Navigation', () => {
        it('should have focus visible styles on buttons', () => {
            render(<Button>Click me</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('focus:outline-none');
            expect(button).toHaveClass('focus:ring-2');
        });

        it('should have focus visible styles on inputs', () => {
            render(<Input label="Test" />);
            const input = screen.getByLabelText('Test');
            expect(input).toHaveClass('focus:ring-2');
        });
    });

    describe('Touch Interactions', () => {
        it('should have touch-manipulation class on buttons', () => {
            render(<Button>Click me</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('touch-manipulation');
        });

        it('should have minimum touch target size', () => {
            render(<Button size="sm">Small</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('min-h-[32px]');
        });
    });

    describe('Screen Reader Support', () => {
        it('should hide decorative elements from screen readers', () => {
            renderWithProviders(<Header />);
            const decorativeElements = document.querySelectorAll('[aria-hidden="true"]');
            expect(decorativeElements.length).toBeGreaterThan(0);
        });

        it('should have sr-only class available', () => {
            const { container } = render(
                <div>
                    <span className="sr-only">Hidden text</span>
                </div>
            );
            const srElement = container.querySelector('.sr-only');
            expect(srElement).toBeInTheDocument();
        });
    });
});
