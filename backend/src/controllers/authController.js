const User = require('../models/User');
const OTPService = require('../services/otpService');
const emailService = require('../services/emailService');
const JWTUtils = require('../utils/jwt');
const {
    ValidationError,
    AuthenticationError,
    ConflictError,
    NotFoundError,
    asyncHandler
} = require('../middleware/errorHandler');
const { RequestLogger } = require('../middleware/logging');

/**
 * Authentication controller handling user registration, login, and verification
 */
class AuthController {
    /**
     * Register a new user
     * @route POST /api/auth/register
     */
    static register = asyncHandler(async (req, res) => {
        const { firstName, lastName, email, password, marketingEmails = false } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            if (existingUser.isEmailVerified) {
                throw new ConflictError('An account with this email already exists');
            } else {
                // User exists but not verified, update their info and resend OTP
                existingUser.firstName = firstName;
                existingUser.lastName = lastName;
                existingUser.password = password;
                existingUser.preferences.marketingEmails = marketingEmails;

                // Generate new OTP
                const otpData = OTPService.generateOTPWithExpiration();
                existingUser.otp = otpData;

                await existingUser.save();

                // Send OTP email
                try {
                    await emailService.sendOTPEmail(email, otpData.code, firstName);
                } catch (emailError) {
                    console.error('Failed to send OTP email:', emailError.message);
                    // Continue with registration even if email fails
                }

                // Log registration attempt
                RequestLogger.logAuthAttempt(req, true, existingUser._id);

                return res.status(200).json({
                    success: true,
                    message: 'Registration updated. Please check your email for the verification code.',
                    data: {
                        email: existingUser.email,
                        isEmailVerified: false,
                        otpExpires: otpData.expires,
                    },
                });
            }
        }

        // Create new user
        const otpData = OTPService.generateOTPWithExpiration();

        const newUser = new User({
            firstName,
            lastName,
            email,
            password,
            otp: otpData,
            preferences: {
                emailNotifications: true,
                sessionReminders: true,
                marketingEmails,
            },
        });

        await newUser.save();

        // Send OTP email
        try {
            await emailService.sendOTPEmail(email, otpData.code, firstName);
        } catch (emailError) {
            console.error('Failed to send OTP email:', emailError.message);
            // Continue with registration even if email fails
        }

        // Log successful registration
        RequestLogger.logAuthAttempt(req, true, newUser._id);

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please check your email for the verification code.',
            data: {
                email: newUser.email,
                isEmailVerified: false,
                otpExpires: otpData.expires,
            },
        });
    });

    /**
     * Verify OTP and complete registration
     * @route POST /api/auth/verify-otp
     */
    static verifyOTP = asyncHandler(async (req, res) => {
        const { email, otp } = req.body;

        // Find user by email
        const user = await User.findOne({ email }).select('+otp');
        if (!user) {
            throw new NotFoundError('User not found');
        }

        // Check if already verified
        if (user.isEmailVerified) {
            throw new ValidationError('Email is already verified');
        }

        // Validate OTP
        const validation = OTPService.validateOTP(otp, user.otp);

        if (!validation.isValid) {
            // Increment OTP attempts
            user.otp.attempts = (user.otp.attempts || 0) + 1;
            await user.save();

            // Log failed OTP attempt
            RequestLogger.logSecurityEvent(req, 'INVALID_OTP', {
                email,
                attempts: user.otp.attempts,
                error: validation.error,
            });

            if (validation.shouldRegenerate) {
                throw new ValidationError(validation.error + '. Please request a new OTP.');
            }

            // Check if this was the last attempt
            if (user.otp.attempts >= 5) {
                throw new ValidationError('Maximum OTP attempts exceeded. Please request a new OTP.');
            }

            const remainingAttempts = 5 - user.otp.attempts;
            throw new ValidationError(`${validation.error}. ${remainingAttempts} attempts remaining.`);
        }

        // OTP is valid, verify the user
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;

        // Completely remove the OTP field
        user.otp = undefined;

        await user.save();

        // Generate JWT tokens
        const tokenPair = JWTUtils.generateTokenPair({
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
        });

        // Send welcome email
        try {
            await emailService.sendWelcomeEmail(email, user.firstName);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError.message);
            // Continue even if welcome email fails
        }

        // Log successful verification
        RequestLogger.logAuthAttempt(req, true, user._id);

        res.status(200).json({
            success: true,
            message: 'Email verified successfully. Welcome to SkillSwap!',
            data: {
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified,
                    createdAt: user.createdAt,
                },
                tokens: tokenPair,
            },
        });
    });

    /**
     * Resend OTP verification code
     * @route POST /api/auth/resend-otp
     */
    static resendOTP = asyncHandler(async (req, res) => {
        const { email } = req.body;

        // Find user by email
        const user = await User.findOne({ email }).select('+otp');
        if (!user) {
            throw new NotFoundError('User not found');
        }

        // Check if already verified
        if (user.isEmailVerified) {
            throw new ValidationError('Email is already verified');
        }

        // Check rate limiting (prevent spam)
        if (user.otp && user.otp.generatedAt) {
            const timeSinceLastOTP = Date.now() - user.otp.generatedAt.getTime();
            const minInterval = 60 * 1000; // 1 minute minimum between OTP requests

            if (timeSinceLastOTP < minInterval) {
                const waitTime = Math.ceil((minInterval - timeSinceLastOTP) / 1000);
                throw new ValidationError(`Please wait ${waitTime} seconds before requesting a new OTP`);
            }
        }

        // Generate new OTP
        const otpData = OTPService.generateOTPWithExpiration();
        user.otp = otpData;
        await user.save();

        // Send OTP email
        try {
            await emailService.sendOTPEmail(email, otpData.code, user.firstName);
        } catch (emailError) {
            console.error('Failed to send OTP email:', emailError.message);
            throw new Error('Failed to send verification email. Please try again later.');
        }

        // Log OTP resend
        RequestLogger.logSecurityEvent(req, 'OTP_RESEND', { email });

        res.status(200).json({
            success: true,
            message: 'Verification code sent successfully. Please check your email.',
            data: {
                email: user.email,
                otpExpires: otpData.expires,
            },
        });
    });

    /**
     * User login
     * @route POST /api/auth/login
     */
    static login = asyncHandler(async (req, res) => {
        const { email, password, rememberMe = false } = req.body;

        // Find user with password field
        const user = await User.findByEmailWithPassword(email);
        if (!user) {
            // Log failed login attempt
            RequestLogger.logAuthAttempt(req, false);
            throw new AuthenticationError('Invalid email or password');
        }

        // Check if account is locked
        if (user.isLocked) {
            // Send account locked email if not sent recently
            try {
                await emailService.sendAccountLockedEmail(user.email, user.firstName, user.lockUntil);
            } catch (emailError) {
                console.error('Failed to send account locked email:', emailError.message);
            }

            RequestLogger.logSecurityEvent(req, 'LOGIN_ATTEMPT_LOCKED_ACCOUNT', {
                email,
                lockUntil: user.lockUntil,
            });

            throw new AuthenticationError('Account is temporarily locked due to multiple failed login attempts');
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            // Increment login attempts
            await user.incLoginAttempts();

            RequestLogger.logAuthAttempt(req, false, user._id);
            throw new AuthenticationError('Invalid email or password');
        }

        // Check if email is verified
        if (!user.isEmailVerified) {
            // Generate new OTP for unverified users
            const otpData = OTPService.generateOTPWithExpiration();
            user.otp = otpData;
            await user.save();

            // Send OTP email
            try {
                await emailService.sendOTPEmail(email, otpData.code, user.firstName);
            } catch (emailError) {
                console.error('Failed to send OTP email:', emailError.message);
            }

            return res.status(200).json({
                success: true,
                message: 'Please verify your email address. A verification code has been sent.',
                data: {
                    email: user.email,
                    isEmailVerified: false,
                    otpExpires: otpData.expires,
                },
            });
        }

        // Reset login attempts on successful login
        if (user.loginAttempts > 0) {
            await user.resetLoginAttempts();
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT tokens
        const tokenOptions = rememberMe ? { expiresIn: '30d' } : {};
        const tokenPair = JWTUtils.generateTokenPair({
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
        }, tokenOptions);

        // Log successful login
        RequestLogger.logAuthAttempt(req, true, user._id);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified,
                    lastLogin: user.lastLogin,
                },
                tokens: tokenPair,
            },
        });
    });

    /**
     * Refresh access token
     * @route POST /api/auth/refresh-token
     */
    static refreshToken = asyncHandler(async (req, res) => {
        const { refreshToken } = req.body;

        // Verify refresh token
        const decoded = JWTUtils.verifyRefreshToken(refreshToken);

        // Find user
        const user = await User.findById(decoded.id);
        if (!user) {
            throw new AuthenticationError('User not found');
        }

        // Check if user is still active
        if (user.status !== 'active') {
            throw new AuthenticationError('Account is not active');
        }

        // Generate new access token
        const accessToken = JWTUtils.generateAccessToken({
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
        });

        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                accessToken,
                tokenType: 'Bearer',
                expiresIn: JWTUtils.getTokenExpiration(accessToken),
            },
        });
    });

    /**
     * User logout
     * @route POST /api/auth/logout
     */
    static logout = asyncHandler(async (req, res) => {
        // In a stateless JWT system, logout is handled client-side
        // Here we can log the logout event for security monitoring

        if (req.user) {
            RequestLogger.logSecurityEvent(req, 'USER_LOGOUT', {
                userId: req.user.id,
                email: req.user.email,
            });
        }

        res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    });

    /**
     * Get current user profile
     * @route GET /api/auth/me
     */
    static getCurrentUser = asyncHandler(async (req, res) => {
        const user = await User.findById(req.user.id);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    isEmailVerified: user.isEmailVerified,
                    profileImage: user.profileImage,
                    bio: user.bio,
                    location: user.location,
                    skills: user.skills,
                    availability: user.availability,
                    rating: user.rating,
                    preferences: user.preferences,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                },
            },
        });
    });
}

module.exports = AuthController;