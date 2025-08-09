const nodemailer = require('nodemailer');
const config = require('../config');
const { RequestLogger } = require('../middleware/logging');

/**
 * Email service for sending various types of emails
 */
class EmailService {
    constructor() {
        this.transporter = null;
        this.isConfigured = false;
        this.initializeTransporter();
    }

    /**
     * Initialize email transporter
     */
    initializeTransporter() {
        try {
            // Check if email configuration is available
            if (!config.email.user || !config.email.pass) {
                console.warn('⚠️ Email service not configured - emails will be logged instead of sent');
                this.isConfigured = false;
                return;
            }

            // Create transporter
            this.transporter = nodemailer.createTransport({
                service: config.email.service,
                auth: {
                    user: config.email.user,
                    pass: config.email.pass,
                },
                secure: true, // Use TLS
                tls: {
                    rejectUnauthorized: false, // Allow self-signed certificates in development
                },
            });

            this.isConfigured = true;
            console.log('✅ Email service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize email service:', error.message);
            this.isConfigured = false;
        }
    }

    /**
     * Verify email transporter connection
     * @returns {Promise<boolean>} True if connection is successful
     */
    async verifyConnection() {
        if (!this.isConfigured) {
            return false;
        }

        try {
            await this.transporter.verify();
            return true;
        } catch (error) {
            console.error('❌ Email service connection failed:', error.message);
            return false;
        }
    }

    /**
     * Send email
     * @param {Object} emailOptions - Email options
     * @returns {Promise<Object>} Email send result
     */
    async sendEmail(emailOptions) {
        const { to, subject, html, text } = emailOptions;

        try {
            // If email service is not configured, log the email instead
            if (!this.isConfigured) {
                console.log('📧 Email would be sent (service not configured):');
                console.log(`To: ${to}`);
                console.log(`Subject: ${subject}`);
                console.log(`Content: ${text || 'HTML content'}`);

                return {
                    success: true,
                    messageId: 'mock-message-id',
                    message: 'Email logged (service not configured)',
                };
            }

            const mailOptions = {
                from: config.email.from,
                to,
                subject,
                html,
                text,
            };

            const result = await this.transporter.sendMail(mailOptions);

            // Log successful email send
            RequestLogger.logDatabaseOperation('email_send', 'emails', true);

            return {
                success: true,
                messageId: result.messageId,
                message: 'Email sent successfully',
            };
        } catch (error) {
            // Log failed email send
            RequestLogger.logDatabaseOperation('email_send', 'emails', false, error);

            throw new Error(`Failed to send email: ${error.message}`);
        }
    }

