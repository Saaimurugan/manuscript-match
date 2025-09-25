const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🔍 Checking existing users...');
    
    // Check if users exist
    const existingUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true
      }
    });
    
    console.log('📋 Existing users:', existingUsers);
    
    // Delete existing test users to recreate them
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['admin@test.com', 'user@test.com', 'user2@test.com']
        }
      }
    });
    
    console.log('🗑️ Deleted existing test users');
    
    // Create fresh test users with proper password hashing
    const testUsers = [
      {
        email: 'admin@test.com',
        password: 'adminpassword123',
        role: 'ADMIN'
      },
      {
        email: 'user@test.com',
        password: 'testpassword123',
        role: 'USER'
      },
      {
        email: 'user2@test.com',
        password: 'testpassword456',
        role: 'USER'
      }
    ];
    
    for (const userData of testUsers) {
      console.log(`🔐 Creating user: ${userData.email}`);
      
      // Hash password with bcrypt
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);
      
      console.log(`🔑 Password hash for ${userData.email}: ${passwordHash.substring(0, 20)}...`);
      
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          passwordHash,
          role: userData.role,
          status: 'ACTIVE'
        }
      });
      
      console.log(`✅ Created user: ${user.email} (${user.role}) - ID: ${user.id}`);
      
      // Test password verification
      const isValid = await bcrypt.compare(userData.password, passwordHash);
      console.log(`🧪 Password verification test for ${userData.email}: ${isValid ? '✅ PASS' : '❌ FAIL'}`);
    }
    
    console.log('🎉 Test users created successfully!');
    console.log('\n📝 Login credentials:');
    console.log('Admin: admin@test.com / adminpassword123');
    console.log('User: user@test.com / testpassword123');
    console.log('User2: user2@test.com / testpassword456');
    
  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();