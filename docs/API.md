# API Documentation

## Overview

The Chat System API provides a complete backend solution for real-time messaging applications. It includes user authentication, room management, message handling, and WebSocket support for real-time communication.

**Base URL**: `https://api.yourapp.com` (Production) | `http://localhost:3001` (Development)

**API Version**: 1.0.0

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Auth Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "user_id",
      "username": "johndoe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "default_avatar_url",
      "isOnline": false,
      "lastSeen": "2025-06-04T10:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "user_id",
      "username": "johndoe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "avatar_url",
      "isOnline": true,
      "lastSeen": "2025-06-04T10:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### Get User Profile
```http
GET /api/auth/profile
Authorization: Bearer <jwt_token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "_id": "user_id",
    "username": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "avatar_url",
    "isOnline": true,
    "lastSeen": "2025-06-04T10:00:00.000Z"
  }
}
```

## Room Management

### Room Endpoints

#### Create Room
```http
POST /api/rooms
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "General Chat",
  "description": "A room for general discussions",
  "isPrivate": false
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "Room created successfully",
  "data": {
    "_id": "room_id",
    "name": "General Chat",
    "description": "A room for general discussions",
    "isPrivate": false,
    "owner": {
      "_id": "user_id",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "avatar_url"
    },
    "members": [
      {
        "_id": "user_id",
        "username": "johndoe",
        "firstName": "John",
        "lastName": "Doe",
        "avatar": "avatar_url"
      }
    ],
    "createdAt": "2025-06-04T10:00:00.000Z",
    "updatedAt": "2025-06-04T10:00:00.000Z"
  }
}
```

#### Get User Rooms
```http
GET /api/rooms
Authorization: Bearer <jwt_token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Rooms retrieved successfully",
  "data": [
    {
      "_id": "room_id",
      "name": "General Chat",
      "description": "A room for general discussions",
      "isPrivate": false,
      "owner": {
        "_id": "owner_id",
        "username": "owner_username",
        "firstName": "Owner",
        "lastName": "Name",
        "avatar": "avatar_url"
      },
      "members": [
        {
          "_id": "user_id",
          "username": "member_username",
          "firstName": "Member",
          "lastName": "Name",
          "avatar": "avatar_url"
        }
      ],
      "createdAt": "2025-06-04T10:00:00.000Z",
      "updatedAt": "2025-06-04T10:00:00.000Z"
    }
  ]
}
```

#### Join Room
```http
POST /api/rooms/{roomId}/join
Authorization: Bearer <jwt_token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Joined room successfully",
  "data": {
    "_id": "room_id",
    "name": "General Chat",
    "members": [
      {
        "_id": "user_id",
        "username": "johndoe",
        "firstName": "John",
        "lastName": "Doe",
        "avatar": "avatar_url"
      }
    ]
  }
}
```

#### Leave Room
```http
POST /api/rooms/{roomId}/leave
Authorization: Bearer <jwt_token>
```

#### Search Public Rooms
```http
GET /api/rooms/search?q=general&limit=10&page=1
Authorization: Bearer <jwt_token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Rooms found",
  "data": [
    {
      "_id": "room_id",
      "name": "General Chat",
      "description": "A room for general discussions",
      "isPrivate": false,
      "memberCount": 25,
      "owner": {
        "_id": "owner_id",
        "username": "owner_username"
      }
    }
  ]
}
```

## Message Management

### Message Endpoints

#### Send Message
```http
POST /api/messages
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "content": "Hello everyone!",
  "room": "room_id",
  "messageType": "text"
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "_id": "message_id",
    "content": "Hello everyone!",
    "messageType": "text",
    "sender": {
      "_id": "user_id",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "avatar_url"
    },
    "room": "room_id",
    "createdAt": "2025-06-04T10:00:00.000Z",
    "updatedAt": "2025-06-04T10:00:00.000Z"
  }
}
```

