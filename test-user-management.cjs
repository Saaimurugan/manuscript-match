const axios = require('axios');

const API_BASE_URL = 'http://localhost:3002';

async function testUserManagement() {
  try {
    console.log('🔍 Testing User Management Features');
    console.log('===================================');
    
    // Step 1: Login as admin
    console.log('\n[1/4] Logging in as admin...');
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
    
    // Step 2: Test getting users list
    console.log('\n[2/4] Testing users list...');
    try {
      const usersResponse = await axios.get(`${API_BASE_URL}/api/admin/users`, { headers });
      console.log('✅ Users list successful');
      console.log(`Found ${usersResponse.data.data.length} users`);
      usersResponse.data.data.forEach(user => {
        console.log(`  - ${user.email} (${user.role})`);
      });
    } catch (error) {
      console.log('❌ Users list failed:', error.response?.data || error.message);
    }
    
    // Step 3: Test inviting a user
    console.log('\n[3/4] Testing user invitation...');
    try {
      const inviteResponse = await axios.post(`${API_BASE_URL}/api/admin/users/invite`, {
        email: 'testinvite@example.com',
        role: 'USER'
      }, { headers });
      console.log('✅ User invitation successful:', inviteResponse.data);
    } catch (error) {
      console.log('❌ User invitation failed:', error.response?.data || error.message);
    }
    
    // Step 4: Test updating a user (get first user and try to update)
    console.log('\n[4/4] Testing user update...');
    try {
      const usersResponse = await axios.get(`${API_BASE_URL}/api/admin/users`, { headers });
      const firstUser = usersResponse.data.data.find(u => u.role === 'USER');
      
      if (firstUser) {
        console.log(`Trying to update user: ${firstUser.email}`);
        const updateResponse = await axios.put(`${API_BASE_URL}/api/admin/users/${firstUser.id}`, {
          role: 'USER' // Keep same role to avoid breaking things
        }, { headers });
        console.log('✅ User update successful:', updateResponse.data);
      } else {
        console.log('⚠️ No USER role found to update');
      }
    } catch (error) {
      console.log('❌ User update failed:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 User management test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUserManagement();