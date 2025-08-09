const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Multer configuration for file uploads
 */

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
    },
});

// File filter for images only
const imageFilter = (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1, // Only one file at a time
    },
    fileFilter: imageFilter,
});

/**
 * Middleware for single image upload
 */
const uploadSingle = (fieldName = 'image') => {
    return (req, res, next) => {
        const uploadMiddleware = upload.single(fieldName);

        uploadMiddleware(req, res, (error) => {
            if (error instanceof multer.MulterError) {
                if (error.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        error: {
                            message: 'File size too large. Maximum size is 5MB.',
                            code: 'FILE_TOO_LARGE',
                        },
                    });
                }

                if (error.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        success: false,
                        error: {
                            message: 'Too many files. Only one file is allowed.',
                            code: 'TOO_MANY_FILES',
                        },
                    });
                }

                return res.status(400).json({
                    success: false,
                    error: {
                        message: `Upload error: ${error.message}`,
                        code: 'UPLOAD_ERROR',
                    },
                });
            }

            if (error) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: error.message,
                        code: 'INVALID_FILE_TYPE',
                    },
                });
            }

            next();
        });
    };
};

/**
 * Cleanup uploaded file
 * @param {string} filePath - Path to the file to delete
 */
const cleanupFile = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch (error) {
            console.error('Failed to cleanup file:', error.message);
        }
    }
};

/**
 * Middleware to cleanup uploaded files on error
 */
const cleanupOnError = (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
        // If there's an error and a file was uploaded, clean it up
        if (res.statusCode >= 400 && req.file) {
            cleanupFile(req.file.path);
        }

        originalSend.call(this, data);
    };

    next();
};

module.exports = {
    upload,
    uploadSingle,
    cleanupFile,
    cleanupOnError,
};