#### Get Room Messages
```http
GET /api/messages/room/{roomId}?page=1&limit=50
Authorization: Bearer <jwt_token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Messages retrieved successfully",
  "data": {
    "messages": [
      {
        "_id": "message_id",
        "content": "Hello everyone!",
        "messageType": "text",
        "sender": {
          "_id": "user_id",
          "username": "johndoe",
          "firstName": "John",
          "lastName": "Doe",
          "avatar": "avatar_url"
        },
        "room": "room_id",
        "createdAt": "2025-06-04T10:00:00.000Z",
        "updatedAt": "2025-06-04T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalMessages": 125,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### Edit Message
```http
PUT /api/messages/{messageId}
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "content": "Updated message content"
}
```

#### Delete Message
```http
DELETE /api/messages/{messageId}
Authorization: Bearer <jwt_token>
```

## WebSocket Events

### Connection
Connect to WebSocket server:
```javascript
const socket = io('ws://localhost:3001', {
  auth: {
    token: 'jwt_token_here'
  }
});
```

### Client Events (Emit)

#### Join Room
```javascript
socket.emit('join_room', { roomId: 'room_id' });
```

#### Leave Room
```javascript
socket.emit('leave_room', { roomId: 'room_id' });
```

#### Send Message
```javascript
socket.emit('send_message', {
  roomId: 'room_id',
  content: 'Hello via WebSocket!',
  messageType: 'text'
});
```

#### Typing Start
```javascript
socket.emit('typing_start', { roomId: 'room_id' });
```

#### Typing Stop
```javascript
socket.emit('typing_stop', { roomId: 'room_id' });
```

### Server Events (Listen)

#### User Joined
```javascript
socket.on('user_joined', (data) => {
  console.log('User joined:', data.user.username);
});
```

#### User Left
```javascript
socket.on('user_left', (data) => {
  console.log('User left:', data.user.username);
});
```

#### New Message
```javascript
socket.on('new_message', (message) => {
  console.log('New message:', message);
});
```

#### Message Edited
```javascript
socket.on('message_edited', (message) => {
  console.log('Message edited:', message);
});
```

#### Message Deleted
```javascript
socket.on('message_deleted', (data) => {
  console.log('Message deleted:', data.messageId);
});
```

#### Typing Indicator
```javascript
socket.on('user_typing', (data) => {
  console.log(`${data.user.username} is typing...`);
});

socket.on('user_stopped_typing', (data) => {
  console.log(`${data.user.username} stopped typing`);
});
```

#### Online Status
```javascript
socket.on('user_online', (data) => {
  console.log(`${data.user.username} is online`);
});

socket.on('user_offline', (data) => {
  console.log(`${data.user.username} is offline`);
});
```

## Error Handling

### HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required or failed
- **403 Forbidden**: Access denied
- **404 Not Found**: Resource not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

## Rate Limiting

### Default Limits

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP
- **Message sending**: 30 messages per minute per user

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1649097600
```

## Pagination

### Query Parameters

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

### Response Format

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

## Data Validation

### User Registration
- `username`: 3-30 characters, alphanumeric and underscore only
- `email`: Valid email format
- `password`: Minimum 6 characters
- `firstName`: 1-50 characters
- `lastName`: 1-50 characters

### Room Creation
- `name`: 1-100 characters
- `description`: Optional, max 500 characters
- `isPrivate`: Boolean

### Message Sending
- `content`: 1-2000 characters
- `messageType`: 'text', 'image', 'file'
- `room`: Valid room ID

## Security Features

### Authentication
- JWT tokens with configurable expiration
- Password hashing using bcrypt
- Secure HTTP headers (Helmet.js)

### Rate Limiting
- IP-based rate limiting
- User-based message rate limiting
- Progressive delays for repeated violations

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration

### Environment Security
- Environment variable configuration
- Secure database connections
- Redis password protection
- RabbitMQ authentication

---

For more detailed information, visit the interactive API documentation at `/api-docs` when running the server.
