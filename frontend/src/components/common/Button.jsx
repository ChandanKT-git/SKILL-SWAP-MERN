import React from 'react';
import { cn } from '../../utils/helpers';
import LoadingSpinner from './LoadingSpinner';

function Button({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className = '',
    type = 'button',
    'aria-label': ariaLabel,
    ...props
}) {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95';

    const variantClasses = {
        primary: 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white focus:ring-primary-500',
        secondary: 'bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-900 focus:ring-gray-500',
        outline: 'border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 focus:ring-primary-500',
        ghost: 'bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-700 focus:ring-gray-500',
        danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white focus:ring-red-500',
    };

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm min-h-[32px]',
        md: 'px-4 py-2 text-sm min-h-[40px]',
        lg: 'px-6 py-3 text-base min-h-[48px]',
        xl: 'px-8 py-4 text-lg min-h-[56px]',
    };

    return (
        <button
            type={type}
            className={cn(
                baseClasses,
                variantClasses[variant],
                sizeClasses[size],
                className
            )}
            disabled={disabled || loading}
            aria-label={ariaLabel}
            aria-busy={loading}
            {...props}
        >
            {loading && (
                <>
                    <LoadingSpinner
                        size="sm"
                        className="mr-2"
                    />
                    <span className="sr-only">Loading...</span>
                </>
            )}
            {children}
        </button>
    );
}

export default Button;