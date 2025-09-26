const axios = require('axios');

const API_BASE_URL = 'http://localhost:3002';

async function testAdminFeatures() {
  try {
    console.log('🔍 Testing Admin Features');
    console.log('=========================');
    
    // Step 1: Login as admin
    console.log('\n[1/5] Logging in as admin...');
    let authToken = null;
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: 'admin@test.com',
        password: 'adminpassword123'
      });
      
      if (loginResponse.data && loginResponse.data.success && loginResponse.data.data.token) {
        authToken = loginResponse.data.data.token;
        console.log('✅ Admin login successful');
      } else {
        console.log('❌ Admin login failed - invalid response:', loginResponse.data);
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
    
    // Step 2: Test admin stats
    console.log('\n[2/5] Testing admin stats...');
    try {
      const statsResponse = await axios.get(`${API_BASE_URL}/api/admin/stats`, { headers });
      console.log('✅ Admin stats:', JSON.stringify(statsResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Admin stats failed:', error.response?.data || error.message);
    }
    
    // Step 3: Test user management
    console.log('\n[3/5] Testing user management...');
    try {
      const usersResponse = await axios.get(`${API_BASE_URL}/api/admin/users`, { headers });
      console.log('✅ Users list:', JSON.stringify(usersResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Users list failed:', error.response?.data || error.message);
    }
    
    // Step 4: Test permissions
    console.log('\n[4/5] Testing permissions...');
    try {
      const permissionsResponse = await axios.get(`${API_BASE_URL}/api/admin/permissions`, { headers });
      console.log('✅ Permissions list:', JSON.stringify(permissionsResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Permissions list failed:', error.response?.data || error.message);
    }
    
    // Step 5: Test process management
    console.log('\n[5/5] Testing process management...');
    try {
      const processesResponse = await axios.get(`${API_BASE_URL}/api/admin/processes`, { headers });
      console.log('✅ Admin processes:', JSON.stringify(processesResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Admin processes failed:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 Admin features test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAdminFeatures();