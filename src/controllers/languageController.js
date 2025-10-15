import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import Language from "../models/languageModel.js";
import { sendSuccessResponse, sendErrorResponse, sendBadRequestResponse, sendCreatedResponse } from '../utils/ResponseUtils.js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// 🛠 S3 Client Configuration
const s3 = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY.trim(),
        secretAccessKey: process.env.S3_SECRET_KEY.trim(),
    },
});

// 🌐 Build public URL for S3 objects
const publicUrlForKey = (key) => {
    const cdn = process.env.CDN_BASE_URL?.replace(/\/$/, '');
    if (cdn) return `${cdn}/${key}`;
    const bucket = process.env.S3_BUCKET_NAME;
    const region = process.env.S3_REGION || 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`;
};

// 🗑 Cleanup uploaded S3 object in case of errors
const cleanupUploadedIfAny = async (file) => {
    if (file?.key) {
        try {
            await s3.send(
                new DeleteObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: file.key,
                })
            );
        } catch (e) {
            console.error('S3 cleanup failed:', e.message);
        }
    }
};

// ➕ Add new language (Admin only) - UPDATED FOR S3
export const addLanguage = async (req, res) => {
    // Support different upload scenarios
    const pickUploaded = () => {
        if (req.file) return req.file;
        if (req.files?.language_thumbnail?.[0]) return req.files.language_thumbnail[0];
        if (req.files?.thumbnail?.[0]) return req.files.thumbnail[0];
        if (req.files?.image?.[0]) return req.files.image[0];
        return null;
    };

    const uploaded = pickUploaded();

    try {
        const { language } = req.body;

        if (!language) {
            await cleanupUploadedIfAny(uploaded);
            return sendBadRequestResponse(res, "Language is required");
        }

        const existingLanguage = await Language.findOne({ language });
        if (existingLanguage) {
            await cleanupUploadedIfAny(uploaded);
            return sendBadRequestResponse(res, "This language already exists");
        }

        // 🆕 Handle S3 thumbnail upload
        let language_thumbnail = null;
        let language_thumbnail_key = null;
        if (uploaded?.key) {
            language_thumbnail = publicUrlForKey(uploaded.key);
            language_thumbnail_key = uploaded.key;
        }

        const newLanguage = await Language.create({ 
            language, 
            language_thumbnail,
            language_thumbnail_key // Store S3 key for future deletion
        });

        return sendCreatedResponse(res, "Language added successfully", newLanguage);
    } catch (error) {
        await cleanupUploadedIfAny(uploaded);
        return ThrowError(res, 500, error.message);
    }
};

// 📋 Get all languages (UNCHANGED)
export const getAllLanguages = async (req, res) => {
    try {
        const languages = await Language.find().sort({ language: 1 });

        if (!languages.length) {
            return sendSuccessResponse(res, "No languages found", []);
        }

        return sendSuccessResponse(res, "Languages fetched successfully", languages);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// 🔍 Get language by ID (UNCHANGED)
export const getLanguageById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid language ID");
        }

        const language = await Language.findById(id);
        if (!language) {
            return sendErrorResponse(res, 404, "Language not found");
        }

        return sendSuccessResponse(res, "Language retrieved successfully", language);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// ✏️ Update language (Admin only) - UPDATED FOR S3
export const updateLanguage = async (req, res) => {
    const pickUploaded = () => {
        if (req.file) return req.file;
        if (req.files?.language_thumbnail?.[0]) return req.files.language_thumbnail[0];
        if (req.files?.thumbnail?.[0]) return req.files.thumbnail[0];
        if (req.files?.image?.[0]) return req.files.image[0];
        return null;
    };

    const uploaded = pickUploaded();

    try {
        const { id } = req.params;
        const { language } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            await cleanupUploadedIfAny(uploaded);
            return sendBadRequestResponse(res, "Invalid language ID");
        }

        if (!language) {
            await cleanupUploadedIfAny(uploaded);
            return sendBadRequestResponse(res, "Language is required");
        }

        const existingLanguage = await Language.findOne({ language, _id: { $ne: id } });
        if (existingLanguage) {
            await cleanupUploadedIfAny(uploaded);
            return sendBadRequestResponse(res, "This language already exists");
        }

        const languageDoc = await Language.findById(id);
        if (!languageDoc) {
            await cleanupUploadedIfAny(uploaded);
            return sendErrorResponse(res, 404, "Language not found");
        }

        // 🆕 Handle S3 thumbnail upload
        if (uploaded?.key) {
            // Delete old thumbnail from S3 if exists
            if (languageDoc.language_thumbnail_key) {
                try {
                    await s3.send(
                        new DeleteObjectCommand({
                            Bucket: process.env.S3_BUCKET_NAME,
                            Key: languageDoc.language_thumbnail_key,
                        })
                    );
                } catch (error) {
                    console.error('Error deleting old thumbnail from S3:', error.message);
                    // Continue with update even if old thumbnail deletion fails
                }
            }

            // Update with new thumbnail
            languageDoc.language_thumbnail = publicUrlForKey(uploaded.key);
            languageDoc.language_thumbnail_key = uploaded.key;
        }

        languageDoc.language = language;
        const updatedLanguage = await languageDoc.save();

        return sendSuccessResponse(res, "Language updated successfully", updatedLanguage);
    } catch (error) {
        await cleanupUploadedIfAny(uploaded);
        return ThrowError(res, 500, error.message);
    }
};

// 🗑 Delete language (Admin only) - UPDATED FOR S3
export const deleteLanguage = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid language ID");
        }

        const language = await Language.findById(id);
        if (!language) {
            return sendErrorResponse(res, 404, "Language not found");
        }

        // 🆕 Delete language thumbnail from S3 if exists
        if (language.language_thumbnail_key) {
            try {
                await s3.send(
                    new DeleteObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: language.language_thumbnail_key,
                    })
                );
            } catch (error) {
                console.error('Error deleting thumbnail from S3:', error.message);
                // Continue with deletion even if thumbnail deletion fails
            }
        }

        await Language.findByIdAndDelete(id);

        return sendSuccessResponse(res, "Language deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};