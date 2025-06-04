#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
let authToken = '';
let userId = '';
let roomId = '';

// Test data
const timestamp = Date.now();
const testUser = {
  username: `testuser${timestamp}`,
  email: `test${timestamp}@example.com`,
  password: 'password123',
  firstName: 'Test',
  lastName: 'User'
};

const testRoom = {
  name: 'Test Room',
  description: 'A test room for API testing',
  isPrivate: false
};

const testMessage = {
  content: 'Hello, this is a test message!'
};

// Helper function to make API requests
async function makeRequest(method, endpoint, data = null, useAuth = false) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (useAuth && authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

// Test functions
async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  const result = await makeRequest('GET', '/../health');
  
  if (result.success) {
    console.log('✅ Health check passed:', result.data.message);
  } else {
    console.log('❌ Health check failed:', result.error);
  }
  
  return result.success;
}

async function testUserRegistration() {
  console.log('\n👤 Testing User Registration...');
  const result = await makeRequest('POST', '/auth/register', testUser);
  
  if (result.success) {
    console.log('✅ User registration successful');
    console.log('   User ID:', result.data.data.user._id);
    console.log('   Username:', result.data.data.user.username);
    userId = result.data.data.user._id;
    authToken = result.data.data.token; // Get token from registration
    return true;
  } else {
    console.log('❌ User registration failed:', result.error);
    return false;
  }
}

async function testUserLogin() {
  console.log('\n🔐 Testing User Login...');
  const loginData = {
    email: testUser.email,
    password: testUser.password
  };
  
  const result = await makeRequest('POST', '/auth/login', loginData);
  
  if (result.success) {
    console.log('✅ User login successful');
    console.log('   Token received:', result.data.data.token ? 'Yes' : 'No');
    authToken = result.data.data.token;
    return true;
  } else {
    console.log('❌ User login failed:', result.error);
    return false;
  }
}

async function testRoomCreation() {
  console.log('\n🏠 Testing Room Creation...');
  const result = await makeRequest('POST', '/rooms', testRoom, true);
  
  if (result.success) {
    console.log('✅ Room creation successful');
    console.log('   Room ID:', result.data.data.room._id);
    console.log('   Room Name:', result.data.data.room.name);
    roomId = result.data.data.room._id;
    return true;
  } else {
    console.log('❌ Room creation failed:', result.error);
    return false;
  }
}

async function testGetRooms() {
  console.log('\n📋 Testing Get Rooms...');
  const result = await makeRequest('GET', '/rooms', null, true);
  
  if (result.success) {
    console.log('✅ Get rooms successful');
    console.log('   Rooms count:', result.data.data.rooms.length);
    return true;
  } else {
    console.log('❌ Get rooms failed:', result.error);
    return false;
  }
}

async function testJoinRoom() {
  console.log('\n🚪 Testing Join Room...');
  const result = await makeRequest('POST', `/rooms/${roomId}/join`, {}, true);
  
  if (result.success) {
    console.log('✅ Join room successful');
    return true;
  } else {
    console.log('❌ Join room failed:', result.error);
    return false;
  }
}

async function testSendMessage() {
  console.log('\n💬 Testing Send Message...');
  const messageData = {
    ...testMessage,
    roomId: roomId
  };
  
  const result = await makeRequest('POST', '/messages', messageData, true);
  
  if (result.success) {
    console.log('✅ Send message successful');
    console.log('   Message ID:', result.data.data.message._id);
    return true;
  } else {
    console.log('❌ Send message failed:', result.error);
    return false;
  }
}

async function testGetMessages() {
  console.log('\n📝 Testing Get Messages...');
  const result = await makeRequest('GET', `/messages/${roomId}`, null, true);
  
  if (result.success) {
    console.log('✅ Get messages successful');
    console.log('   Messages count:', result.data.data.messages.length);
    return true;
  } else {
    console.log('❌ Get messages failed:', result.error);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Chat API Tests...');
  console.log('='.repeat(50));
  
  const tests = [
    testHealthCheck,
    testUserRegistration,
    testUserLogin,
    testRoomCreation,
    testGetRooms,
    testJoinRoom,
    testSendMessage,
    testGetMessages
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log('❌ Test error:', error.message);
      failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Chat API is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
}

// Run the tests
runTests().catch(console.error);
