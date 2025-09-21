"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const environment_1 = require("./src/config/environment");
const app = (0, express_1.default)();
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    }
});
// Basic middleware
app.use((0, cors_1.default)({
    origin: ['http://localhost:8080', 'http://localhost:8082', 'http://localhost:3000'],
    credentials: true
}));
app.use(express_1.default.json());
// Simple auth middleware (just logs the token, doesn't validate)
app.use('/api', (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        console.log('🔐 Auth header received:', authHeader.substring(0, 20) + '...');
    }
    next();
});
// Simple health check
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        message: 'Backend server is running',
        port: environment_1.config.port,
        timestamp: new Date().toISOString()
    });
});
// Simple API endpoint
app.get('/api/test', (_req, res) => {
    res.json({ message: 'API is working!' });
});
// Mock authentication endpoints
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: {
                type: 'VALIDATION_ERROR',
                message: 'Email and password are required'
            }
        });
    }
    // Mock successful login
    return res.json({
        success: true,
        data: {
            user: {
                id: 'user-123',
                email: email,
                role: 'USER'
            },
            token: 'mock-jwt-token-' + Date.now()
        }
    });
});
app.post('/api/auth/logout', (_req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});
// Mock processes endpoints
app.get('/api/processes', (_req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'process-1',
                title: 'Sample Manuscript Analysis',
                status: 'CREATED',
                currentStep: 'UPLOAD',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ]
    });
});
app.post('/api/processes', (req, res) => {
    const { title } = req.body;
    if (!title) {
        return res.status(400).json({
            success: false,
            error: {
                type: 'VALIDATION_ERROR',
                message: 'Title is required'
            }
        });
    }
    const newProcess = {
        id: 'process-' + Date.now(),
        title: title,
        status: 'CREATED',
        currentStep: 'UPLOAD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    return res.status(201).json({
        success: true,
        data: newProcess
    });
});
app.get('/api/processes/:id', (req, res) => {
    const id = req.params['id'];
    res.json({
        success: true,
        data: {
            id: id,
            title: 'Sample Manuscript Analysis',
            status: 'CREATED',
            currentStep: 'UPLOAD',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    });
});
// File upload endpoint
app.post('/api/processes/:id/upload', upload.single('file'), (req, res) => {
    console.log('📁 File upload request received');
    console.log('Process ID:', req.params['id']);
    console.log('File:', req.file);
    console.log('Headers:', req.headers);
    const id = req.params['id'];
    const file = req.file;
    console.log('Processing upload for process:', id);
    if (!file) {
        console.error('❌ No file in upload request');
        return res.status(400).json({
            success: false,
            error: {
                type: 'VALIDATION_ERROR',
                message: 'No file uploaded. Please select a file to upload.'
            }
        });
    }
    // Validate file type
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(file.mimetype)) {
        console.error('❌ Invalid file type:', file.mimetype);
        return res.status(400).json({
            success: false,
            error: {
                type: 'VALIDATION_ERROR',
                message: 'Invalid file type. Please upload a PDF or Word document (.pdf, .doc, .docx).'
            }
        });
    }
    console.log('✅ File upload successful:', file.originalname);
    // Mock successful upload response
    return res.json({
        success: true,
        data: {
            fileId: 'file-' + Date.now(),
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            uploadedAt: new Date().toISOString()
        },
        message: 'File uploaded successfully'
    });
});
// Metadata endpoints
app.get('/api/processes/:id/metadata', (req, res) => {
    const id = req.params['id'];
    console.log('Getting metadata for process:', id);
    // Mock metadata response
    return res.json({
        success: true,
        data: {
            title: 'Sample Research Paper',
            authors: [
                {
                    name: 'Dr. John Smith',
                    email: 'john.smith@university.edu',
                    affiliation: 'University Research Center'
                }
            ],
            abstract: 'This is a sample abstract for demonstration purposes.',
            keywords: ['research', 'analysis', 'methodology'],
            extractedAt: new Date().toISOString()
        }
    });
});
// Activity log endpoint
app.get('/api/activity', (_req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'activity-1',
                action: 'Process Created',
                details: 'New manuscript analysis process created',
                timestamp: new Date().toISOString()
            }
        ]
    });
});
// Error handling middleware
app.use((error, _req, res, _next) => {
    console.error('❌ Server error:', error);
    res.status(500).json({
        success: false,
        error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'An internal server error occurred'
        }
    });
});
// 404 handler
app.use('*', (req, res) => {
    console.log('❌ 404 - Route not found:', req.method, req.originalUrl);
    res.status(404).json({
        success: false,
        error: {
            type: 'NOT_FOUND',
            message: 'Route not found'
        }
    });
});
app.listen(environment_1.config.port, () => {
    console.log(`🚀 Simple server running on port ${environment_1.config.port}`);
    console.log(`🔗 Health check: http://localhost:${environment_1.config.port}/health`);
    console.log(`🔗 Test API: http://localhost:${environment_1.config.port}/api/test`);
    console.log(`📁 Upload endpoint: http://localhost:${environment_1.config.port}/api/processes/:id/upload`);
});
