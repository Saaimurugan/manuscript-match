"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const joi_1 = __importDefault(require("joi"));
// Load environment variables
dotenv_1.default.config();
// Environment validation schema
const envSchema = joi_1.default.object({
    NODE_ENV: joi_1.default.string()
        .valid('development', 'production', 'test')
        .default('development'),
    PORT: joi_1.default.number().port().default(3001),
    // Database
    DATABASE_URL: joi_1.default.string().required(),
    // JWT
    JWT_SECRET: joi_1.default.string().min(32).required(),
    JWT_EXPIRES_IN: joi_1.default.string().default('24h'),
    // File Upload
    MAX_FILE_SIZE: joi_1.default.number().positive().default(10485760), // 10MB
    ALLOWED_FILE_TYPES: joi_1.default.string().default('application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword'),
    // External APIs
    PUBMED_API_URL: joi_1.default.string().uri().default('https://eutils.ncbi.nlm.nih.gov/entrez/eutils'),
    ELSEVIER_API_URL: joi_1.default.string().uri().default('https://api.elsevier.com'),
    ELSEVIER_API_KEY: joi_1.default.string().optional(),
    WILEY_API_URL: joi_1.default.string().uri().default('https://api.wiley.com'),
    WILEY_API_KEY: joi_1.default.string().optional(),
    TAYLOR_FRANCIS_API_URL: joi_1.default.string().uri().default('https://api.taylorandfrancis.com'),
    TAYLOR_FRANCIS_API_KEY: joi_1.default.string().optional(),
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: joi_1.default.number().positive().default(900000), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: joi_1.default.number().positive().default(100),
    // Logging
    LOG_LEVEL: joi_1.default.string()
        .valid('error', 'warn', 'info', 'debug')
        .default('info'),
    // Redis Cache
    REDIS_HOST: joi_1.default.string().default('localhost'),
    REDIS_PORT: joi_1.default.number().port().default(6379),
    REDIS_PASSWORD: joi_1.default.string().optional(),
    REDIS_DB: joi_1.default.number().min(0).max(15).default(0),
}).unknown();
// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);
if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}
// Export validated configuration
exports.config = {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    database: {
        url: envVars.DATABASE_URL,
    },
    jwt: {
        secret: envVars.JWT_SECRET,
        expiresIn: envVars.JWT_EXPIRES_IN,
    },
    fileUpload: {
        maxSize: envVars.MAX_FILE_SIZE,
        allowedTypes: envVars.ALLOWED_FILE_TYPES.split(','),
    },
    externalApis: {
        pubmed: {
            url: envVars.PUBMED_API_URL,
        },
        elsevier: {
            url: envVars.ELSEVIER_API_URL,
            apiKey: envVars.ELSEVIER_API_KEY,
        },
        wiley: {
            url: envVars.WILEY_API_URL,
            apiKey: envVars.WILEY_API_KEY,
        },
        taylorFrancis: {
            url: envVars.TAYLOR_FRANCIS_API_URL,
            apiKey: envVars.TAYLOR_FRANCIS_API_KEY,
        },
    },
    rateLimit: {
        windowMs: envVars.RATE_LIMIT_WINDOW_MS,
        maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
    },
    logging: {
        level: envVars.LOG_LEVEL,
    },
    redis: {
        host: envVars.REDIS_HOST,
        port: envVars.REDIS_PORT,
        password: envVars.REDIS_PASSWORD,
        db: envVars.REDIS_DB,
    },
};
