import mongoose from "mongoose";
import Course from "../models/courseModel.js";
import { ThrowError } from "../utils/ErrorUtils.js"
import { sendSuccessResponse, sendErrorResponse, sendBadRequestResponse, sendForbiddenResponse, sendCreatedResponse, sendUnauthorizedResponse } from '../utils/ResponseUtils.js';
import fs from 'fs';
import path from 'path';

// Create new course with file uploads
export const createCourse = async (req, res) => {
    try {
        // Destructure text fields from req.body
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

        // Validate required text fieldsz
        if (!video_title || !short_description || !price || !courseCategoryId) {
            // Clean up uploaded thumbnail if validation fails
            if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
                const thumbPath = path.resolve(req.files.thumbnail[0].path);
                if (fs.existsSync(thumbPath)) {
                    fs.unlinkSync(thumbPath);
                }
            }
            return ThrowError(res, 400, "Missing required fields: courseCategoryId, video_title, short_description, and price are required");
        }
        if (!mongoose.Types.ObjectId.isValid(courseCategoryId)) {
            // Clean up uploaded thumbnail if validation fails
            if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
                const thumbPath = path.resolve(req.files.thumbnail[0].path);
                if (fs.existsSync(thumbPath)) {
                    fs.unlinkSync(thumbPath);
                }
            }
            return ThrowError(res, 400, "Invalid courseCategoryId");
        }
        if (!mongoose.Types.ObjectId.isValid(course_languageId)) {
            // Clean up uploaded thumbnail if validation fails
            if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
                const thumbPath = path.resolve(req.files.thumbnail[0].path);
                if (fs.existsSync(thumbPath)) {
                    fs.unlinkSync(thumbPath);
                }
            }
            return ThrowError(res, 400, "Invalid course_languageId");
        }

        // Check if courseCategoryId exists
        const courseCategoryExists = await mongoose.model('CourseCategory').findById(courseCategoryId);
        if (!courseCategoryExists) {
            // Clean up uploaded thumbnail if validation fails
            if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
                const thumbPath = path.resolve(req.files.thumbnail[0].path);
                if (fs.existsSync(thumbPath)) {
                    fs.unlinkSync(thumbPath);
                }
            }
            return ThrowError(res, 404, "Course category not found");
        }

        // Check if course_languageId exists
        const languageExists = await mongoose.model('Language').findById(course_languageId);
        if (!languageExists) {
            // Clean up uploaded thumbnail if validation fails
            if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
                const thumbPath = path.resolve(req.files.thumbnail[0].path);
                if (fs.existsSync(thumbPath)) {
                    fs.unlinkSync(thumbPath);
                }
            }
            return ThrowError(res, 404, "course_language not found");
        }

        // Validate files (optional: thumbnail only)
        let thumbnailUrl = "";
        if (req.file) {
            thumbnailUrl = req.file.path || req.file.location || "";
        }

        // Parse what_are_learn if it's a string (from form-data)
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

        // Prevent duplicate course by video_title
        const existingCourse = await Course.findOne({ video_title });
        if (existingCourse) {
            // Clean up uploaded thumbnail if duplicate course
            if (req.file) {
                const thumbPath = path.resolve(req.file.path);
                if (fs.existsSync(thumbPath)) {
                    fs.unlinkSync(thumbPath);
                }
            }
            return ThrowError(res, 400, "A course with this name (video_title) already exists.");
        }

        // Create the course
        const newCourse = new Course({
            courseCategory: courseCategoryId,
            thumbnail: thumbnailUrl,
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

        // Return a detailed response
        res.status(201).json({
            success: true,
            message: "Course created successfully",
            data: {
                course: savedCourse,
                fileInfo: {
                    thumbnail: req.file ? {
                        url: thumbnailUrl,
                        type: req.file.mimetype,
                        size: req.file.size
                    } : null
                }
            }
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get single course by ID
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

        // Only allow access if user is admin or has purchased the course
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

// Get all courses
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

// Update course
export const updateCourse = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return ThrowError(res, 400, "Invalid course ID");
        }

        const { courseCategoryId, video_title, short_description, rating, course_languageId, language, cc, price, what_are_learn, long_description } = req.body;

        const course = await Course.findById(req.params.id);
        if (!course) {
            return ThrowError(res, 404, "Course not found");
        }

        // Only check if courseCategoryId is provided
        if (courseCategoryId) {
            const courseCategoryExists = await mongoose.model('CourseCategory').findById(courseCategoryId);
            if (!courseCategoryExists) {
                return ThrowError(res, 404, "Course category not found");
            }
            course.courseCategory = courseCategoryId;
        }

        // Check if course_languageId exists
        if (course_languageId) {
            const languageExists = await mongoose.model('Language').findById(course_languageId);
            if (!languageExists) {
                return ThrowError(res, 404, "course_language not found");
            }
            course.course_languageId = course_languageId;
        }

        // If a new file is uploaded, delete the old file and update the path
        if (req.file) {
            if (course.thumbnail) {
                const oldThumbPath = path.resolve(course.thumbnail);
                if (fs.existsSync(oldThumbPath)) {
                    fs.unlinkSync(oldThumbPath);
                }
            }
            course.thumbnail = req.file.path;
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
        res.status(200).json(updatedCourse);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Delete course
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

        // Delete thumbnail image if exists
        if (existingCourse.thumbnail) {
            const thumbPath = path.resolve(existingCourse.thumbnail);
            if (fs.existsSync(thumbPath)) {
                fs.unlinkSync(thumbPath);
            }
        }

        await Course.findByIdAndDelete(id);

        return sendSuccessResponse(res, "Course deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};

