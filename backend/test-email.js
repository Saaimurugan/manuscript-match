/**
 * Simple email configuration test script
 * Run with: node test-email.js
 */

require('dotenv').config();

async function testEmailConfig() {
  console.log('🧪 Testing Email Configuration...\n');

  // Check environment variables
  const requiredVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.log('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.log(`   - ${varName}`));
    console.log('\n💡 Please configure these in your .env file');
    console.log('📖 See EMAIL_SETUP.md for detailed instructions');
    return;
  }

  console.log('✅ Environment variables configured:');
  console.log(`   SMTP_HOST: ${process.env.SMTP_HOST}`);
  console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || 587}`);
  console.log(`   SMTP_USER: ${process.env.SMTP_USER}`);
  console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM}`);
  console.log(`   EMAIL_FROM_NAME: ${process.env.EMAIL_FROM_NAME || 'ScholarFinder'}`);

  // Test SMTP connection
  try {
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    console.log('\n🔌 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    // Optionally send a test email (uncomment to enable)
    /*
    const testEmail = {
      from: `"${process.env.EMAIL_FROM_NAME || 'ScholarFinder'}" <${process.env.EMAIL_FROM}>`,
      to: process.env.SMTP_USER, // Send to yourself for testing
      subject: 'ScholarFinder Email Test',
      html: `
        <h2>Email Configuration Test</h2>
        <p>If you receive this email, your ScholarFinder email configuration is working correctly!</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      `
    };

    console.log('\n📧 Sending test email...');
    const result = await transporter.sendMail(testEmail);
    console.log(`✅ Test email sent successfully!`);
    console.log(`📧 Message ID: ${result.messageId}`);
    */

    console.log('\n🎉 Email configuration is ready!');
    console.log('💡 User invitations will now send real emails');

  } catch (error) {
    console.log('\n❌ SMTP connection failed:');
    console.log(`   Error: ${error.message}`);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('   - Verify SMTP host and port');
    console.log('   - Check username and password');
    console.log('   - For Gmail: use App Password, not regular password');
    console.log('   - Check firewall/network settings');
  }
}

testEmailConfig().catch(console.error);