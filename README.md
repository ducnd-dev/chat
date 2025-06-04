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

- **Interactive Swagger UI**: http://localhost:3001/api-docs
- **Detailed API Guide**: [docs/API.md](docs/API.md)
- **Performance Benchmarks**: [docs/PERFORMANCE.md](docs/PERFORMANCE.md)
- **Health Check Endpoint**: http://localhost:3001/health

### Key API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication  
- `GET /api/auth/profile` - Get user profile
- `POST /api/rooms` - Create chat room
- `GET /api/rooms` - Get user's rooms
- `POST /api/rooms/:id/join` - Join room
- `POST /api/messages` - Send message
- `GET /api/messages/room/:id` - Get room messages

### WebSocket Events
- `join_room` - Join a chat room
- `send_message` - Send real-time message
- `new_message` - Receive new messages
- `typing_start/stop` - Typing indicators
- `user_joined/left` - Room activity notifications

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

## 🔐 SSL/TLS Configuration

### Automated SSL Setup
```bash
# Generate self-signed certificates for development
npm run ssl:setup

# Generate for specific domain
npm run ssl:setup -- --domain api.example.com
```

### Production SSL (Let's Encrypt)
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## 💾 Database Backup & Recovery

### Automated Backup System
```bash
# Create manual backup
npm run backup:create

# Create scheduled backup
npm run backup:create daily

# List all backups
npm run backup:list

# Restore from backup
npm run backup:restore ./backups/chatdb-manual-2025-06-04.gz

# Cleanup old backups
npm run backup:cleanup

# Start automated backup scheduler
npm run backup:schedule

# Check backup system status
node scripts/backup.js status

# Verify backup integrity
node scripts/backup.js verify ./backups/chatdb-manual-2025-06-04.gz
```

### Backup Schedule
- **Daily**: 2 AM automatically
- **Retention**: 7 days by default
- **Location**: `./backups/` directory
- **Format**: Compressed MongoDB archives (.gz)

## 📊 Advanced Monitoring & Alerting

### Real-time Monitoring
```bash
# Start advanced monitoring system
npm run monitor

# Start dashboard (alternative)
npm run monitor:dashboard

# Custom interval monitoring
node scripts/monitoring.js --interval 60000
```

### Alert Configuration
```bash
# Email alerts (set environment variables)
export EMAIL_ALERTS=true
export SMTP_HOST=smtp.gmail.com
export SMTP_USER=your-email@gmail.com
export SMTP_PASS=your-app-password
export ALERT_TO_EMAIL=admin@yourcompany.com

# Webhook alerts
export WEBHOOK_ALERTS=true
export WEBHOOK_URL=https://hooks.slack.com/services/...
export WEBHOOK_SECRET=your-secret

# Start monitoring with alerts
npm run monitor
```

### Monitoring Features
- **Real-time Dashboard**: Live service status and metrics
- **Email Alerts**: Critical service failures and warnings
- **Webhook Integration**: Slack/Discord/Teams notifications
- **Metrics Persistence**: Historical data storage
- **Alert Cooldown**: Prevents spam notifications
- **System Metrics**: Memory, CPU, response times
- **Service Health**: Endpoint availability monitoring

## 🚀 CI/CD Pipeline

### GitHub Actions
The project includes a comprehensive CI/CD pipeline with:

- **Code Quality**: ESLint, Prettier, TypeScript checking
- **Security**: Vulnerability scanning, license checking
- **Testing**: Unit tests, integration tests, health checks
- **Docker**: Multi-stage builds, security scanning
- **Performance**: Load testing with k6
- **Deployment**: Automated staging and production deployment

### Pipeline Stages
1. **Quality**: Lint, format, type-check, security audit
2. **Test**: Comprehensive API and WebSocket testing
3. **Docker**: Build and security scan
4. **Performance**: Load testing (main branch only)
5. **Deploy**: Staging (develop) and Production (main)
6. **Notify**: Success/failure notifications

### Setup GitHub Actions
1. Create repository secrets:
   ```
   CODECOV_TOKEN
   SMTP_HOST, SMTP_USER, SMTP_PASS
   WEBHOOK_URL, WEBHOOK_SECRET
   ```

