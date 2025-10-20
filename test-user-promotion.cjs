const axios = require('axios');

const API_BASE_URL = 'http://localhost:3002';

async function testUserPromotion() {
  try {
    console.log('🔍 Testing User Promotion with Correct UUIDs');
    console.log('===============================================');
    
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
    
    // Step 2: Get users list to verify UUIDs
    console.log('\n[2/3] Getting users list...');
    try {
      const usersResponse = await axios.get(`${API_BASE_URL}/api/admin/users`, { headers });
      console.log('✅ Users list successful');
      console.log(`Found ${usersResponse.data.data.length} users:`);
      usersResponse.data.data.forEach(user => {
        console.log(`  - ${user.email} (${user.role}) - ID: ${user.id}`);
      });
      
      // Step 3: Test promoting a USER to ADMIN
      console.log('\n[3/3] Testing user promotion...');
      const userToPromote = usersResponse.data.data.find(u => u.role === 'USER');
      
      if (userToPromote) {
        console.log(`Trying to promote user: ${userToPromote.email} (ID: ${userToPromote.id})`);
        
        try {
          const promoteResponse = await axios.put(
            `${API_BASE_URL}/api/admin/users/${userToPromote.id}/promote`, 
            {}, 
            { headers }
          );
          console.log('✅ User promotion successful!');
          console.log('Response:', promoteResponse.data);
        } catch (error) {
          console.log('❌ User promotion failed:', error.response?.data || error.message);
        }
      } else {
        console.log('⚠️ No USER role found to promote');
      }
      
    } catch (error) {
      console.log('❌ Users list failed:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 User promotion test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUserPromotion();