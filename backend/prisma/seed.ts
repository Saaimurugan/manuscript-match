import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test users
  const testUsers = [
    {
      email: 'user@test.com',
      password: 'testpassword123',
      role: 'USER'
    },
    {
      email: 'admin@test.com',
      password: 'adminpassword123',
      role: 'ADMIN'
    },
    {
      email: 'user2@test.com',
      password: 'testpassword456',
      role: 'USER'
    }
  ];

  for (const userData of testUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (!existingUser) {
      const passwordHash = await bcrypt.hash(userData.password, 10);
      
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          passwordHash,
          role: userData.role
        }
      });

      console.log(`✅ Created user: ${user.email} (${user.role})`);
    } else {
      console.log(`⚠️ User already exists: ${userData.email}`);
    }
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });