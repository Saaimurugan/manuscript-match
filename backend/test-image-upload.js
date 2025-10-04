const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testImageUpload() {
  try {
    console.log('🔍 Testing image upload endpoint...');
    
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
    
    // Create a simple test image (1x1 pixel PNG in base64)
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77mgAAAABJRU5ErkJggg==';
    
    console.log('📤 Testing image upload...');
    const uploadResponse = await axios.post('http://localhost:3002/api/user/profile/image', {
      imageData: testImageBase64,
      fileName: 'test-image.png'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Upload response:', uploadResponse.data);
    console.log('🎉 Image upload test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing image upload:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testImageUpload();