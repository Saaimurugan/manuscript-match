const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function setupTestUser() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Setting up test user...');
    
    // Delete existing user if exists
    try {
      await prisma.user.delete({
        where: { email: 'testuser@example.com' }
      });
      console.log('🗑️ Removed existing user');
    } catch (e) {
      // User doesn't exist, that's fine
    }
    
    // Create new user with hashed password
    const passwordHash = await bcrypt.hash('testpassword123', 10);
    
    const user = await prisma.user.create({
      data: {
        email: 'testuser@example.com',
        passwordHash: passwordHash,
        role: 'USER',
        status: 'ACTIVE'
      }
    });
    
    console.log('✅ Test user created successfully!');
    console.log('📧 Email: testuser@example.com');
    console.log('🔑 Password: testpassword123');
    console.log('🆔 User ID:', user.id);
    console.log('');
    console.log('🚀 You can now start the backend with: npm run dev');
    console.log('🔗 Then test login at: http://localhost:3002/api/auth/login');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestUser();