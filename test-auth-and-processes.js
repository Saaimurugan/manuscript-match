const axios = require('axios');

const API_BASE_URL = 'http://localhost:3002';

async function testAuthAndProcesses() {
  try {
    console.log('🔍 Testing Authentication and Processes API');
    console.log('===========================================');
    
    // Test 1: Health check
    console.log('\n[1/4] Testing health endpoint...');
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/health`);
      console.log('✅ Health check passed:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      return;
    }
    
    // Test 2: Try to access processes without auth (should fail)
    console.log('\n[2/4] Testing processes endpoint without auth...');
    try {
      const noAuthResponse = await axios.get(`${API_BASE_URL}/api/processes`);
      console.log('⚠️ Unexpected success without auth:', noAuthResponse.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctly rejected without auth (401)');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    // Test 3: Login with test user
    console.log('\n[3/4] Testing login...');
    let authToken = null;
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: 'user@test.com',
        password: 'testpassword123'
      });
      
      if (loginResponse.data && loginResponse.data.success && loginResponse.data.data.token) {
        authToken = loginResponse.data.data.token;
        console.log('✅ Login successful, token received');
      } else {
        console.log('❌ Login failed - invalid response structure:', loginResponse.data);
        return;
      }
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data || error.message);
      return;
    }
    
    // Test 4: Access processes with auth
    console.log('\n[4/4] Testing processes endpoint with auth...');
    try {
      const processesResponse = await axios.get(`${API_BASE_URL}/api/processes`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log('✅ Processes API response:', JSON.stringify(processesResponse.data, null, 2));
      
      if (processesResponse.data && processesResponse.data.success) {
        const processes = processesResponse.data.data;
        console.log(`📊 Found ${processes.length} processes`);
        
        if (processes.length > 0) {
          console.log('📋 First process:', processes[0]);
        }
      }
      
    } catch (error) {
      console.log('❌ Processes API failed:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check if axios is available
try {
  testAuthAndProcesses();
} catch (error) {
  console.log('❌ axios not found. Install it with: npm install axios');
  console.log('Or test manually with curl commands:');
  console.log('curl http://localhost:3002/health');
  console.log('curl http://localhost:3002/api/processes');
}