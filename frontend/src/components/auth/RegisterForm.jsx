import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '../../hooks/useApi';
import {
    validateEmail,
    validatePassword,
    validateConfirmPassword,
    validateRequired,
    validateMinLength,
    validateMaxLength
} from '../../utils/validation';
import Button from '../common/Button';
import Input from '../common/Input';
import toast from 'react-hot-toast';

function RegisterForm() {
    const navigate = useNavigate();
    const registerMutation = useRegister();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
        setError,
    } = useForm({
        mode: 'onBlur',
    });

    const password = watch('password');

    const onSubmit = async (data) => {
        try {
            const response = await registerMutation.mutateAsync({
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                password: data.password,
                confirmPassword: data.confirmPassword,
                acceptTerms: data.acceptTerms,
            });

            if (response.data.success) {
                toast.success('Registration successful! Please check your email for verification.');
                navigate('/verify-email', {
                    state: {
                        email: data.email,
                        message: 'Please check your email for the verification code.'
                    }
                });
            }
        } catch (error) {
            const message = error.response?.data?.message || 'Registration failed';
            const errors = error.response?.data?.errors || [];

            // Handle field-specific errors
            if (errors.length > 0) {
                errors.forEach(err => {
                    if (err.field) {
                        setError(err.field, { message: err.message });
                    }
                });
            } else if (message.includes('email')) {
                setError('email', { message });
            } else {
                toast.error(message);
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <div className="mx-auto h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">SS</span>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Create your account
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Or{' '}
                        <Link
                            to="/login"
                            className="font-medium text-primary-600 hover:text-primary-500"
                        >
                            sign in to your existing account
                        </Link>
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="First name"
                                type="text"
                                autoComplete="given-name"
                                required
                                error={errors.firstName?.message}
                                {...register('firstName', {
                                    required: 'First name is required',
                                    validate: (value) =>
                                        validateMinLength(value, 2, 'First name') ||
                                        validateMaxLength(value, 50, 'First name'),
                                })}
                            />

                            <Input
                                label="Last name"
                                type="text"
                                autoComplete="family-name"
                                required
                                error={errors.lastName?.message}
                                {...register('lastName', {
                                    required: 'Last name is required',
                                    validate: (value) =>
                                        validateMinLength(value, 2, 'Last name') ||
                                        validateMaxLength(value, 50, 'Last name'),
                                })}
                            />
                        </div>

                        <Input
                            label="Email address"
                            type="email"
                            autoComplete="email"
                            required
                            error={errors.email?.message}
                            {...register('email', {
                                required: 'Email is required',
                                validate: validateEmail,
                            })}
                        />

                        <div className="relative">
                            <Input
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                required
                                error={errors.password?.message}
                                helperText="Must be at least 8 characters with uppercase, lowercase, number, and special character"
                                {...register('password', {
                                    required: 'Password is required',
                                    validate: validatePassword,
                                })}
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        <div className="relative">
                            <Input
                                label="Confirm password"
                                type={showConfirmPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                required
                                error={errors.confirmPassword?.message}
                                {...register('confirmPassword', {
                                    required: 'Please confirm your password',
                                    validate: (value) => validateConfirmPassword(password, value),
                                })}
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? (
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <input
                            id="accept-terms"
                            name="accept-terms"
                            type="checkbox"
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            {...register('acceptTerms', {
                                required: 'You must accept the terms and conditions',
                            })}
                        />
                        <label htmlFor="accept-terms" className="ml-2 block text-sm text-gray-900">
                            I agree to the{' '}
                            <Link to="/terms" className="text-primary-600 hover:text-primary-500">
                                Terms and Conditions
                            </Link>{' '}
                            and{' '}
                            <Link to="/privacy" className="text-primary-600 hover:text-primary-500">
                                Privacy Policy
                            </Link>
                        </label>
                    </div>
                    {errors.acceptTerms && (
                        <p className="text-sm text-red-600">{errors.acceptTerms.message}</p>
                    )}

                    <div>
                        <Button
                            type="submit"
                            className="w-full"
                            loading={isSubmitting || registerMutation.isLoading}
                            disabled={isSubmitting || registerMutation.isLoading}
                        >
                            Create account
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default RegisterForm;