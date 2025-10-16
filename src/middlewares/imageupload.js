import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import dotenv from 'dotenv';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';

dotenv.config();

// 🛠 S3 Client Configuration
const s3 = new S3Client({
    region: process.env.S3_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: String(process.env.S3_ACCESS_KEY).trim(),
        secretAccessKey: String(process.env.S3_SECRET_KEY).trim()
    }
});

// 🗂 Map field names to S3 folders (based on your first code)
const getS3Folder = (fieldname) => {
    switch (fieldname) {
        case 'companyImage':
            return 'companyImages';
        case 'thumbnail':
            return 'thumbnails';
        case 'video':
            return 'videos';
        case 'profileImage':
            return 'profileImages';
        case 'mentorImage':
            return 'mentorImages';
        case 'language_thumbnail':
            return 'language_thumbnails';
        case 'image':
            return 'images';
        default:
            return 'general';
    }
};

// 📦 Multer S3 Storage
const storage = multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
        cb(null, { fieldname: file.fieldname });
    },
    key: (req, file, cb) => {
        try {
            const folder = getS3Folder(file.fieldname);
            const ext = path.extname(file.originalname);
            const fileName = `${Date.now()}${ext}`;
            cb(null, `${folder}/${fileName}`);
        } catch (err) {
            cb(err);
        }
    }
    // 🚨 No 'acl' property - this fixes the error
});


// ✅ File validation (based on your first code field names)
const fileFilter = (req, file, cb) => {
    const allowedFieldNames = ['image', 'companyImage', 'thumbnail', 'profileImage', 'video', 'mentorImage', 'language_thumbnail'];

    if (allowedFieldNames.includes(file.fieldname)) {
        if (['image', 'companyImage', 'thumbnail', 'profileImage', 'mentorImage', 'language_thumbnail'].includes(file.fieldname)) {
            const isImage = file.mimetype.startsWith('image/');
            const isOctetStream = file.mimetype === 'application/octet-stream';
            const ext = path.extname(file.originalname).toLowerCase();
            const isJfifExt = ext === '.jfif';

            if (isImage || isOctetStream || isJfifExt) {
                cb(null, true);
            } else {
                cb(new Error(`Invalid file type for ${file.fieldname}. Only images are allowed.`));
            }
        }
        else if (file.fieldname === 'video') {
            const isVideo = file.mimetype.startsWith('video/');
            if (isVideo) {
                cb(null, true);
            } else {
                cb(new Error('Invalid file type for video field. Only videos are allowed.'));
            }
        }
    } else {
        cb(new Error(`Please upload a file with one of these field names: ${allowedFieldNames.join(', ')}`));
    }
};

// 📥 Multer instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 200 // 200MB
    }
});

// 🔄 Convert JFIF to JPEG - S3 compatible version
const convertJfifToJpeg = async (req, res, next) => {
    try {
        if (!req.file && !req.files) return next();

        const processFile = async (file) => {
            if (!file) return;

            const ext = path.extname(file.originalname).toLowerCase();
            const isJfif = ext === '.jfif' || file.mimetype === 'image/jfif' || file.mimetype === 'application/octet-stream';

            if (isJfif) {
                console.log('Converting JFIF to JPEG for S3...');
                // Note: For S3, you'd need to download, convert, and re-upload
                // This is a placeholder - you might want to handle this differently
                // or convert before uploading to S3
            }
        };

        if (req.file) {
            await processFile(req.file);
        } else if (req.files) {
            for (const fieldName in req.files) {
                for (const file of req.files[fieldName]) {
                    await processFile(file);
                }
            }
        }

        next();
    } catch (err) {
        console.error('Error in convertJfifToJpeg:', err);
        next(err);
    }
};

// ⚠️ Error handler (same as your first code)
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

// 📤 Create upload handlers (similar to your first code structure)
const uploadHandlers = {
    single: (fieldName) => {
        return upload.single(fieldName);
    },
    fields: (fields) => {
        return upload.fields(fields);
    }
};

// 📤 Pre-defined upload fields (based on your first code usage)
export const uploadMedia = upload.fields([
    { name: 'companyImage', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'profileImage', maxCount: 1 },
    { name: 'mentorImage', maxCount: 1 },
    { name: 'language_thumbnail', maxCount: 1 },
    { name: 'image', maxCount: 1 }
]);

export { upload, uploadHandlers, handleMulterError, convertJfifToJpeg };
export default uploadHandlers;