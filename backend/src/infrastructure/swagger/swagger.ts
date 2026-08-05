import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

const router = Router();

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'RagCX Backend API Documentation',
    version: '1.0.0',
    description: 'Enterprise-grade production-ready API documentation for the RagCX Knowledge Base Chatbot.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local Development Server',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'Endpoints for logging in, rotating tokens, and managing active user sessions.',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your access token to authenticate.',
      },
    },
    schemas: {
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'admin@ragcx.com',
          },
          password: {
            type: 'string',
            format: 'password',
            example: 'SecureP@ss1234',
          },
        },
      },
      UserResponse: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '9c5fd893-6c84-489e-b7eb-8ad145d7b7c5',
          },
          email: {
            type: 'string',
            example: 'admin@ragcx.com',
          },
          role: {
            type: 'string',
            example: 'ADMIN',
          },
          permissions: {
            type: 'array',
            items: {
              type: 'string',
            },
            example: ['users:manage', 'documents:delete', 'chat:create'],
          },
        },
      },
      Tokens: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          refreshToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'INVALID_CREDENTIALS',
              },
              message: {
                type: 'string',
                example: 'Invalid email or password',
              },
              details: {
                type: 'object',
                nullable: true,
                example: null,
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate user credentials',
        description: 'Validates user email and password, generates active session audit, and returns token pairs (also set as secure HttpOnly cookies).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LoginInput',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful. Secure HttpOnly cookies set.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: true,
                    },
                    message: {
                      type: 'string',
                      example: 'Login successful',
                    },
                    data: {
                      type: 'object',
                      properties: {
                        user: {
                          $ref: '#/components/schemas/UserResponse',
                        },
                        tokens: {
                          $ref: '#/components/schemas/Tokens',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation failed (e.g. malformed email or short password).',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          401: {
            description: 'Invalid credentials.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh session tokens',
        description: 'Performs Refresh Token Rotation (RTR). Returns a fresh access and refresh token pair.',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: {
                    type: 'string',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Tokens rotated successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: true,
                    },
                    message: {
                      type: 'string',
                      example: 'Token refreshed successfully',
                    },
                    data: {
                      $ref: '#/components/schemas/Tokens',
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Invalid, expired, or already-rotated refresh token.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout user session',
        description: 'Revokes the active user session associated with the provided token and clears HttpOnly cookies.',
        security: [
          {
            bearerAuth: [],
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: {
                    type: 'string',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Logged out successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: true,
                    },
                    message: {
                      type: 'string',
                      example: 'Logout successful',
                    },
                    data: {
                      type: 'object',
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthenticated or invalid access token.',
          },
        },
      },
    },
    '/api/v1/auth/logout-all': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout from all devices',
        description: 'Revokes every active session record belonging to the authenticated user.',
        security: [
          {
            bearerAuth: [],
          },
        ],
        responses: {
          200: {
            description: 'Logged out from all devices.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: true,
                    },
                    message: {
                      type: 'string',
                      example: 'Logout from all devices successful',
                    },
                    data: {
                      type: 'object',
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthenticated.',
          },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user profile',
        description: 'Returns profile properties and permission arrays mapped to the authenticated user context.',
        security: [
          {
            bearerAuth: [],
          },
        ],
        responses: {
          200: {
            description: 'User details resolved.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: true,
                    },
                    message: {
                      type: 'string',
                      example: 'Current user profile retrieved successfully',
                    },
                    data: {
                      $ref: '#/components/schemas/UserResponse',
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthenticated or session invalid.',
          },
        },
      },
    },
  },
};

// Serve Swagger UI assets and spec documentation
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(openApiSpec));

export const swaggerRoutes = router;
export default swaggerRoutes;
