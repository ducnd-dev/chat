import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Chat API',
      version: '1.0.0',
      description: 'A complete chat system backend API with Express.js, TypeScript, MongoDB, Redis, and RabbitMQ',
      contact: {
        name: 'API Support',
        email: 'support@chatapi.com'
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
            },
            username: {
              type: 'string',
              description: 'Username',
            },
            email: {
              type: 'string',
              description: 'Email address',
            },
            firstName: {
              type: 'string',
              description: 'First name',
            },
            lastName: {
              type: 'string',
              description: 'Last name',
            },
            avatar: {
              type: 'string',
              description: 'Avatar URL',
            },
            isOnline: {
              type: 'boolean',
              description: 'Online status',
            },
            lastSeen: {
              type: 'string',
              format: 'date-time',
              description: 'Last seen timestamp',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Room: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Room ID',
            },
            name: {
              type: 'string',
              description: 'Room name',
            },
            description: {
              type: 'string',
              description: 'Room description',
            },
            isPrivate: {
              type: 'boolean',
              description: 'Private room flag',
            },
            owner: {
              $ref: '#/components/schemas/User',
            },
            members: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/User',
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Message: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Message ID',
            },
            content: {
              type: 'string',
              description: 'Message content',
            },
            sender: {
              $ref: '#/components/schemas/User',
            },
            room: {
              type: 'string',
              description: 'Room ID',
            },
            messageType: {
              type: 'string',
              enum: ['text', 'image', 'file'],
            },
            isEdited: {
              type: 'boolean',
            },
            editedAt: {
              type: 'string',
              format: 'date-time',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            message: {
              type: 'string',
            },
            data: {
              type: 'object',
            },
            error: {
              type: 'string',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Chat API Documentation',
  }));
  
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

export default specs;
