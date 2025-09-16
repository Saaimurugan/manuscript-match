import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory as Buffer

// File filter to validate file types
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword' // .doc
  ];

  const allowedExtensions = ['.pdf', '.docx', '.doc'];
  const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1, // Only allow single file upload
  },
});

// Middleware for single file upload
export const uploadSingle = upload.single('manuscript');

// Error handling middleware for multer errors
export const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size exceeds the 50MB limit';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Only one file is allowed';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field. Use "manuscript" as the field name';
        break;
      default:
        message = error.message;
    }

    return res.status(400).json({
      success: false,
      error: {
        type: 'FILE_UPLOAD_ERROR',
        message,
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    });
  }

  if (error && error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'FILE_VALIDATION_ERROR',
        message: error.message,
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    });
  }

  return next(error);
};