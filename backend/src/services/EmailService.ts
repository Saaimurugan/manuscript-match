import { UserRole } from '@/types';
import nodemailer from 'nodemailer';

export interface InvitationEmailData {
  email: string;
  inviterName: string;
  inviterEmail: string;
  role: UserRole;
  invitationToken: string;
  expiresAt: Date;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private baseUrl: string;
  private transporter: nodemailer.Transporter | null = null;
  private emailConfig: {
    service: string;
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
    from?: string;
    fromName?: string;
  };

  constructor(baseUrl: string = process.env['FRONTEND_URL'] || 'http://localhost:8080') {
    this.baseUrl = baseUrl;
    this.emailConfig = {
      service: process.env['EMAIL_SERVICE'] || 'mock',
      ...(process.env['SMTP_HOST'] && { host: process.env['SMTP_HOST'] }),
      port: process.env['SMTP_PORT'] ? parseInt(process.env['SMTP_PORT']) : 587,
      secure: process.env['SMTP_SECURE'] === 'true',
      ...(process.env['SMTP_USER'] && { user: process.env['SMTP_USER'] }),
      ...(process.env['SMTP_PASS'] && { pass: process.env['SMTP_PASS'] }),
      ...(process.env['EMAIL_FROM'] && { from: process.env['EMAIL_FROM'] }),
      fromName: process.env['EMAIL_FROM_NAME'] || 'ScholarFinder',
    };

    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    if (this.emailConfig.service === 'mock') {
      console.log('📧 Email service running in MOCK mode - emails will be logged to console');
      return;
    }

    if (!this.emailConfig.host || !this.emailConfig.user || !this.emailConfig.pass) {
      console.warn('⚠️  Email configuration incomplete - falling back to mock mode');
      this.emailConfig.service = 'mock';
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        secure: this.emailConfig.secure,
        auth: {
          user: this.emailConfig.user,
          pass: this.emailConfig.pass,
        },
      });

      console.log('📧 Email service initialized with SMTP configuration');
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error);
      this.emailConfig.service = 'mock';
    }
  }

  /**
   * Send invitation email to a new user
   */
  async sendInvitationEmail(data: InvitationEmailData): Promise<EmailSendResult> {
    try {
      const invitationUrl = `${this.baseUrl}/accept-invitation?token=${data.invitationToken}`;
      const emailContent = this.generateInvitationEmailContent(data, invitationUrl);

      // If in mock mode, just log the email
      if (this.emailConfig.service === 'mock' || !this.transporter) {
        console.log('=== INVITATION EMAIL (MOCK MODE) ===');
        console.log(`To: ${data.email}`);
        console.log(`Subject: ${emailContent.subject}`);
        console.log(`Body:\n${emailContent.body}`);
        console.log('=====================================');
        console.log('💡 To send real emails, configure SMTP settings in .env file');

        return {
          success: true,
          messageId: `mock-${Date.now()}`,
        };
      }

      // Send actual email
      const mailOptions = {
        from: `"${this.emailConfig.fromName}" <${this.emailConfig.from}>`,
        to: data.email,
        subject: emailContent.subject,
        html: emailContent.body,
      };

      const result = await this.transporter.sendMail(mailOptions);

      console.log(`✅ Invitation email sent successfully to ${data.email}`);
      console.log(`📧 Message ID: ${result.messageId}`);

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error('❌ Failed to send invitation email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate invitation email content
   */
  private generateInvitationEmailContent(
    data: InvitationEmailData,
    invitationUrl: string
  ): { subject: string; body: string } {
    const roleDisplayName = this.getRoleDisplayName(data.role);
    const expirationDate = data.expiresAt.toLocaleDateString();

    const subject = `Invitation to join ScholarFinder as ${roleDisplayName}`;

    const body = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>ScholarFinder Invitation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
        .content { padding: 20px 0; }
        .button { 
            display: inline-block; 
            background-color: #007bff; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
        }
        .footer { font-size: 12px; color: #666; margin-top: 30px; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ScholarFinder Invitation</h1>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            
            <p>You have been invited by <strong>${data.inviterName}</strong> (${data.inviterEmail}) to join ScholarFinder as a <strong>${roleDisplayName}</strong>.</p>
            
            <p>ScholarFinder is a comprehensive platform for managing scholarly research processes, author validation, and peer review workflows.</p>
            
            <div class="warning">
                <strong>Important:</strong> This invitation will expire on <strong>${expirationDate}</strong>. Please accept it before this date.
            </div>
            
            <p>To accept this invitation and create your account, click the button below:</p>
            
            <a href="${invitationUrl}" class="button">Accept Invitation</a>
            
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="${invitationUrl}">${invitationUrl}</a></p>
            
            <p>If you have any questions about this invitation, please contact ${data.inviterEmail}.</p>
            
            <p>Best regards,<br>The ScholarFinder Team</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>If you did not expect this invitation, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>
    `.trim();

    return { subject, body };
  }

  /**
   * Get display name for user role
   */
  private getRoleDisplayName(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return 'Administrator';
      case UserRole.MANAGER:
        return 'Manager';
      case UserRole.QC:
        return 'Quality Control Specialist';
      case UserRole.USER:
        return 'User';
      default:
        return 'User';
    }
  }

  /**
   * Send password reset email (placeholder for future implementation)
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<EmailSendResult> {
    // Placeholder implementation
    console.log(`Password reset email would be sent to ${email} with token ${resetToken}`);
    return { success: true, messageId: `mock-reset-${Date.now()}` };
  }

  /**
   * Send notification email (placeholder for future implementation)
   */
  async sendNotificationEmail(
    email: string,
    subject: string,
    _message: string
  ): Promise<EmailSendResult> {
    // Placeholder implementation
    console.log(`Notification email: ${subject} to ${email}`);
    return { success: true, messageId: `mock-notification-${Date.now()}` };
  }
}