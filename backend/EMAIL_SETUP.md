# Email Service Setup Guide

The invite user functionality requires email configuration to send actual invitation emails. Currently, the system is running in **mock mode** and only logs emails to the console.

## Quick Setup Options

### Option 1: Gmail SMTP (Recommended for Development)

1. **Create an App Password** (if using Gmail):
   - Go to Google Account settings
   - Enable 2-Factor Authentication
   - Generate an App Password for "Mail"

2. **Update your `.env` file**:
   ```bash
   # Copy from .env.example if needed
   cp .env.example .env
   ```

3. **Add email configuration to `.env`**:
   ```env
   EMAIL_SERVICE=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password-here
   EMAIL_FROM=your-email@gmail.com
   EMAIL_FROM_NAME=ScholarFinder
   ```

### Option 2: Other SMTP Providers

#### Outlook/Hotmail
```env
EMAIL_SERVICE=smtp
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
EMAIL_FROM=your-email@outlook.com
EMAIL_FROM_NAME=ScholarFinder
```

#### Custom SMTP Server
```env
EMAIL_SERVICE=smtp
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASS=your-password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=ScholarFinder
```

## Installation Steps

1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables** (see options above)

3. **Restart the backend server**:
   ```bash
   npm run dev
   ```

## Testing Email Configuration

1. **Check console logs** when starting the server:
   - ✅ `📧 Email service initialized with SMTP configuration`
   - ❌ `⚠️ Email configuration incomplete - falling back to mock mode`

2. **Test by inviting a user**:
   - Go to Admin → User Management
   - Click "Invite User"
   - Check console for success/error messages

## Troubleshooting

### Common Issues

1. **"Authentication failed"**
   - Verify username/password
   - For Gmail: Use App Password, not regular password
   - Enable "Less secure app access" if needed

2. **"Connection timeout"**
   - Check SMTP host and port
   - Verify firewall settings
   - Try different ports (25, 465, 587)

3. **"Still in mock mode"**
   - Verify all required env variables are set
   - Restart the server after changing .env
   - Check for typos in variable names

### Debug Mode

To see detailed email logs, check the console output when inviting users. The system will show:
- Configuration status on startup
- Email sending attempts
- Success/failure messages with details

## Production Considerations

For production environments, consider:

1. **Professional Email Service**:
   - SendGrid
   - AWS SES
   - Mailgun
   - Postmark

2. **Security**:
   - Use environment variables for credentials
   - Enable TLS/SSL
   - Use dedicated email service accounts

3. **Monitoring**:
   - Track email delivery rates
   - Monitor bounce/spam rates
   - Set up alerts for failures

## Current Status

- ✅ Email service infrastructure is ready
- ✅ Invitation email templates are configured
- ⚠️ **SMTP configuration needed to send real emails**
- ✅ Fallback to mock mode when not configured