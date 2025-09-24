import { UserRole } from '@/types';

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

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  /**
   * Send invitation email to a new user
   */
  async sendInvitationEmail(data: InvitationEmailData): Promise<EmailSendResult> {
    try {
      // For now, we'll just log the email content
      // In a real implementation, this would integrate with an email service like SendGrid, AWS SES, etc.
      const invitationUrl = `${this.baseUrl}/accept-invitation?token=${data.invitationToken}`;
      
      const emailContent = this.generateInvitationEmailContent(data, invitationUrl);
      
      // Log the email content for development/testing
      console.log('=== INVITATION EMAIL ===');
      console.log(`To: ${data.email}`);
      console.log(`Subject: ${emailContent.subject}`);
      console.log(`Body:\n${emailContent.body}`);
      console.log('========================');

      // In a real implementation, you would send the email here
      // Example with a hypothetical email service:
      // const result = await this.emailProvider.send({
      //   to: data.email,
      //   subject: emailContent.subject,
      //   html: emailContent.body,
      // });

      return {
        success: true,
        messageId: `mock-${Date.now()}`, // Mock message ID
      };
    } catch (error) {
      console.error('Failed to send invitation email:', error);
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