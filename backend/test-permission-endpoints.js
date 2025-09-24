const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function setupTestData() {
  console.log('Setting up test data...');
  
  // Clean up existing data
  await prisma.userPermission.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.user.deleteMany();

  // Create test permissions
  const permissions = [
    { name: 'users.read', description: 'Read user information', resource: 'users', action: 'read' },
    { name: 'users.create', description: 'Create new users', resource: 'users', action: 'create' },
    { name: 'users.update', description: 'Update user information', resource: 'users', action: 'update' },
    { name: 'permissions.read', description: 'Read permissions', resource: 'permissions', action: 'read' },
    { name: 'permissions.assign', description: 'Assign permissions to users', resource: 'permissions', action: 'assign' },
    { name: 'permissions.manage', description: 'Manage role permissions', resource: 'permissions', action: 'manage' },
  ];

  const createdPermissions = [];
  for (const perm of permissions) {
    const created = await prisma.permission.create({ data: perm });
    createdPermissions.push(created);
  }

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      passwordHash: hashedPassword,
      role: 'ADMIN',
    },
  });

  const regularUser = await prisma.user.create({
    data: {
      email: 'user@test.com',
      passwordHash: hashedPassword,
      role: 'USER',
    },
  });

  // Set up admin role permissions
  const adminPermissions = createdPermissions.filter(p => 
    ['permissions.read', 'permissions.assign', 'permissions.manage', 'users.read', 'users.create', 'users.update'].includes(p.name)
  );
  
  for (const permission of adminPermissions) {
    await prisma.rolePermission.create({
      data: {
        role: 'ADMIN',
        permissionId: permission.id,
      },
    });
  }

  console.log('Test data setup complete!');
  return { adminUser, regularUser, createdPermissions };
}

async function testPermissionEndpoints() {
  try {
    const { adminUser, regularUser, createdPermissions } = await setupTestData();
    
    // Generate JWT token for admin
    const jwtSecret = process.env.JWT_SECRET || 'test-secret';
    const adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: 'ADMIN' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    console.log('\n=== Testing Permission Management Endpoints ===\n');
    
    // Test 1: Get all permissions
    console.log('1. Testing GET /api/admin/permissions');
    console.log('Expected: Should return all permissions grouped by resource');
    console.log('Permissions created:', createdPermissions.length);
    
    // Test 2: Assign permissions to user
    console.log('\n2. Testing PUT /api/admin/users/:id/permissions');
    const permissionsToAssign = createdPermissions
      .filter(p => ['users.read', 'users.create'].includes(p.name))
      .map(p => p.id);
    console.log('Expected: Should assign permissions to user');
    console.log('Permissions to assign:', permissionsToAssign);
    console.log('Target user:', regularUser.id);
    
    // Test 3: Update role permissions
    console.log('\n3. Testing PUT /api/admin/roles/:role/permissions');
    const rolePermissions = createdPermissions
      .filter(p => ['users.read'].includes(p.name))
      .map(p => p.id);
    console.log('Expected: Should update MANAGER role permissions');
    console.log('Role permissions to set:', rolePermissions);
    
    console.log('\n=== Manual Testing Instructions ===');
    console.log('1. Start the server: npm run dev');
    console.log('2. Use the following curl commands to test:');
    console.log('');
    console.log('# Get all permissions');
    console.log(`curl -X GET http://localhost:3000/api/admin/permissions \\`);
    console.log(`  -H "Authorization: Bearer ${adminToken}"`);
    console.log('');
    console.log('# Assign permissions to user');
    console.log(`curl -X PUT http://localhost:3000/api/admin/users/${regularUser.id}/permissions \\`);
    console.log(`  -H "Authorization: Bearer ${adminToken}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"permissions": ${JSON.stringify(permissionsToAssign)}}'`);
    console.log('');
    console.log('# Update role permissions');
    console.log(`curl -X PUT http://localhost:3000/api/admin/roles/MANAGER/permissions \\`);
    console.log(`  -H "Authorization: Bearer ${adminToken}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"permissions": ${JSON.stringify(rolePermissions)}}'`);
    
    console.log('\n=== Test Data Summary ===');
    console.log('Admin User ID:', adminUser.id);
    console.log('Regular User ID:', regularUser.id);
    console.log('Admin Token (first 50 chars):', adminToken.substring(0, 50) + '...');
    console.log('Total Permissions:', createdPermissions.length);
    
  } catch (error) {
    console.error('Test setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPermissionEndpoints();