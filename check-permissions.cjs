const axios = require('axios');

const API_BASE_URL = 'http://localhost:3002';

async function checkPermissions() {
  try {
    console.log('🔍 Checking Admin Permissions');
    console.log('=============================');
    
    // Step 1: Login as admin
    console.log('\n[1/3] Logging in as admin...');
    let authToken = null;
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: 'admin@test.com',
        password: 'adminpassword123'
      });
      
      if (loginResponse.data && loginResponse.data.success && loginResponse.data.data.token) {
        authToken = loginResponse.data.data.token;
        console.log('✅ Admin login successful');
        
        // Decode token to see user info
        const payload = JSON.parse(Buffer.from(authToken.split('.')[1], 'base64').toString());
        console.log(`   User: ${payload.email}`);
        console.log(`   Role: ${payload.role}`);
        console.log(`   ID: ${payload.userId}`);
      } else {
        console.log('❌ Admin login failed');
        return;
      }
    } catch (error) {
      console.log('❌ Admin login failed:', error.response?.data || error.message);
      return;
    }
    
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };
    
    // Step 2: Check admin permissions endpoint
    console.log('\n[2/3] Checking admin permissions...');
    try {
      const permissionsResponse = await axios.get(`${API_BASE_URL}/api/admin/permissions`, { headers });
      console.log('✅ Admin permissions check successful');
      console.log(`   Has admin access: YES`);
    } catch (error) {
      console.log('❌ Admin permissions check failed:', error.response?.data || error.message);
      if (error.response?.status === 403) {
        console.log('   This indicates a permission issue!');
      }
    }
    
    // Step 3: Test users API with detailed error info
    console.log('\n[3/3] Testing users API...');
    try {
      const usersResponse = await axios.get(`${API_BASE_URL}/api/admin/users`, { headers });
      console.log('✅ Users API successful');
      console.log(`   Found ${usersResponse.data.data.length} users`);
      usersResponse.data.data.forEach(user => {
        console.log(`   - ${user.email} (${user.role})`);
      });
    } catch (error) {
      console.log('❌ Users API failed:', error.response?.data || error.message);
      console.log('   Status:', error.response?.status);
      console.log('   Headers:', error.response?.headers);
      
      if (error.response?.status === 403) {
        console.log('\n🔍 Permission Error Details:');
        console.log('   This means the admin user does not have the "users.read" permission');
        console.log('   Possible causes:');
        console.log('   1. Role permissions not properly seeded');
        console.log('   2. Permission middleware not working correctly');
        console.log('   3. Database schema issue');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

checkPermissions();