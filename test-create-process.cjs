const axios = require('axios');

const API_BASE_URL = 'http://localhost:3002';

async function testCreateProcess() {
  try {
    console.log('🔍 Testing Process Creation Flow');
    console.log('================================');
    
    // Step 1: Login to get auth token
    console.log('\n[1/3] Logging in...');
    let authToken = null;
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: 'user@test.com',
        password: 'testpassword123'
      });
      
      if (loginResponse.data && loginResponse.data.success && loginResponse.data.data.token) {
        authToken = loginResponse.data.data.token;
        console.log('✅ Login successful');
      } else {
        console.log('❌ Login failed - invalid response:', loginResponse.data);
        return;
      }
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data || error.message);
      return;
    }
    
    // Step 2: Create a test process
    console.log('\n[2/3] Creating test process...');
    try {
      const createResponse = await axios.post(`${API_BASE_URL}/api/processes`, {
        title: 'Test Process from API',
        description: 'This is a test process created via API'
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Process creation response:', JSON.stringify(createResponse.data, null, 2));
      
      if (createResponse.data && createResponse.data.success && createResponse.data.data) {
        const process = createResponse.data.data;
        console.log(`📋 Created process: ${process.title} (ID: ${process.id})`);
      } else {
        console.log('❌ Invalid response structure');
      }
      
    } catch (error) {
      console.log('❌ Process creation failed:', error.response?.data || error.message);
      if (error.response?.data) {
        console.log('Full error response:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Step 3: List processes to verify
    console.log('\n[3/3] Listing processes...');
    try {
      const listResponse = await axios.get(`${API_BASE_URL}/api/processes`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log('✅ Process list response:', JSON.stringify(listResponse.data, null, 2));
      
    } catch (error) {
      console.log('❌ Process listing failed:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check if axios is available
try {
  testCreateProcess();
} catch (error) {
  console.log('❌ axios not found. Install it with: npm install axios');
}