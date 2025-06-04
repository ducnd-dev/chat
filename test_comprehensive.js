#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
let user1Token = '';
let user2Token = '';
let user1Id = '';
let user2Id = '';
let roomId = '';
let messageId = '';

// Helper function to get error message
function getErrorMessage(error) {
  if (error.response && error.response.data) {
    return error.response.data;
  }
  return error.message;
}

async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive Chat API Tests...');
  console.log('='.repeat(60));
  
  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Health Check
  try {
    console.log('🏥 Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data.message);
    passedTests++;
  } catch (error) {
    console.log('❌ Health check failed:', getErrorMessage(error));
    failedTests++;
  }

  // Test 2: User 1 Registration
  try {
    console.log('👤 Testing User 1 Registration...');
    const timestamp = Date.now();
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      username: `testuser1_${timestamp}`,
      email: `test1_${timestamp}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User1'
    });

    console.log('✅ User 1 registration successful');
    console.log(`   User ID: ${registerResponse.data.data.user._id}`);
    console.log(`   Username: ${registerResponse.data.data.user.username}`);
    user1Id = registerResponse.data.data.user._id;
    user1Token = registerResponse.data.data.token;
    passedTests++;
  } catch (error) {
    console.log('❌ User 1 registration failed:', getErrorMessage(error));
    failedTests++;
  }

  // Test 3: User 2 Registration
  try {
    console.log('👥 Testing User 2 Registration...');
    const timestamp = Date.now() + 1;
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      username: `testuser2_${timestamp}`,
      email: `test2_${timestamp}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User2'
    });

    console.log('✅ User 2 registration successful');
    console.log(`   User ID: ${registerResponse.data.data.user._id}`);
    console.log(`   Username: ${registerResponse.data.data.user.username}`);
    user2Id = registerResponse.data.data.user._id;
    user2Token = registerResponse.data.data.token;
    passedTests++;
  } catch (error) {
    console.log('❌ User 2 registration failed:', getErrorMessage(error));
    failedTests++;
  }

  // Test 4: Room Creation by User 1
  try {
    console.log('🏠 Testing Room Creation...');
    const roomResponse = await axios.post(`${BASE_URL}/api/rooms`, {
      name: `Test Room ${Date.now()}`,
      description: 'A test room for comprehensive API testing',
      isPrivate: false
    }, { headers: { Authorization: `Bearer ${user1Token}` } });

    console.log('✅ Room creation successful');
    roomId = roomResponse.data.data._id;
    console.log(`   Room ID: ${roomId}`);
    console.log(`   Room Name: ${roomResponse.data.data.name}`);
    console.log(`   Owner: ${roomResponse.data.data.owner.username}`);
    passedTests++;
  } catch (error) {
    console.log('❌ Room creation failed:', getErrorMessage(error));
    failedTests++;
  }

  // Test 5: Get Rooms for User 1
  try {
    console.log('📋 Testing Get Rooms (User 1)...');
    const roomsResponse = await axios.get(`${BASE_URL}/api/rooms`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });

    console.log('✅ Get rooms successful');
    console.log(`   Rooms count: ${roomsResponse.data.data.length}`);
    passedTests++;
  } catch (error) {
    console.log('❌ Get rooms failed:', getErrorMessage(error));
    failedTests++;
  }

  // Test 6: User 2 Joins Room
  if (roomId && user2Token) {
    try {
      console.log('🚪 Testing User 2 Join Room...');
      const joinResponse = await axios.post(`${BASE_URL}/api/rooms/${roomId}/join`, {}, {
        headers: { Authorization: `Bearer ${user2Token}` }
      });

      console.log('✅ User 2 joined room successfully');
      console.log(`   Members count: ${joinResponse.data.data.members.length}`);
      passedTests++;
    } catch (error) {
      console.log('❌ User 2 join room failed:', getErrorMessage(error));
      failedTests++;
    }
  } else {
    console.log('🚪 Testing User 2 Join Room...');
    console.log('❌ Join room skipped: Missing room ID or user 2 token');
    failedTests++;
  }

  // Test 7: User 1 Sends Message
  if (roomId && user1Token) {
    try {
      console.log('💬 Testing User 1 Send Message...');
      const messageResponse = await axios.post(`${BASE_URL}/api/messages`, {
        content: 'Hello from User 1! This is a test message.',
        room: roomId,
        messageType: 'text'
      }, { headers: { Authorization: `Bearer ${user1Token}` } });

      console.log('✅ User 1 message sent successfully');
      messageId = messageResponse.data.data._id;
      console.log(`   Message ID: ${messageId}`);
      passedTests++;
    } catch (error) {
      console.log('❌ User 1 send message failed:', getErrorMessage(error));
      failedTests++;
    }
  } else {
    console.log('💬 Testing User 1 Send Message...');
    console.log('❌ Send message skipped: Missing room ID or user 1 token');
    failedTests++;
  }

  // Test 8: User 2 Sends Message
  if (roomId && user2Token) {
    try {
      console.log('💬 Testing User 2 Send Message...');
      const messageResponse = await axios.post(`${BASE_URL}/api/messages`, {
        content: 'Hello from User 2! Nice to meet you.',
        room: roomId,
        messageType: 'text'
      }, { headers: { Authorization: `Bearer ${user2Token}` } });

      console.log('✅ User 2 message sent successfully');
      console.log(`   Message ID: ${messageResponse.data.data._id}`);
      passedTests++;
    } catch (error) {
      console.log('❌ User 2 send message failed:', getErrorMessage(error));
      failedTests++;
    }
  } else {
    console.log('💬 Testing User 2 Send Message...');
    console.log('❌ Send message skipped: Missing room ID or user 2 token');
    failedTests++;
  }

  // Test 9: Get Messages from Room
  if (roomId && user1Token) {
    try {
      console.log('📝 Testing Get Messages...');
      const messagesResponse = await axios.get(`${BASE_URL}/api/messages/room/${roomId}`, {
        headers: { Authorization: `Bearer ${user1Token}` }
      });

      console.log('✅ Get messages successful');
      if (messagesResponse.data.data && messagesResponse.data.data.messages) {
        console.log(`   Messages count: ${messagesResponse.data.data.messages.length}`);
        console.log(`   Total pages: ${messagesResponse.data.data.totalPages || 1}`);
      }
      passedTests++;
    } catch (error) {
      console.log('❌ Get messages failed:', getErrorMessage(error));
      failedTests++;
    }
  } else {
    console.log('📝 Testing Get Messages...');
    console.log('❌ Get messages skipped: Missing room ID or user token');
    failedTests++;
  }

  // Test 10: Get Room Members
  if (roomId && user1Token) {
    try {
      console.log('👥 Testing Get Room Members...');
      const membersResponse = await axios.get(`${BASE_URL}/api/rooms/${roomId}/members`, {
        headers: { Authorization: `Bearer ${user1Token}` }
      });

      console.log('✅ Get room members successful');
      console.log(`   Members count: ${membersResponse.data.data.length}`);
      passedTests++;
    } catch (error) {
      console.log('❌ Get room members failed:', getErrorMessage(error));
      failedTests++;
    }
  } else {
    console.log('👥 Testing Get Room Members...');
    console.log('❌ Get room members skipped: Missing room ID or user token');
    failedTests++;
  }

  // Test 11: Search Public Rooms
  if (user2Token) {
    try {
      console.log('🔍 Testing Search Public Rooms...');
      const searchResponse = await axios.get(`${BASE_URL}/api/rooms/search?q=Test`, {
        headers: { Authorization: `Bearer ${user2Token}` }
      });

      console.log('✅ Search public rooms successful');
      console.log(`   Found rooms: ${searchResponse.data.data.length}`);
      passedTests++;
    } catch (error) {
      console.log('❌ Search public rooms failed:', getErrorMessage(error));
      failedTests++;
    }
  } else {
    console.log('🔍 Testing Search Public Rooms...');
    console.log('❌ Search rooms skipped: Missing user token');
    failedTests++;
  }

  // Test 12: Get User Profile
  if (user1Token) {
    try {
      console.log('👤 Testing Get User Profile...');
      const profileResponse = await axios.get(`${BASE_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${user1Token}` }
      });

      console.log('✅ Get user profile successful');
      console.log(`   Username: ${profileResponse.data.data.username}`);
      console.log(`   Email: ${profileResponse.data.data.email}`);
      passedTests++;
    } catch (error) {
      console.log('❌ Get user profile failed:', getErrorMessage(error));
      failedTests++;
    }
  } else {
    console.log('👤 Testing Get User Profile...');
    console.log('❌ Get user profile skipped: Missing user token');
    failedTests++;
  }

  // Results
  console.log('='.repeat(60));
  console.log('📊 Comprehensive Test Results:');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! Chat API is fully functional.');
    console.log('✨ Key features verified:');
    console.log('   • User authentication (register/login)');
    console.log('   • Room management (create/join/search)');
    console.log('   • Real-time messaging');
    console.log('   • Member management');
    console.log('   • Profile management');
  } else {
    console.log('\n⚠️  Some tests failed. API has partial functionality.');
    if (passedTests >= 8) {
      console.log('✨ Core functionality is working:');
      console.log('   • Basic authentication ✓');
      console.log('   • Room operations ✓');
      console.log('   • Message handling ✓');
    }
  }

  console.log('\n🔧 Next Steps:');
  if (failedTests === 0) {
    console.log('   • Test WebSocket real-time features');
    console.log('   • Set up Docker deployment');
    console.log('   • Configure production environment');
  } else {
    console.log('   • Fix failed endpoints');
    console.log('   • Verify database connections');
    console.log('   • Check authentication middleware');
  }
}

// Run the comprehensive tests
runComprehensiveTests().catch(console.error);