2. Configure environments:
   - `staging` environment for develop branch
   - `production` environment for main branch

## ☸️ Kubernetes Deployment

### Prerequisites
```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Install helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install cert-manager for SSL
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### Deploy to Kubernetes
```bash
# Create namespace and deploy
kubectl apply -f k8s/production.yaml

# Check deployment status
kubectl get pods -n chat-api
kubectl get services -n chat-api
kubectl get ingress -n chat-api

# Scale deployment
kubectl scale deployment chat-api --replicas=5 -n chat-api

# View logs
kubectl logs -f deployment/chat-api -n chat-api

# Port forward for testing
kubectl port-forward service/chat-api-service 8080:80 -n chat-api
```

### Update Secrets
```bash
# Update MongoDB URI
kubectl create secret generic chat-api-secrets \
  --from-literal=mongodb-uri="mongodb://admin:password@mongo-service:27017/chatdb?authSource=admin" \
  --namespace=chat-api --dry-run=client -o yaml | kubectl apply -f -

# Update JWT secret
kubectl patch secret chat-api-secrets -n chat-api \
  -p='{"data":{"jwt-secret":"'$(echo -n "your-new-jwt-secret" | base64 -w 0)'"}}'
```

### Monitoring in Kubernetes
```bash
# Install Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install monitoring prometheus-community/kube-prometheus-stack -n monitoring --create-namespace

# Access Grafana
kubectl port-forward service/monitoring-grafana 3000:80 -n monitoring
# Default: admin/prom-operator

# Access Prometheus
kubectl port-forward service/monitoring-kube-prometheus-prometheus 9090:9090 -n monitoring
```

## 🔧 Code Quality & Standards

### Linting and Formatting
```bash
# Run ESLint
npm run lint

# Format code with Prettier
npm run format

# Check formatting
npm run format:check

# Type checking
npm run type-check

# Generate test coverage
npm run coverage
```

### Pre-commit Hooks (Recommended)
```bash
# Install husky
npm install --save-dev husky

# Setup pre-commit hooks
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run format:check && npm run type-check"
npx husky add .husky/pre-push "npm run test:api"
```

## 📈 Performance Optimization

### Production Optimizations
- **Cluster Mode**: Multi-process deployment
- **Connection Pooling**: MongoDB and Redis optimization
- **Caching**: Redis-based response caching
- **Rate Limiting**: API protection
- **Compression**: Gzip response compression
- **CDN Ready**: Static asset optimization

### Scaling Strategies
1. **Horizontal Scaling**: Multiple API instances
2. **Database Scaling**: MongoDB replica sets
3. **Cache Scaling**: Redis clustering
4. **Load Balancing**: Nginx/Kubernetes ingress
5. **Auto-scaling**: HPA based on CPU/memory

## 🛡️ Security Best Practices

### Implemented Security Features
- **Helmet**: Security headers
- **Rate Limiting**: API protection
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Request sanitization
- **CORS**: Cross-origin resource sharing
- **SSL/TLS**: Encrypted communication
- **Environment Variables**: Secret management

### Security Checklist
- [ ] Change default passwords
- [ ] Use strong JWT secrets
- [ ] Enable SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up VPN access
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Backup encryption

## 🚦 Production Deployment

### Automated Deployment
```bash
# Full production deployment with health checks
node scripts/deploy.js deploy

# Stop all services
node scripts/deploy.js stop

# Run health check only
node scripts/deploy.js health
```

### Docker Production
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d

# Scale API instances
docker-compose -f docker-compose.prod.yml up --scale app=3 -d

# Monitor with Prometheus and Grafana
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin123)
```

### Manual Production Setup
```bash
# Build for production
npm run build

# Copy production environment
cp .env.production .env

# Start production server
npm start
```

### Environment Considerations
- Use strong JWT secrets in production
- Enable MongoDB authentication
- Configure Redis password protection
- Set up proper network security groups
- Use environment-specific configurations
- Set up monitoring and logging systems
- Configure automated backups for data persistence
- Implement SSL/TLS certificates
- Set up log rotation and monitoring

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
