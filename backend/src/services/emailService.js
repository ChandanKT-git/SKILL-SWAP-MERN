const nodemailer = require('nodemailer');
const { ValidationError } = require('../middleware/errorHandler');

/**
 * Email Service
 * Handles email delivery for notifications and other system emails
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeTransporter() {
    try {
      // Configure based on environment
      if (process.env.NODE_ENV === 'production') {
        // Production configuration (e.g., SendGrid, AWS SES, etc.)
        this.transporter = nodemailer.createTransport({
          service: process.env.EMAIL_SERVICE || 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        });
      } else {
        // Development configuration (Ethereal Email for testing)
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          auth: {
            user: process.env.ETHEREAL_USER || 'ethereal.user@ethereal.email',
            pass: process.env.ETHEREAL_PASS || 'ethereal.pass'
          }
        });
      }
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
      this.transporter = null;
    }
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(emailData) {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }

    const { to, subject, template, data } = emailData;

    if (!to || !subject) {
      throw new ValidationError('Email recipient and subject are required');
    }

    try {
      const htmlContent = this.generateEmailHTML(template, data);
      const textContent = this.generateEmailText(data);

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'SkillSwap <noreply@skillswap.com>',
        to,
        subject,
        text: textContent,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);

      console.log('Email sent successfully:', {
        messageId: result.messageId,
        to,
        subject
      });

      return {
        success: true,
        messageId: result.messageId,
        previewUrl: nodemailer.getTestMessageUrl(result) // For development
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }

  /**
   * Generate HTML email content based on template
   */
  generateEmailHTML(template, data) {
    const {
      recipientName = 'User',
      senderName = 'SkillSwap',
      title = 'Notification',
      message = '',
      actionUrl = '',
      actionText = 'View Details'
    } = data;

    // Basic email template - in production, use a proper template engine
    const baseTemplate = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    background-color: #4F46E5;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }
                .content {
                    background-color: #f9f9f9;
                    padding: 30px;
                    border-radius: 0 0 8px 8px;
                }
                .button {
                    display: inline-block;
                    background-color: #4F46E5;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 20px 0;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    color: #666;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>SkillSwap</h1>
            </div>
            <div class="content">
                <h2>Hi ${recipientName},</h2>
                <p>${message}</p>
                ${actionUrl ? `<a href="${actionUrl}" class="button">${actionText}</a>` : ''}
                <p>Best regards,<br>The SkillSwap Team</p>
            </div>
            <div class="footer">
                <p>This email was sent by SkillSwap. If you no longer wish to receive these emails, you can update your notification preferences in your account settings.</p>
            </div>
        </body>
        </html>
        `;

    // Template-specific customizations
    const templateCustomizations = {
      'session-request': {
        icon: '📅',
        color: '#059669'
      },
      'session-accepted': {
        icon: '✅',
        color: '#059669'
      },
      'session-declined': {
        icon: '❌',
        color: '#DC2626'
      },
      'session-cancelled': {
        icon: '🚫',
        color: '#DC2626'
      },
      'session-reminder': {
        icon: '⏰',
        color: '#D97706'
      },
      'session-completed': {
        icon: '🎉',
        color: '#059669'
      },
      'review-received': {
        icon: '⭐',
        color: '#7C3AED'
      },
      'account-verified': {
        icon: '🎉',
        color: '#059669'
      },
      'security-alert': {
        icon: '🔒',
        color: '#DC2626'
      }
    };

    // Apply template customization if available
    const customization = templateCustomizations[template];
    if (customization) {
      return baseTemplate.replace('#4F46E5', customization.color);
    }

    return baseTemplate;
  }

  /**
   * Generate plain text email content
   */
  generateEmailText(data) {
    const {
      recipientName = 'User',
      title = 'Notification',
      message = '',
      actionUrl = ''
    } = data;

    return `
Hi ${recipientName},

${message}

${actionUrl ? `View details: ${actionUrl}` : ''}

Best regards,
The SkillSwap Team

---
This email was sent by SkillSwap. If you no longer wish to receive these emails, you can update your notification preferences in your account settings.
        `.trim();
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(userData) {
    const { email, firstName } = userData;

    return await this.sendNotificationEmail({
      to: email,
      subject: 'Welcome to SkillSwap!',
      template: 'welcome',
      data: {
        recipientName: firstName,
        title: 'Welcome to SkillSwap!',
        message: 'Thank you for joining SkillSwap! We\'re excited to help you connect with others and share your skills.',
        actionUrl: `${process.env.FRONTEND_URL}/dashboard`,
        actionText: 'Get Started'
      }
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(userData, resetToken) {
    const { email, firstName } = userData;
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    return await this.sendNotificationEmail({
      to: email,
      subject: 'Password Reset Request',
      template: 'password-reset',
      data: {
        recipientName: firstName,
        title: 'Password Reset Request',
        message: 'You requested a password reset. Click the button below to reset your password. This link will expire in 1 hour.',
        actionUrl: resetUrl,
        actionText: 'Reset Password'
      }
    });
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(userData, verificationToken) {
    const { email, firstName } = userData;
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    return await this.sendNotificationEmail({
      to: email,
      subject: 'Verify Your Email Address',
      template: 'email-verification',
      data: {
        recipientName: firstName,
        title: 'Verify Your Email Address',
        message: 'Please verify your email address to complete your account setup.',
        actionUrl: verificationUrl,
        actionText: 'Verify Email'
      }
    });
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration() {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'Email configuration is valid' };
    } catch (error) {
      throw new Error(`Email configuration test failed: ${error.message}`);
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;