    /**
     * Send OTP verification email
     * @param {string} email - Recipient email
     * @param {string} otp - OTP code
     * @param {string} firstName - User's first name
     * @returns {Promise<Object>} Email send result
     */
    async sendOTPEmail(email, otp, firstName) {
        const subject = 'Verify Your SkillSwap Account';

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Account</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp-code { background: #1e40af; color: white; font-size: 32px; font-weight: bold; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; letter-spacing: 8px; }
          .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 14px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to SkillSwap!</h1>
          </div>
          <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>Thank you for signing up for SkillSwap! To complete your registration, please verify your email address using the OTP code below:</p>
            
            <div class="otp-code">${otp}</div>
            
            <p>This code will expire in <strong>10 minutes</strong>. If you didn't create an account with SkillSwap, please ignore this email.</p>
            
            <div class="warning">
              <strong>Security Note:</strong> Never share this code with anyone. SkillSwap will never ask for your OTP code via phone or email.
            </div>
            
            <p>If you have any questions, feel free to contact our support team.</p>
            
            <p>Best regards,<br>The SkillSwap Team</p>
          </div>
          <div class="footer">
            <p>This email was sent to ${email}. If you didn't request this, please ignore this email.</p>
            <p>&copy; 2024 SkillSwap. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

        const text = `
      Hi ${firstName},

      Welcome to SkillSwap! 

      To complete your registration, please verify your email address using this OTP code: ${otp}

      This code will expire in 10 minutes.

      If you didn't create an account with SkillSwap, please ignore this email.

      Best regards,
      The SkillSwap Team
    `;

        return await this.sendEmail({
            to: email,
            subject,
            html,
            text,
        });
    }

    /**
     * Send welcome email after successful verification
     * @param {string} email - Recipient email
     * @param {string} firstName - User's first name
     * @returns {Promise<Object>} Email send result
     */
    async sendWelcomeEmail(email, firstName) {
        const subject = 'Welcome to SkillSwap - Your Account is Ready!';

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to SkillSwap</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 8px 8px; }
          .cta-button { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; }
          .features { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .feature { margin: 15px 0; }
          .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to SkillSwap!</h1>
          </div>
          <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>Congratulations! Your SkillSwap account has been successfully verified and is now ready to use.</p>
            
            <div class="features">
              <h3>What you can do now:</h3>
              <div class="feature">🔍 <strong>Discover Skills:</strong> Search for people with skills you want to learn</div>
              <div class="feature">📚 <strong>Share Your Expertise:</strong> Add your skills and help others learn</div>
              <div class="feature">💬 <strong>Connect & Chat:</strong> Message other users and schedule sessions</div>
              <div class="feature">⭐ <strong>Build Your Reputation:</strong> Give and receive reviews</div>
            </div>
            
            <p style="text-align: center;">
              <a href="${config.frontendUrl}/dashboard" class="cta-button">Get Started Now</a>
            </p>
            
            <p>We're excited to have you as part of our community of learners and teachers!</p>
            
            <p>Best regards,<br>The SkillSwap Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 SkillSwap. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

        const text = `
      Hi ${firstName},

      Congratulations! Your SkillSwap account has been successfully verified and is now ready to use.

      What you can do now:
      - Discover Skills: Search for people with skills you want to learn
      - Share Your Expertise: Add your skills and help others learn
      - Connect & Chat: Message other users and schedule sessions
      - Build Your Reputation: Give and receive reviews

      Get started: ${config.frontendUrl}/dashboard

      We're excited to have you as part of our community!

      Best regards,
      The SkillSwap Team
    `;

        return await this.sendEmail({
            to: email,
            subject,
            html,
            text,
        });
    }

    /**
     * Send password reset email
     * @param {string} email - Recipient email
     * @param {string} firstName - User's first name
     * @param {string} resetToken - Password reset token
     * @returns {Promise<Object>} Email send result
     */
    async sendPasswordResetEmail(email, firstName, resetToken) {
        const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;
        const subject = 'Reset Your SkillSwap Password';

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fef2f2; padding: 30px; border-radius: 0 0 8px 8px; }
          .cta-button { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>We received a request to reset your SkillSwap account password. Click the button below to create a new password:</p>
            
            <p style="text-align: center;">
              <a href="${resetUrl}" class="cta-button">Reset Password</a>
            </p>
            
            <p>This link will expire in <strong>1 hour</strong> for security reasons.</p>
            
            <div class="warning">
              <strong>Security Note:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #3b82f6;">${resetUrl}</p>
            
            <p>Best regards,<br>The SkillSwap Team</p>
          </div>
          <div class="footer">
            <p>This email was sent to ${email}.</p>
            <p>&copy; 2024 SkillSwap. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

        const text = `
      Hi ${firstName},

      We received a request to reset your SkillSwap account password.

      Reset your password: ${resetUrl}

      This link will expire in 1 hour for security reasons.

      If you didn't request this password reset, please ignore this email.

      Best regards,
      The SkillSwap Team
    `;

        return await this.sendEmail({
            to: email,
            subject,
            html,
            text,
        });
    }

    /**
     * Send account locked notification email
     * @param {string} email - Recipient email
     * @param {string} firstName - User's first name
     * @param {Date} lockUntil - When the account will be unlocked
     * @returns {Promise<Object>} Email send result
     */
    async sendAccountLockedEmail(email, firstName, lockUntil) {
        const unlockTime = lockUntil.toLocaleString();
        const subject = 'SkillSwap Account Temporarily Locked';

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Locked</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fffbeb; padding: 30px; border-radius: 0 0 8px 8px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Account Temporarily Locked</h1>
          </div>
          <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>Your SkillSwap account has been temporarily locked due to multiple failed login attempts.</p>
            
            <div class="warning">
              <strong>Account will be unlocked at:</strong> ${unlockTime}
            </div>
            
            <p>This is a security measure to protect your account. If you believe this was not you attempting to log in, please consider:</p>
            <ul>
              <li>Changing your password once the account is unlocked</li>
              <li>Reviewing your account security settings</li>
              <li>Contacting our support team if you have concerns</li>
            </ul>
            
            <p>If you have any questions or need assistance, please contact our support team.</p>
            
            <p>Best regards,<br>The SkillSwap Security Team</p>
          </div>
          <div class="footer">
            <p>This email was sent to ${email}.</p>
            <p>&copy; 2024 SkillSwap. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

        const text = `
      Hi ${firstName},

      Your SkillSwap account has been temporarily locked due to multiple failed login attempts.

      Account will be unlocked at: ${unlockTime}

      This is a security measure to protect your account. If this wasn't you, please consider changing your password once unlocked.

      Best regards,
      The SkillSwap Security Team
    `;

        return await this.sendEmail({
            to: email,
            subject,
            html,
            text,
        });
    }

    /**
     * Test email service by sending a test email
     * @param {string} testEmail - Email to send test to
     * @returns {Promise<Object>} Test result
     */
    async sendTestEmail(testEmail) {
        const subject = 'SkillSwap Email Service Test';

        const html = `
      <h2>Email Service Test</h2>
      <p>This is a test email to verify that the SkillSwap email service is working correctly.</p>
      <p>Timestamp: ${new Date().toISOString()}</p>
    `;

        const text = `
      Email Service Test
      
      This is a test email to verify that the SkillSwap email service is working correctly.
      
      Timestamp: ${new Date().toISOString()}
    `;

        return await this.sendEmail({
            to: testEmail,
            subject,
            html,
            text,
        });
    }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;