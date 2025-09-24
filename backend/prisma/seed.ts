import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed permissions first
  await seedPermissions();

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

async function seedPermissions() {
  console.log('🔐 Seeding permissions...');

  // Define default permissions
  const permissions = [
    // User Management Permissions
    {
      name: 'users.create',
      description: 'Create new users and send invitations',
      resource: 'users',
      action: 'create'
    },
    {
      name: 'users.read',
      description: 'View user information and lists',
      resource: 'users',
      action: 'read'
    },
    {
      name: 'users.update',
      description: 'Edit user information and profiles',
      resource: 'users',
      action: 'update'
    },
    {
      name: 'users.delete',
      description: 'Delete users from the system',
      resource: 'users',
      action: 'delete'
    },
    {
      name: 'users.manage',
      description: 'Full user management including role changes',
      resource: 'users',
      action: 'manage'
    },
    {
      name: 'users.block',
      description: 'Block and unblock user accounts',
      resource: 'users',
      action: 'block'
    },
    {
      name: 'users.invite',
      description: 'Send user invitations',
      resource: 'users',
      action: 'invite'
    },

    // Process Management Permissions
    {
      name: 'processes.create',
      description: 'Create new processes and templates',
      resource: 'processes',
      action: 'create'
    },
    {
      name: 'processes.read',
      description: 'View process information and lists',
      resource: 'processes',
      action: 'read'
    },
    {
      name: 'processes.update',
      description: 'Edit process configurations and settings',
      resource: 'processes',
      action: 'update'
    },
    {
      name: 'processes.delete',
      description: 'Delete processes from the system',
      resource: 'processes',
      action: 'delete'
    },
    {
      name: 'processes.manage',
      description: 'Full process management including stage control',
      resource: 'processes',
      action: 'manage'
    },
    {
      name: 'processes.reset',
      description: 'Reset process stages and workflow states',
      resource: 'processes',
      action: 'reset'
    },

    // Permission Management
    {
      name: 'permissions.read',
      description: 'View permission information and assignments',
      resource: 'permissions',
      action: 'read'
    },
    {
      name: 'permissions.assign',
      description: 'Assign custom permissions to users',
      resource: 'permissions',
      action: 'assign'
    },
    {
      name: 'permissions.revoke',
      description: 'Revoke permissions from users',
      resource: 'permissions',
      action: 'revoke'
    },
    {
      name: 'permissions.manage',
      description: 'Full permission management including role permissions',
      resource: 'permissions',
      action: 'manage'
    },

    // System Administration
    {
      name: 'system.admin',
      description: 'Full system administration access',
      resource: 'system',
      action: 'admin'
    },
    {
      name: 'system.logs',
      description: 'View and export system activity logs',
      resource: 'system',
      action: 'logs'
    },
    {
      name: 'system.monitor',
      description: 'Monitor system health and performance',
      resource: 'system',
      action: 'monitor'
    },
    {
      name: 'system.config',
      description: 'Modify system configuration settings',
      resource: 'system',
      action: 'config'
    }
  ];

  // Create permissions
  for (const permissionData of permissions) {
    const existingPermission = await prisma.permission.findUnique({
      where: { name: permissionData.name }
    });

    if (!existingPermission) {
      await prisma.permission.create({
        data: permissionData
      });
      console.log(`✅ Created permission: ${permissionData.name}`);
    } else {
      console.log(`⚠️ Permission already exists: ${permissionData.name}`);
    }
  }

  // Define role-based permissions
  const rolePermissions = [
    // ADMIN - Full access to everything
    { role: 'ADMIN', permissions: [
      'users.create', 'users.read', 'users.update', 'users.delete', 'users.manage', 'users.block', 'users.invite',
      'processes.create', 'processes.read', 'processes.update', 'processes.delete', 'processes.manage', 'processes.reset',
      'permissions.read', 'permissions.assign', 'permissions.revoke', 'permissions.manage',
      'system.admin', 'system.logs', 'system.monitor', 'system.config'
    ]},
    
    // MANAGER - User and process management, limited system access
    { role: 'MANAGER', permissions: [
      'users.read', 'users.update', 'users.invite',
      'processes.create', 'processes.read', 'processes.update', 'processes.manage', 'processes.reset',
      'permissions.read',
      'system.logs', 'system.monitor'
    ]},
    
    // QC - Process management and monitoring
    { role: 'QC', permissions: [
      'users.read',
      'processes.read', 'processes.update', 'processes.reset',
      'system.logs'
    ]},
    
    // USER - Basic access
    { role: 'USER', permissions: [
      'processes.read'
    ]}
  ];

  // Create role permissions
  for (const roleData of rolePermissions) {
    for (const permissionName of roleData.permissions) {
      const permission = await prisma.permission.findUnique({
        where: { name: permissionName }
      });

      if (permission) {
        const existingRolePermission = await prisma.rolePermission.findUnique({
          where: {
            role_permissionId: {
              role: roleData.role,
              permissionId: permission.id
            }
          }
        });

        if (!existingRolePermission) {
          await prisma.rolePermission.create({
            data: {
              role: roleData.role,
              permissionId: permission.id
            }
          });
          console.log(`✅ Assigned permission ${permissionName} to role ${roleData.role}`);
        }
      }
    }
  }

  console.log('🔐 Permission seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });