import multer from 'multer';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import dotenv from 'dotenv';

dotenv.config();

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
    // Accept all files that are being uploaded as 'image'
    if (file.fieldname === 'image') {
        cb(null, true);
    } else {
        cb(new Error('Please upload a file with field name "image"'));
    }
};

// Create multer instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter
});

// Create upload handlers
const uploadHandlers = {
    single: (fieldName) => {
        return upload.single(fieldName);
    }
};

// Error handling middleware
const handleMulterError = (err, req, res, next) => {
    console.log('Upload error:', err);

    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    } else if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
};

const convertJfifToJpeg = async (req, res, next) => {
    try {
        if (!req.file) return next();

        const file = req.file;
        const ext = path.extname(file.originalname).toLowerCase();

        if (ext === '.jfif' || file.mimetype === 'image/jfif' || file.mimetype === 'application/octet-stream') {
            const inputPath = file.path;
            const outputPath = inputPath.replace('.jfif', '.jpg');

            await sharp(inputPath)
                .jpeg()
                .toFile(outputPath);

            // Update the file path in req.file
            file.path = outputPath;
            file.filename = path.basename(outputPath);

            // Delete the original JFIF file
            fs.unlinkSync(inputPath);
        }

        next();
    } catch (err) {
        console.error('Error in convertJfifToJpeg:', err);
        next(err);
    }
};

export { upload, uploadHandlers, handleMulterError, convertJfifToJpeg };
export default uploadHandlers;
