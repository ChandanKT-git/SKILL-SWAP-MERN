import React, { forwardRef, useId } from 'react';
import { cn } from '../../utils/helpers';

const Input = forwardRef(({
    label,
    error,
    helperText,
    className = '',
    id: providedId,
    ...props
}, ref) => {
    const generatedId = useId();
    const inputId = providedId || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
        <div className="space-y-1">
            {label && (
                <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
                    {label}
                    {props.required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
                </label>
            )}
            <input
                ref={ref}
                id={inputId}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={
                    error ? errorId : helperText ? helperId : undefined
                }
                className={cn(
                    'w-full px-3 py-2 sm:py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors touch-manipulation text-base sm:text-sm',
                    error
                        ? 'border-red-300 bg-red-50 focus:ring-red-500'
                        : 'border-gray-300 bg-white hover:border-gray-400',
                    props.disabled && 'bg-gray-100 cursor-not-allowed opacity-60',
                    className
                )}
                {...props}
            />
            {error && (
                <p id={errorId} className="text-sm text-red-600" role="alert">
                    {error}
                </p>
            )}
            {helperText && !error && (
                <p id={helperId} className="text-sm text-gray-500">
                    {helperText}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;