const axios = require('axios');

async function testProfileUpdate() {
  try {
    console.log('🔍 Testing profile update endpoint...');
    
    // First, login to get a token
    console.log('📝 Logging in to get auth token...');
    const loginResponse = await axios.post('http://localhost:3002/api/auth/login', {
      email: 'admin@test.com',
      password: 'adminpassword123'
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, token received');
    
    // Test profile update
    console.log('📤 Testing profile update...');
    const updateResponse = await axios.put('http://localhost:3002/api/user/profile', {
      name: 'Test Admin User',
      phone: '+1-555-123-4567',
      department: 'IT Department',
      bio: 'This is a test bio for the admin user.'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Profile update response:', updateResponse.data);
    console.log('🎉 Profile update test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing profile update:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testProfileUpdate();