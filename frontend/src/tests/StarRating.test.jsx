import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import StarRating from '../components/reviews/StarRating';

describe('StarRating Component', () => {
    test('renders correct number of stars', () => {
        render(<StarRating rating={3} maxRating={5} />);

        const stars = screen.getAllByRole('button');
        expect(stars).toHaveLength(5);
    });

    test('displays correct rating visually', () => {
        render(<StarRating rating={3} maxRating={5} />);

        const stars = screen.getAllByRole('button');

        // First 3 stars should be filled (solid)
        for (let i = 0; i < 3; i++) {
            const starIcon = stars[i].querySelector('svg');
            expect(starIcon).toHaveClass('text-yellow-400');
        }

        // Last 2 stars should be empty (outline)
        for (let i = 3; i < 5; i++) {
            const starIcon = stars[i].querySelector('svg');
            expect(starIcon).toHaveClass('text-gray-300');
        }
    });

    test('shows rating value when showValue is true', () => {
        render(<StarRating rating={4.2} showValue={true} />);

        expect(screen.getByText('4.2')).toBeInTheDocument();
    });

    test('handles interactive mode correctly', () => {
        const mockOnChange = jest.fn();
        render(<StarRating rating={2} interactive={true} onChange={mockOnChange} />);

        const stars = screen.getAllByRole('button');

        // Click on the 4th star
        fireEvent.click(stars[3]);

        expect(mockOnChange).toHaveBeenCalledWith(4);
    });

    test('handles hover in interactive mode', () => {
        const mockOnChange = jest.fn();
        render(<StarRating rating={2} interactive={true} onChange={mockOnChange} />);

        const stars = screen.getAllByRole('button');

        // Hover over the 5th star
        fireEvent.mouseEnter(stars[4]);

        // The 5th star should now appear filled due to hover
        const fifthStarIcon = stars[4].querySelector('svg');
        expect(fifthStarIcon).toHaveClass('text-yellow-400');
    });

    test('applies correct size classes', () => {
        const { rerender } = render(<StarRating rating={3} size="sm" />);

        let stars = screen.getAllByRole('button');
        let starIcon = stars[0].querySelector('svg');
        expect(starIcon).toHaveClass('w-4', 'h-4');

        rerender(<StarRating rating={3} size="lg" />);
        stars = screen.getAllByRole('button');
        starIcon = stars[0].querySelector('svg');
        expect(starIcon).toHaveClass('w-6', 'h-6');
    });

    test('is not interactive by default', () => {
        render(<StarRating rating={3} />);

        const stars = screen.getAllByRole('button');

        // Stars should be disabled when not interactive
        stars.forEach(star => {
            expect(star).toBeDisabled();
        });
    });

    test('has proper accessibility attributes', () => {
        render(<StarRating rating={3} interactive={true} />);

        const stars = screen.getAllByRole('button');

        expect(stars[0]).toHaveAttribute('aria-label', '1 star');
        expect(stars[1]).toHaveAttribute('aria-label', '2 stars');
        expect(stars[4]).toHaveAttribute('aria-label', '5 stars');
    });
});