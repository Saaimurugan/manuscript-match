const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestProcesses() {
  try {
    console.log('🔍 Checking existing users...');
    
    // Get test users
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: ['admin@test.com', 'user@test.com', 'user2@test.com']
        }
      }
    });
    
    if (users.length === 0) {
      console.log('❌ No test users found. Please run create-test-user.js first');
      return;
    }
    
    console.log('✅ Found test users:', users.map(u => u.email));
    
    // Delete existing test processes
    await prisma.process.deleteMany({
      where: {
        title: {
          startsWith: 'Test Process'
        }
      }
    });
    
    console.log('🗑️ Deleted existing test processes');
    
    // Create test processes for each user
    const testProcesses = [];
    
    for (const user of users) {
      const userProcesses = [
        {
          userId: user.id,
          title: `Test Process 1 - ${user.email}`,
          status: 'CREATED',
          currentStep: 'UPLOAD',
          metadata: JSON.stringify({
            description: 'A test manuscript analysis process',
            createdBy: 'test-script',
            testData: true
          })
        },
        {
          userId: user.id,
          title: `Test Process 2 - ${user.email}`,
          status: 'PROCESSING',
          currentStep: 'METADATA_EXTRACTION',
          metadata: JSON.stringify({
            description: 'Another test process in progress',
            createdBy: 'test-script',
            testData: true
          })
        },
        {
          userId: user.id,
          title: `Test Process 3 - ${user.email}`,
          status: 'COMPLETED',
          currentStep: 'EXPORT',
          metadata: JSON.stringify({
            description: 'A completed test process',
            createdBy: 'test-script',
            testData: true
          })
        }
      ];
      
      testProcesses.push(...userProcesses);
    }
    
    // Create all test processes
    for (const processData of testProcesses) {
      console.log(`📝 Creating process: ${processData.title}`);
      
      const process = await prisma.process.create({
        data: processData
      });
      
      console.log(`✅ Created process: ${process.title} (ID: ${process.id})`);
    }
    
    console.log('🎉 Test processes created successfully!');
    
    // Verify the processes
    const allProcesses = await prisma.process.findMany({
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });
    
    console.log('\n📋 All processes in database:');
    allProcesses.forEach(process => {
      console.log(`- ${process.title} (${process.status}) - User: ${process.user.email}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating test processes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestProcesses();