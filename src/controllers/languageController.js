import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import Language from "../models/languageModel.js";
import { sendSuccessResponse, sendErrorResponse, sendBadRequestResponse, sendCreatedResponse } from '../utils/ResponseUtils.js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import courseModel from "../models/courseModel.js";
import Wishlist from "../models/wishlistModel.js";

const s3 = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY.trim(),
        secretAccessKey: process.env.S3_SECRET_KEY.trim(),
    },
});

const publicUrlForKey = (key) => {
    const cdn = process.env.CDN_BASE_URL?.replace(/\/$/, '');
    if (cdn) return `${cdn}/${key}`;
    const bucket = process.env.S3_BUCKET_NAME;
    const region = process.env.S3_REGION || 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`;
};

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

export const addLanguage = async (req, res) => {
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

        let language_thumbnail = null;
        let language_thumbnail_key = null;
        if (uploaded?.key) {
            language_thumbnail = publicUrlForKey(uploaded.key);
            language_thumbnail_key = uploaded.key;
        }

        const newLanguage = await Language.create({
            language,
            language_thumbnail,
            language_thumbnail_key
        });

        return sendCreatedResponse(res, "Language added successfully", newLanguage);
    } catch (error) {
        await cleanupUploadedIfAny(uploaded);
        return ThrowError(res, 500, error.message);
    }
};

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

        if (uploaded?.key) {
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
                }
            }

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
            }
        }

        await Language.findByIdAndDelete(id);

        return sendSuccessResponse(res, "Language deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const filterLanguages = async (req, res) => {
    try {
        const { search } = req.query;

        if (!search || search.trim() === "") {
            return sendBadRequestResponse(res, "Please provide a search term (e.g. ?search=p)");
        }

        const regex = new RegExp("^" + search, "i");

        const languages = await Language.find({ language: regex }).sort({ language: 1 });

        if (!languages || languages.length === 0) {
            return sendSuccessResponse(res, "No languages found for given search", []);
        }

        return sendSuccessResponse(res, "Languages filtered successfully", languages);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getCoursesByLanguage = async (req, res) => {
    try {
        const { languageId } = req.params;
        const userId = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(languageId)) {
            return sendBadRequestResponse(res, "Invalid Language ID format");
        }

        const language = await Language.findById(languageId);
        if (!language) {
            return sendErrorResponse(res, 404, "Language not found");
        }

        const courses = await courseModel.find({ course_languageId: languageId })
            .populate("courseCategory", "courseCategoryName")
            .populate("course_languageId", "language")
            .sort({ createdAt: -1 })
            .lean();

        if (!courses || courses.length === 0) {
            return sendSuccessResponse(res, `No courses found for language: ${language.language}`, []);
        }

        let wishlistCourseIds = [];
        if (userId) {
            const wishlist = await Wishlist.findOne({ userId });
            wishlistCourseIds = wishlist
                ? wishlist.courses.map(id => id.toString())
                : [];
        }

        const data = courses.map(course => ({
            ...course,
            isWishlisted: wishlistCourseIds.includes(course._id.toString()),
        }));

        return sendSuccessResponse(
            res,
            `Courses fetched successfully for language: ${language.language}`,
            data
        );
    } catch (error) {
        return sendErrorResponse(res, 500, error.message);
    }
};