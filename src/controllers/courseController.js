import mongoose from "mongoose";
import Course from "../models/courseModel.js";
import { ThrowError } from "../utils/ErrorUtils.js"
import { sendSuccessResponse, sendErrorResponse, sendBadRequestResponse, sendForbiddenResponse, sendCreatedResponse, sendUnauthorizedResponse } from '../utils/ResponseUtils.js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

export const createCourse = async (req, res) => {
    const pickUploaded = () => {
        if (req.file) return req.file;
        if (req.files?.thumbnail?.[0]) return req.files.thumbnail[0];
        if (req.files?.image?.[0]) return req.files.image[0];
        return null;
    };

    const uploaded = pickUploaded();

    try {
        const {
            courseCategoryId,
            video_title,
            short_description,
            course_languageId,
            language,
            cc,
            price,
            what_are_learn,
            long_description
        } = req.body;

        if (!video_title || !short_description || !price || !courseCategoryId) {
            await cleanupUploadedIfAny(uploaded);
            return ThrowError(res, 400, "Missing required fields: courseCategoryId, video_title, short_description, and price are required");
        }

        if (!mongoose.Types.ObjectId.isValid(courseCategoryId)) {
            await cleanupUploadedIfAny(uploaded);
            return ThrowError(res, 400, "Invalid courseCategoryId");
        }

        if (!mongoose.Types.ObjectId.isValid(course_languageId)) {
            await cleanupUploadedIfAny(uploaded);
            return ThrowError(res, 400, "Invalid course_languageId");
        }

        const courseCategoryExists = await mongoose.model('CourseCategory').findById(courseCategoryId);
        if (!courseCategoryExists) {
            await cleanupUploadedIfAny(uploaded);
            return ThrowError(res, 404, "Course category not found");
        }

        const languageExists = await mongoose.model('Language').findById(course_languageId);
        if (!languageExists) {
            await cleanupUploadedIfAny(uploaded);
            return ThrowError(res, 404, "course_language not found");
        }

        let parsedWhatAreLearn = [];
        if (what_are_learn) {
            if (typeof what_are_learn === 'string') {
                try {
                    parsedWhatAreLearn = JSON.parse(what_are_learn);
                } catch (e) {
                    parsedWhatAreLearn = what_are_learn.split(',').map(item => item.trim());
                }
            } else if (Array.isArray(what_are_learn)) {
                parsedWhatAreLearn = what_are_learn;
            }
        }

        const existingCourse = await Course.findOne({ video_title });
        if (existingCourse) {
            await cleanupUploadedIfAny(uploaded);
            return ThrowError(res, 400, "A course with this name (video_title) already exists.");
        }

        let thumbnail = null;
        let thumbnail_key = null;
        if (uploaded?.key) {
            thumbnail = publicUrlForKey(uploaded.key);
            thumbnail_key = uploaded.key;
        }

        const newCourse = new Course({
            courseCategory: courseCategoryId,
            thumbnail,
            thumbnail_key,
            video_title,
            short_description,
            course_languageId: course_languageId || '',
            language: language || '',
            cc: cc || '',
            price: price ? parseFloat(price) : 0,
            what_are_learn: parsedWhatAreLearn,
            long_description: long_description || '',
            created_by: new Date(),
            last_updated: new Date()
        });

        const savedCourse = await newCourse.save();

        res.status(201).json({
            success: true,
            message: "Course created successfully",
            data: {
                course: savedCourse,
                fileInfo: {
                    thumbnail: uploaded ? {
                        url: thumbnail,
                        key: thumbnail_key,
                        type: uploaded.mimetype,
                        size: uploaded.size
                    } : null
                }
            }
        });
    } catch (error) {
        await cleanupUploadedIfAny(uploaded);
        return ThrowError(res, 500, error.message);
    }
};

export const getCourseById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid course ID");
        }

        const course = await Course.findById(id).populate('courseCategory');
        if (!course) {
            return sendErrorResponse(res, 404, "Course not found");
        }

        const isAdmin = req.user && req.user.isAdmin;
        if (!isAdmin) {
            const CoursePayment = (await import('../models/coursePaymentModel.js')).default;
            const hasPaid = await CoursePayment.findOne({ courseId: id, user: req.user._id });
            if (!hasPaid) {
                return sendForbiddenResponse(res, "Access denied. You have not purchased this course.");
            }
        }

        return sendSuccessResponse(res, "Course retrieved successfully", course);
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};

export const getAllCourses = async (req, res) => {
    try {
        const courses = await Course.find({}).populate('courseCategory');

        if (!courses || courses.length === 0) {
            return sendSuccessResponse(res, "No courses found", []);
        }

        return sendSuccessResponse(res, "Courses fetched successfully", courses);
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};


export const getCourseByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const userId = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return sendBadRequestResponse(res, "Invalid category ID");
        }

        const courses = await Course.find({ courseCategory: categoryId }).populate('courseCategory');

        if (!courses || courses.length === 0) {
            return sendSuccessResponse(res, "No courses found for this category", []);
        }

        // ❤️ Get wishlist for current user
        let wishlistCourseIds = [];
        if (userId) {
            const wishlist = await Wishlist.findOne({ userId });
            wishlistCourseIds = wishlist
                ? wishlist.courses.map((id) => id.toString())
                : [];
        }

        // 🩵 Add isWishlisted flag to each course
        const data = courses.map((course) => ({
            ...course.toObject(),
            isWishlisted: wishlistCourseIds.includes(course._id.toString()),
        }));

        return sendSuccessResponse(res, "Courses fetched successfully", data);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const updateCourse = async (req, res) => {
    const pickUploaded = () => {
        if (req.file) return req.file;
        if (req.files?.thumbnail?.[0]) return req.files.thumbnail[0];
        if (req.files?.image?.[0]) return req.files.image[0];
        return null;
    };

    const uploaded = pickUploaded();

    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            await cleanupUploadedIfAny(uploaded);
            return ThrowError(res, 400, "Invalid course ID");
        }

        const { courseCategoryId, video_title, short_description, rating, course_languageId, language, cc, price, what_are_learn, long_description } = req.body;

        const course = await Course.findById(req.params.id);
        if (!course) {
            await cleanupUploadedIfAny(uploaded);
            return ThrowError(res, 404, "Course not found");
        }

        if (courseCategoryId) {
            const courseCategoryExists = await mongoose.model('CourseCategory').findById(courseCategoryId);
            if (!courseCategoryExists) {
                await cleanupUploadedIfAny(uploaded);
                return ThrowError(res, 404, "Course category not found");
            }
            course.courseCategory = courseCategoryId;
        }

        if (course_languageId) {
            const languageExists = await mongoose.model('Language').findById(course_languageId);
            if (!languageExists) {
                await cleanupUploadedIfAny(uploaded);
                return ThrowError(res, 404, "course_language not found");
            }
            course.course_languageId = course_languageId;
        }

        if (uploaded?.key) {
            if (course.thumbnail_key) {
                try {
                    await s3.send(
                        new DeleteObjectCommand({
                            Bucket: process.env.S3_BUCKET_NAME,
                            Key: course.thumbnail_key,
                        })
                    );
                } catch (error) {
                    console.error('Error deleting old thumbnail from S3:', error.message);
                }
            }

            course.thumbnail = publicUrlForKey(uploaded.key);
            course.thumbnail_key = uploaded.key;
        }

        course.video_title = video_title ?? course.video_title;
        course.short_description = short_description ?? course.short_description;
        course.rating = rating ?? course.rating;
        course.language = language ?? course.language;
        course.cc = cc ?? course.cc;
        course.price = price ?? course.price;
        course.what_are_learn = what_are_learn ?? course.what_are_learn;
        course.long_description = long_description ?? course.long_description;

        const updatedCourse = await course.save();

        return sendSuccessResponse(res, "Course updated successfully", updatedCourse);
    } catch (error) {
        await cleanupUploadedIfAny(uploaded);
        return ThrowError(res, 500, error.message);
    }
};

export const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid course ID");
        }

        const existingCourse = await Course.findById(id);
        if (!existingCourse) {
            return sendErrorResponse(res, 404, "Course not found");
        }

        if (existingCourse.thumbnail_key) {
            try {
                await s3.send(
                    new DeleteObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: existingCourse.thumbnail_key,
                    })
                );
            } catch (error) {
                console.error('Error deleting thumbnail from S3:', error.message);
            }
        }

        await Course.findByIdAndDelete(id);

        return sendSuccessResponse(res, "Course deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};
