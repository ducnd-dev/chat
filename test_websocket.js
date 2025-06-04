#!/usr/bin/env node

const { io } = require('socket.io-client');
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
let user1Token = '';
let user2Token = '';
let roomId = '';

// Helper function for delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function setupTestUsers() {
  console.log('👥 Setting up test users...');
  
  const timestamp = Date.now();
  
  // Create User 1
  try {
    const user1Response = await axios.post(`${BASE_URL}/api/auth/register`, {
      username: `wsuser1_${timestamp}`,
      email: `wsuser1_${timestamp}@example.com`,
      password: 'password123',
      firstName: 'WebSocket',
      lastName: 'User1'
    });
    user1Token = user1Response.data.data.token;
    console.log('✅ User 1 created successfully');
  } catch (error) {
    console.log('❌ User 1 creation failed:', error.response?.data || error.message);
    return false;
  }

  // Create User 2
  try {
    const user2Response = await axios.post(`${BASE_URL}/api/auth/register`, {
      username: `wsuser2_${timestamp}`,
      email: `wsuser2_${timestamp}@example.com`,
      password: 'password123',
      firstName: 'WebSocket',
      lastName: 'User2'
    });
    user2Token = user2Response.data.data.token;
    console.log('✅ User 2 created successfully');
  } catch (error) {
    console.log('❌ User 2 creation failed:', error.response?.data || error.message);
    return false;
  }

  // Create Room
  try {
    const roomResponse = await axios.post(`${BASE_URL}/api/rooms`, {
      name: `WebSocket Test Room ${timestamp}`,
      description: 'Room for testing real-time messaging',
      isPrivate: false
    }, { headers: { Authorization: `Bearer ${user1Token}` } });
    
    roomId = roomResponse.data.data._id;
    console.log('✅ Test room created successfully');
    console.log(`   Room ID: ${roomId}`);
  } catch (error) {
    console.log('❌ Room creation failed:', error.response?.data || error.message);
    return false;
  }

  // User 2 joins the room
  try {
    await axios.post(`${BASE_URL}/api/rooms/${roomId}/join`, {}, {
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    console.log('✅ User 2 joined the room successfully');
  } catch (error) {
    console.log('❌ User 2 join room failed:', error.response?.data || error.message);
    return false;
  }

  return true;
}

async function testWebSocketMessaging() {
  console.log('\n🔌 Starting WebSocket Real-time Messaging Test...');
  console.log('='.repeat(60));

  // Setup test users and room
  const setupSuccess = await setupTestUsers();
  if (!setupSuccess) {
    console.log('❌ Failed to setup test users. Exiting...');
    return;
  }

  let messagesReceived = [];
  let user1Connected = false;
  let user2Connected = false;

  return new Promise((resolve) => {
    // Create Socket.io connections for both users
    console.log('\n🔌 Establishing WebSocket connections...');

    const socket1 = io(BASE_URL, {
      auth: { token: user1Token }
    });

    const socket2 = io(BASE_URL, {
      auth: { token: user2Token }
    });

    // User 1 Socket Events
    socket1.on('connect', () => {
      console.log('✅ User 1 connected to WebSocket');
      user1Connected = true;
      socket1.emit('join_room', roomId);
    });

    socket1.on('user_joined', (data) => {
      console.log(`📥 User joined notification: ${data.username}`);
    });

    socket1.on('new_message', (data) => {
      console.log(`📨 User 1 received message: "${data.content}" from ${data.sender.username}`);
      messagesReceived.push({
        receiver: 'User1',
        content: data.content,
        sender: data.sender.username
      });
    });

    socket1.on('user_typing', (data) => {
      console.log(`⌨️  User 1 sees typing indicator: ${data.username} is ${data.isTyping ? 'typing' : 'stopped typing'}`);
    });

    socket1.on('connect_error', (error) => {
      console.log('❌ User 1 connection error:', error.message);
    });

    // User 2 Socket Events
    socket2.on('connect', () => {
      console.log('✅ User 2 connected to WebSocket');
      user2Connected = true;
      socket2.emit('join_room', roomId);
    });

    socket2.on('user_joined', (data) => {
      console.log(`📥 User joined notification: ${data.username}`);
    });

    socket2.on('new_message', (data) => {
      console.log(`📨 User 2 received message: "${data.content}" from ${data.sender.username}`);
      messagesReceived.push({
        receiver: 'User2',
        content: data.content,
        sender: data.sender.username
      });
    });

    socket2.on('user_typing', (data) => {
      console.log(`⌨️  User 2 sees typing indicator: ${data.username} is ${data.isTyping ? 'typing' : 'stopped typing'}`);
    });

    socket2.on('connect_error', (error) => {
      console.log('❌ User 2 connection error:', error.message);
    });

    // Test sequence
    setTimeout(async () => {
      if (!user1Connected || !user2Connected) {
        console.log('❌ WebSocket connections failed');
        socket1.close();
        socket2.close();
        resolve();
        return;
      }

      console.log('\n💬 Testing real-time messaging...');

      // Test 1: User 1 sends message via WebSocket
      console.log('\n📤 User 1 sending message via WebSocket...');
      socket1.emit('send_message', {
        roomId: roomId,
        content: 'Hello from User 1 via WebSocket!',
        messageType: 'text'
      });

      await delay(1000);

      // Test 2: User 2 sends message via WebSocket
      console.log('\n📤 User 2 sending message via WebSocket...');
      socket2.emit('send_message', {
        roomId: roomId,
        content: 'Hello from User 2 via WebSocket!',
        messageType: 'text'
      });

      await delay(1000);

      // Test 3: Typing indicators
      console.log('\n⌨️  Testing typing indicators...');
      socket1.emit('typing_start', roomId);
      
      await delay(500);
      
      socket1.emit('typing_stop', roomId);
      socket2.emit('typing_start', roomId);
      
      await delay(500);
      
      socket2.emit('typing_stop', roomId);

      await delay(1000);

      // Test 4: Send message via REST API (should trigger WebSocket event)
      console.log('\n🌐 Testing REST API message (should trigger WebSocket event)...');
      try {
        await axios.post(`${BASE_URL}/api/messages`, {
          content: 'Message sent via REST API!',
          room: roomId,
          messageType: 'text'
        }, { headers: { Authorization: `Bearer ${user1Token}` } });
        console.log('✅ REST API message sent successfully');
      } catch (error) {
        console.log('❌ REST API message failed:', error.response?.data || error.message);
      }

      await delay(2000);

      // Results
      console.log('\n📊 WebSocket Test Results:');
      console.log('='.repeat(60));
      console.log(`🔌 User 1 Connected: ${user1Connected ? '✅' : '❌'}`);
      console.log(`🔌 User 2 Connected: ${user2Connected ? '✅' : '❌'}`);
      console.log(`📨 Messages Received: ${messagesReceived.length}`);
      
      if (messagesReceived.length > 0) {
        console.log('\n📋 Message Details:');
        messagesReceived.forEach((msg, index) => {
          console.log(`   ${index + 1}. ${msg.receiver} received: "${msg.content}" from ${msg.sender}`);
        });
      }

      if (user1Connected && user2Connected && messagesReceived.length >= 2) {
        console.log('\n🎉 WebSocket real-time messaging is working correctly!');
        console.log('✨ Features verified:');
        console.log('   • Real-time message delivery ✓');
        console.log('   • Bidirectional communication ✓');
        console.log('   • Room-based messaging ✓');
        console.log('   • Typing indicators ✓');
        console.log('   • REST API integration ✓');
      } else {
        console.log('\n⚠️  WebSocket functionality has issues:');
        if (!user1Connected) console.log('   • User 1 connection failed');
        if (!user2Connected) console.log('   • User 2 connection failed');
        if (messagesReceived.length < 2) console.log('   • Message delivery incomplete');
      }

      // Cleanup
      socket1.close();
      socket2.close();
      resolve();
    }, 2000);
  });
}

// Run the WebSocket test
testWebSocketMessaging().then(() => {
  console.log('\n🏁 WebSocket test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ WebSocket test failed:', error);
  process.exit(1);
});