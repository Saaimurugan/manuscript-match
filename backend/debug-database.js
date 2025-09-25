const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugDatabase() {
  try {
    console.log('🔍 Database Debug Information');
    console.log('============================');
    
    // Check users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true
      }
    });
    
    console.log('\n👥 Users in database:');
    if (users.length === 0) {
      console.log('❌ No users found');
    } else {
      users.forEach(user => {
        console.log(`- ${user.email} (${user.role}) - ID: ${user.id}`);
      });
    }
    
    // Check processes
    const processes = await prisma.process.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        currentStep: true,
        userId: true,
        metadata: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    console.log('\n📋 Processes in database:');
    if (processes.length === 0) {
      console.log('❌ No processes found');
    } else {
      processes.forEach(process => {
        console.log(`- ${process.title || 'NO TITLE'} (${process.status || 'NO STATUS'}) - User: ${process.userId || 'NO USER'}`);
        console.log(`  ID: ${process.id || 'NO ID'}`);
        console.log(`  Step: ${process.currentStep || 'NO STEP'}`);
        console.log(`  Metadata: ${process.metadata ? 'Present' : 'Missing'}`);
        console.log(`  Created: ${process.createdAt || 'NO DATE'}`);
        console.log('');
      });
    }
    
    // Check for any null/undefined values
    console.log('\n🔍 Checking for data integrity issues...');
    const processesWithIssues = processes.filter(p => 
      !p.id || !p.title || !p.status || !p.currentStep || !p.userId
    );
    
    if (processesWithIssues.length > 0) {
      console.log('❌ Found processes with missing required fields:');
      processesWithIssues.forEach(p => {
        console.log(`- Process ID: ${p.id || 'MISSING'}`);
        console.log(`  Missing fields: ${[
          !p.title && 'title',
          !p.status && 'status', 
          !p.currentStep && 'currentStep',
          !p.userId && 'userId'
        ].filter(Boolean).join(', ')}`);
      });
    } else {
      console.log('✅ All processes have required fields');
    }
    
  } catch (error) {
    console.error('❌ Error debugging database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDatabase();