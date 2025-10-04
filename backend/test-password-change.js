const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function testPasswordChange() {
  try {
    console.log('🔍 Testing password change functionality...');
    
    // Find a test user
    const testUser = await prisma.user.findFirst({
      where: {
        email: 'user@test.com'
      }
    });
    
    if (!testUser) {
      console.log('❌ Test user not found. Please run create-test-user.js first');
      return;
    }
    
    console.log('✅ Found test user:', {
      id: testUser.id,
      email: testUser.email,
      hasPasswordHash: !!testUser.passwordHash,
      passwordHashLength: testUser.passwordHash?.length
    });
    
    // Test current password verification
    const currentPassword = 'testpassword123';
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, testUser.passwordHash);
    console.log('🔑 Current password verification:', isCurrentPasswordValid ? '✅ VALID' : '❌ INVALID');
    
    if (!isCurrentPasswordValid) {
      console.log('❌ Current password is incorrect. Cannot proceed with test.');
      return;
    }
    
    // Test new password hashing
    const newPassword = 'newtestpassword123';
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    console.log('🔐 New password hashed successfully:', hashedNewPassword.substring(0, 20) + '...');
    
    // Test updating password in database
    const updatedUser = await prisma.user.update({
      where: { id: testUser.id },
      data: { passwordHash: hashedNewPassword }
    });
    
    console.log('💾 Password updated in database for user:', updatedUser.id);
    
    // Verify new password works
    const isNewPasswordValid = await bcrypt.compare(newPassword, updatedUser.passwordHash);
    console.log('🧪 New password verification:', isNewPasswordValid ? '✅ VALID' : '❌ INVALID');
    
    // Restore original password
    await prisma.user.update({
      where: { id: testUser.id },
      data: { passwordHash: testUser.passwordHash }
    });
    
    console.log('🔄 Original password restored');
    console.log('🎉 Password change test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing password change:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPasswordChange();