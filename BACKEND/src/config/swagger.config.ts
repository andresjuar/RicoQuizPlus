import { Options } from 'swagger-jsdoc';
import { env } from './env.config';

const swaggerConfig: Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API proyecto final Andres y Adan',
            version: '0.0.1',
            description: 'Rico quiz plus',
        },
        servers: [
            {
                url: env.appBaseUrl,
            },
        ],
        components: {
            schemas: {
                Error: {
                    type: 'object',
                    description: 'Formato único de error de la API (lo genera errorMiddleware)',
                    required: ['message'],
                    properties: {
                        message: { type: 'string', example: 'Quiz no encontrado' },
                        errores: {
                            type: 'array',
                            description: 'Solo en errores de validación (400)',
                            items: { type: 'string' },
                            example: ['El título debe tener al menos 3 caracteres'],
                        },
                    },
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        token: { type: 'string', example: 'eyJhbGciOi...' },
                        user: { $ref: '#/components/schemas/Usuario' },
                    },
                },
                QuizSummary: {
                    type: 'object',
                    description: 'Quiz en listados (sin preguntas, para no exponer respuestas)',
                    properties: {
                        _id: { type: 'string' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        coverImageUrl: { type: 'string' },
                        topic: { type: 'string' },
                        tags: { type: 'array', items: { type: 'string' } },
                        isPublic: { type: 'boolean' },
                        timesPlayed: { type: 'integer' },
                        questionCount: { type: 'integer', example: 10 },
                        totalSeconds: { type: 'integer', example: 200 },
                        owner: {
                            type: 'object',
                            properties: { _id: { type: 'string' }, displayName: { type: 'string' } },
                        },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                QuizPage: {
                    type: 'object',
                    properties: {
                        data: { type: 'array', items: { $ref: '#/components/schemas/QuizSummary' } },
                        total: { type: 'integer', example: 42 },
                        page: { type: 'integer', example: 1 },
                        limit: { type: 'integer', example: 12 },
                        totalPages: { type: 'integer', example: 4 },
                    },
                },
                Usuario: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            example: '64f1a2b3c4d5e6f7a8b9c0d1',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'usuario@ejemplo.com',
                        },
                        displayName: {
                            type: 'string',
                            minLength: 2,
                            maxLength: 50,
                            example: 'Andres',
                        },
                        avatarUrl: {
                            type: 'string',
                            example: '',
                        },
                        isActive: {
                            type: 'boolean',
                            default: false,
                        },
                        authProvider: {
                            type: 'string',
                            enum: ['local', 'google'],
                            default: 'local',
                        },
                        createdQuizzes: {
                            type: 'array',
                            items: {
                                type: 'string',
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
                Question: {
                    type: 'object',
                    required: ['question', 'options', 'correctIndex'],
                    properties: {
                        question: {
                            type: 'string',
                            example: '¿Cuál es la capital de Francia?',
                        },
                        imageUrl: {
                            type: 'string',
                            example: '',
                        },
                        options: {
                            type: 'array',
                            minItems: 2,
                            items: {
                                type: 'string',
                            },
                            example: ['Madrid', 'París', 'Roma', 'Berlín'],
                        },
                        correctIndex: {
                            type: 'integer',
                            minimum: 0,
                            example: 1,
                        },
                        timeLimitSeconds: {
                            type: 'integer',
                            minimum: 5,
                            maximum: 120,
                            default: 20,
                        },
                    },
                },
                Quiz: {
                    type: 'object',
                    required: ['title', 'owner', 'questions'],
                    properties: {
                        _id: {
                            type: 'string',
                            example: '64f1a2b3c4d5e6f7a8b9c0d1',
                        },
                        title: {
                            type: 'string',
                            minLength: 3,
                            maxLength: 100,
                            example: 'Trivia de Geografía',
                        },
                        description: {
                            type: 'string',
                            maxLength: 500,
                            example: '',
                        },
                        coverImageUrl: {
                            type: 'string',
                            example: '',
                        },
                        owner: {
                            type: 'string',
                            example: '64f1a2b3c4d5e6f7a8b9c0d1',
                        },
                        topic: {
                            type: 'string',
                            example: '',
                        },
                        generatedByAI: {
                            type: 'boolean',
                            default: false,
                        },
                        isPublic: {
                            type: 'boolean',
                            default: false,
                        },
                        tags: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                        },
                        timesPlayed: {
                            type: 'integer',
                            minimum: 0,
                            default: 0,
                        },
                        questions: {
                            type: 'array',
                            minItems: 1,
                            items: {
                                $ref: '#/components/schemas/Question',
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
                Player: {
                    type: 'object',
                    properties: {
                        user: {
                            type: 'string',
                            nullable: true,
                            example: '64f1a2b3c4d5e6f7a8b9c0d1',
                        },
                        guestName: {
                            type: 'string',
                            nullable: true,
                            example: 'Invitado123',
                        },
                        score: {
                            type: 'integer',
                            minimum: 0,
                            default: 0,
                        },
                        correctAnswers: {
                            type: 'integer',
                            minimum: 0,
                            default: 0,
                        },
                    },
                },
                Match: {
                    type: 'object',
                    required: ['host', 'roomCode'],
                    properties: {
                        _id: {
                            type: 'string',
                            example: '64f1a2b3c4d5e6f7a8b9c0d1',
                        },
                        quiz: {
                            type: 'string',
                            nullable: true,
                            example: '64f1a2b3c4d5e6f7a8b9c0d1',
                        },
                        host: {
                            type: 'string',
                            example: '64f1a2b3c4d5e6f7a8b9c0d1',
                        },
                        roomCode: {
                            type: 'string',
                            example: 'ABC123',
                        },
                        status: {
                            type: 'string',
                            enum: ['waiting', 'in_progress', 'finished', 'cancelled'],
                            default: 'waiting',
                        },
                        startedAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                        },
                        finishedAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                        },
                        players: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/Player',
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
            },
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ['./src/routes/**/*.ts'],
};

export default swaggerConfig;
