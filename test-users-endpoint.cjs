const axios = require('axios');

const API_BASE_URL = 'http://localhost:3002';

async function testUsersEndpoint() {
  try {
    console.log('🔍 Testing Users Endpoint Specifically');
    console.log('=====================================');
    
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
    
    // Step 2: Test users endpoint with no parameters
    console.log('\n[2/3] Testing users endpoint with no parameters...');
    try {
      const usersResponse = await axios.get(`${API_BASE_URL}/api/admin/users`, { headers });
      console.log('✅ Users endpoint response structure:');
      console.log('Response keys:', Object.keys(usersResponse.data));
      console.log('Success:', usersResponse.data.success);
      console.log('Data type:', typeof usersResponse.data.data);
      console.log('Data is array:', Array.isArray(usersResponse.data.data));
      console.log('Data length:', usersResponse.data.data?.length);
      console.log('Full response:', JSON.stringify(usersResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Users endpoint failed:', error.response?.data || error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Headers:', error.response.headers);
      }
    }
    
    // Step 3: Test users endpoint with parameters (like frontend would send)
    console.log('\n[3/3] Testing users endpoint with parameters...');
    try {
      const params = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };
      
      const usersResponse = await axios.get(`${API_BASE_URL}/api/admin/users`, { 
        headers,
        params 
      });
      console.log('✅ Users endpoint with params response:');
      console.log('Response structure:', {
        success: usersResponse.data.success,
        dataType: typeof usersResponse.data.data,
        dataLength: usersResponse.data.data?.length,
        paginationExists: !!usersResponse.data.pagination
      });
    } catch (error) {
      console.log('❌ Users endpoint with params failed:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 Users endpoint test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUsersEndpoint();