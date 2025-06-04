# Chat System Backend API

A complete chat system backend API built with Express.js, TypeScript, MongoDB, Redis, and RabbitMQ.

## 🚀 Features

- **User Management**: Register, login (JWT-based), user profile, search users by name
- **Chat Rooms**: Create room, join room, list users in room, leave room
- **Messaging**: Send message to room, get message history (paginated), delete/edit message
- **Real-time**: Redis Pub/Sub integration for broadcasting messages
- **Message Queue**: RabbitMQ integration for async message processing
- **API Documentation**: Swagger/OpenAPI 3.0 documentation
- **Type Safety**: Full TypeScript implementation with proper types/interfaces
- **Security**: Helmet, CORS, rate limiting, JWT authentication
- **Clean Architecture**: Controllers, services, routes, middleware separation

## 🛠 Technology Stack

- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Redis Pub/Sub for message broadcasting
- **Queue**: RabbitMQ for async message processing
- **Authentication**: JWT-based authentication
- **Documentation**: Swagger (OpenAPI 3.0)
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate limiting

## 📁 Project Structure

```
src/
├── config/          # Database, Redis, RabbitMQ, Swagger configuration
├── controllers/     # Route controllers
├── middleware/      # Authentication, validation, error handling
├── models/          # Mongoose schemas and models
├── routes/          # Express route definitions
├── services/        # Business logic layer
├── types/           # TypeScript type definitions
├── utils/           # Utility functions and helpers
├── validators/      # Request validation schemas
└── server.ts        # Main application entry point
```

## 🐳 Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- Git

### 1. Clone and Setup
```bash
git clone <repository-url>
cd chat-backend-api
```

### 2. Start All Services
```bash
# Start all services (MongoDB, Redis, RabbitMQ, and API)
docker-compose up -d

# View logs
docker-compose logs -f app
```

### 3. Seed Database (Optional)
```bash
# Seed with sample data
docker-compose exec app npm run seed
```

### 4. Access Services
- **API Server**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health
- **MongoDB Admin**: http://localhost:8081 (admin/admin123)
- **Redis Admin**: http://localhost:8082
- **RabbitMQ Management**: http://localhost:15672 (admin/password123)

## 💻 Local Development

### Prerequisites
- Node.js 18+ and npm
- MongoDB running locally
- Redis running locally
- RabbitMQ running locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
# Copy environment file
cp .env.example .env

# Edit .env with your local settings
# MongoDB URI, JWT secret, Redis/RabbitMQ credentials
```

### 3. Start Development Server
```bash
# Start in development mode with hot reload
npm run dev

# Or build and start production
npm run build
npm start
```

### 4. Seed Database (Optional)
```bash
npm run seed
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `GET /api/auth/users/search` - Search users

### Rooms
- `POST /api/rooms` - Create new room
- `GET /api/rooms` - Get user's rooms
- `GET /api/rooms/search` - Search public rooms
- `GET /api/rooms/:roomId` - Get room details
- `PUT /api/rooms/:roomId` - Update room (owner only)
- `DELETE /api/rooms/:roomId` - Delete room (owner only)
- `POST /api/rooms/:roomId/join` - Join room
- `POST /api/rooms/:roomId/leave` - Leave room
- `GET /api/rooms/:roomId/members` - Get room members

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/room/:roomId` - Get room messages (paginated)
- `GET /api/messages/:messageId` - Get message details
- `PUT /api/messages/:messageId` - Edit message (sender only)
- `DELETE /api/messages/:messageId` - Delete message (sender only)

## 📚 API Documentation

Detailed API documentation is available via Swagger UI:
- **Local**: http://localhost:3000/api-docs
- **JSON Spec**: http://localhost:3000/api-docs.json

## 🔐 Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt-token>
```

Sample login credentials (after seeding):
- `john@example.com` / `password123`
- `jane@example.com` / `password123`
- `bob@example.com` / `password123`
- `alice@example.com` / `password123`

## 🔧 Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/chatdb

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_USER=guest
RABBITMQ_PASS=guest

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🐛 Health Checks

Monitor service health:
```bash
# API Health
curl http://localhost:3000/health

# Docker services health
docker-compose ps
```

## 📊 Monitoring & Management

### MongoDB
- **Mongo Express**: http://localhost:8081
- Credentials: admin/admin123

### Redis
- **Redis Commander**: http://localhost:8082
- Connection: Automatic

### RabbitMQ
- **Management UI**: http://localhost:15672
- Credentials: admin/password123

## 🔄 Message Processing

### Redis Pub/Sub
- Real-time message broadcasting to room channels
- Channel format: `room:{roomId}`
- Message types: `new_message`, `message_edited`, `message_deleted`

### RabbitMQ Queues
- `message_processing` - Process sent messages
- `user_notifications` - Handle user notifications
- `room_activities` - Log room activities
- `message_logging` - Archive messages

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Test API endpoints
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'
```

## 🚦 Production Deployment

### Docker Production
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d

# Scale API instances
docker-compose up --scale app=3
```

### Environment Considerations
- Use strong JWT secrets
- Enable MongoDB authentication
- Configure Redis password
- Set up proper network security
- Use environment-specific configurations
- Set up monitoring and logging
- Configure backups for data persistence

## 🛡 Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: express-validator schemas
- **Error Handling**: Centralized error management

## 📝 Development Notes

- TypeScript strict mode enabled
- Clean architecture with separation of concerns
- Comprehensive error handling and validation
- Docker multi-stage builds for optimization
- Health checks for all services
- Graceful shutdown handling
- Redis Pub/Sub for real-time features
- RabbitMQ for reliable message processing

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## 📄 License

This project is licensed under the MIT License.

---

**Happy Coding! 🎉**
