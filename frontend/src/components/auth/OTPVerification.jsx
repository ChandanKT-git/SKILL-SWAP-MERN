import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useVerifyOTP, useResendOTP } from '../../hooks/useApi';
import Button from '../common/Button';
import toast from 'react-hot-toast';

function OTPVerification() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const verifyOTPMutation = useVerifyOTP();
    const resendOTPMutation = useResendOTP();

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    const [canResend, setCanResend] = useState(false);
    const inputRefs = useRef([]);

    const email = location.state?.email;
    const message = location.state?.message;

    useEffect(() => {
        if (!email) {
            navigate('/register');
            return;
        }

        // Start countdown timer
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setCanResend(true);
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [email, navigate]);

    const handleOtpChange = (index, value) => {
        if (value.length > 1) return; // Prevent multiple characters

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        // Handle backspace
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }

        // Handle paste
        if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            navigator.clipboard.readText().then((text) => {
                const digits = text.replace(/\D/g, '').slice(0, 6);
                const newOtp = [...otp];
                for (let i = 0; i < digits.length && i < 6; i++) {
                    newOtp[i] = digits[i];
                }
                setOtp(newOtp);

                // Focus the next empty input or the last one
                const nextIndex = Math.min(digits.length, 5);
                inputRefs.current[nextIndex]?.focus();
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            toast.error('Please enter the complete 6-digit code');
            return;
        }

        try {
            const response = await verifyOTPMutation.mutateAsync({
                email,
                otp: otpCode,
            });

            if (response.data.success) {
                const { user, token } = response.data.data;
                login(user, token);

                toast.success('Email verified successfully! Welcome to SkillSwap!');
                navigate('/dashboard');
            }
        } catch (error) {
            const message = error.response?.data?.message || 'Verification failed';
            toast.error(message);

            // Clear OTP on error
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        }
    };

    const handleResendOTP = async () => {
        try {
            await resendOTPMutation.mutateAsync(email);
            setTimeLeft(300); // Reset timer
            setCanResend(false);
            setOtp(['', '', '', '', '', '']); // Clear current OTP
            inputRefs.current[0]?.focus();
        } catch (error) {
            // Error is handled by the hook
        }
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    if (!email) {
        return null;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <div className="mx-auto h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Verify your email
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        {message || `We've sent a 6-digit code to ${email}`}
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Enter verification code
                        </label>
                        <div className="flex justify-center space-x-2">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className="w-12 h-12 text-center text-lg font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            ))}
                        </div>
                    </div>

                    <div className="text-center">
                        {timeLeft > 0 ? (
                            <p className="text-sm text-gray-600">
                                Code expires in {formatTime(timeLeft)}
                            </p>
                        ) : (
                            <p className="text-sm text-red-600">
                                Code has expired. Please request a new one.
                            </p>
                        )}
                    </div>

                    <div className="space-y-4">
                        <Button
                            type="submit"
                            className="w-full"
                            loading={verifyOTPMutation.isLoading}
                            disabled={verifyOTPMutation.isLoading || otp.join('').length !== 6}
                        >
                            Verify Email
                        </Button>

                        <div className="text-center">
                            <span className="text-sm text-gray-600">
                                Didn't receive the code?{' '}
                            </span>
                            <button
                                type="button"
                                onClick={handleResendOTP}
                                disabled={!canResend || resendOTPMutation.isLoading}
                                className="text-sm font-medium text-primary-600 hover:text-primary-500 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                                {resendOTPMutation.isLoading ? 'Sending...' : 'Resend code'}
                            </button>
                        </div>
                    </div>
                </form>

                <div className="text-center">
                    <button
                        onClick={() => navigate('/register')}
                        className="text-sm text-gray-600 hover:text-gray-500"
                    >
                        ← Back to registration
                    </button>
                </div>
            </div>
        </div>
    );
}

export default OTPVerification;