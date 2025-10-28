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

    return (
        <div className="space-y-1">
            {label && (
                <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
                    {label}
                    {props.required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <input
                ref={ref}
                id={inputId}
                className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors',
                    error
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300 bg-white hover:border-gray-400',
                    props.disabled && 'bg-gray-100 cursor-not-allowed',
                    className
                )}
                {...props}
            />
            {error && (
                <p className="text-sm text-red-600">{error}</p>
            )}
            {helperText && !error && (
                <p className="text-sm text-gray-500">{helperText}</p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;