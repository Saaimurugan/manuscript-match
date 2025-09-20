import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ScholarFinder Backend API',
      version: '1.0.0',
      description: `
        ScholarFinder is a comprehensive manuscript analysis and peer reviewer recommendation system.
        This API provides endpoints for manuscript processing, author validation, database search,
        and reviewer recommendation workflows.
        
        ## Features
        - **Authentication & Authorization**: JWT-based user authentication with role-based access
        - **Manuscript Processing**: Upload and extract metadata from PDF/Word documents
        - **Keyword Enhancement**: AI-powered keyword extraction and MeSH term generation
        - **Database Search**: Multi-database search across PubMed, Elsevier, Wiley, and Taylor & Francis
        - **Author Validation**: Comprehensive conflict of interest and qualification validation
        - **Recommendation Engine**: Advanced filtering and ranking of potential reviewers
        - **Shortlist Management**: Create and export reviewer shortlists in multiple formats
        - **Admin Dashboard**: Administrative oversight and analytics
        - **Performance Monitoring**: Real-time system metrics and health checks
        
        ## Workflow
        1. **Upload Manuscript**: Upload PDF/Word document for analysis
        2. **Extract Metadata**: Automatically extract title, authors, abstract, and keywords
        3. **Enhance Keywords**: Generate additional keywords and MeSH terms
        4. **Search Databases**: Find potential reviewers across academic databases
        5. **Validate Authors**: Check for conflicts of interest and qualifications
        6. **Generate Recommendations**: Apply filters and ranking algorithms
        7. **Create Shortlist**: Select final reviewers and export results
        
        ## Authentication
        Most endpoints require authentication. Include the JWT token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`
      `,
      contact: {
        name: 'ScholarFinder API Support',
        email: 'support@scholarfinder.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.scholarfinder.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Process: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            status: { 
              type: 'string', 
              enum: ['CREATED', 'UPLOADING', 'PROCESSING', 'SEARCHING', 'VALIDATING', 'COMPLETED', 'ERROR'] 
            },
            currentStep: { 
              type: 'string', 
              enum: ['UPLOAD', 'METADATA_EXTRACTION', 'KEYWORD_ENHANCEMENT', 'DATABASE_SEARCH', 'MANUAL_SEARCH', 'VALIDATION', 'RECOMMENDATIONS', 'SHORTLIST', 'EXPORT'] 
            },
            metadata: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        Author: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email', nullable: true },
            publicationCount: { type: 'integer', minimum: 0 },
            clinicalTrials: { type: 'integer', minimum: 0 },
            retractions: { type: 'integer', minimum: 0 },
            researchAreas: { 
              type: 'array', 
              items: { type: 'string' } 
            },
            meshTerms: { 
              type: 'array', 
              items: { type: 'string' } 
            },
            affiliations: {
              type: 'array',
              items: { $ref: '#/components/schemas/Affiliation' }
            }
          }
        },
        Affiliation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            institutionName: { type: 'string' },
            department: { type: 'string', nullable: true },
            address: { type: 'string' },
            country: { type: 'string' }
          }
        },
        ManuscriptMetadata: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            authors: {
              type: 'array',
              items: { $ref: '#/components/schemas/Author' }
            },
            affiliations: {
              type: 'array',
              items: { $ref: '#/components/schemas/Affiliation' }
            },
            abstract: { type: 'string' },
            keywords: {
              type: 'array',
              items: { type: 'string' }
            },
            primaryFocusAreas: {
              type: 'array',
              items: { type: 'string' }
            },
            secondaryFocusAreas: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        ValidationResult: {
          type: 'object',
          properties: {
            author: { $ref: '#/components/schemas/Author' },
            passed: { type: 'boolean' },
            conflicts: {
              type: 'array',
              items: { 
                type: 'string',
                enum: ['manuscript_author', 'co_author', 'institutional', 'recent_collaboration']
              }
            },
            retractionFlags: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  publicationTitle: { type: 'string' },
                  journal: { type: 'string' },
                  retractionDate: { type: 'string', format: 'date' },
                  reason: { type: 'string' }
                }
              }
            },
            publicationMetrics: {
              type: 'object',
              properties: {
                totalPublications: { type: 'integer' },
                recentPublications: { type: 'integer' },
                hIndex: { type: 'integer', nullable: true },
                citationCount: { type: 'integer', nullable: true }
              }
            }
          }
        },
        Shortlist: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            processId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            authors: {
              type: 'array',
              items: { $ref: '#/components/schemas/Author' }
            },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object', nullable: true }
              }
            }
          }
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            checks: {
              type: 'object',
              properties: {
                database: { type: 'string', enum: ['healthy', 'unhealthy'] },
                redis: { type: 'string', enum: ['healthy', 'unhealthy'] },
                external_apis: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] }
              }
            },
            uptime: { type: 'number' },
            version: { type: 'string' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Processes',
        description: 'Manuscript processing workflow management'
      },
      {
        name: 'Manuscript',
        description: 'File upload and metadata extraction'
      },
      {
        name: 'Keywords',
        description: 'Keyword enhancement and MeSH term generation'
      },
      {
        name: 'Search',
        description: 'Database search and manual reviewer search'
      },
      {
        name: 'Validation',
        description: 'Author validation and conflict checking'
      },
      {
        name: 'Recommendations',
        description: 'Reviewer recommendations and filtering'
      },
      {
        name: 'Shortlist',
        description: 'Shortlist creation and export'
      },
      {
        name: 'Admin',
        description: 'Administrative endpoints (Admin only)'
      },
      {
        name: 'Health',
        description: 'System health and monitoring'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts'
  ]
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  // Swagger UI setup
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .info .title { color: #2c3e50 }
    `,
    customSiteTitle: 'ScholarFinder API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'none',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2
    }
  }));

  // JSON endpoint for the OpenAPI spec
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

export default specs;