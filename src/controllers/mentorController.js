import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import Mentor from "../models/mentorModel.js";
import Course from "../models/courseModel.js";
import { sendSuccessResponse, sendErrorResponse, sendBadRequestResponse, sendCreatedResponse } from '../utils/ResponseUtils.js';
import fs from 'fs';
import path from "path";

// Add new mentor (Admin only)
export const addMentor = async (req, res) => {
    try {
        const { mentorName, courseId, status } = req.body;

        if (!mentorName || !courseId) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendBadRequestResponse(res, "Mentor name and Course ID are required");
        }

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendBadRequestResponse(res, "Invalid Course ID");
        }

        const course = await Course.findById(courseId);
        if (!course) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendErrorResponse(res, 404, "Course not found");
        }

        const existingMentor = await Mentor.findOne({ mentorName, courseId });
        if (existingMentor) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendBadRequestResponse(res, "This mentor is already assigned to this course");
        }

        let mentorImage = null;
        if (req.file) {
            mentorImage = `/public/mentorImages/${path.basename(req.file.path)}`;
        }

        const newMentor = await Mentor.create({
            mentorName,
            courseId,
            status: status || 'active',
            mentorImage
        });

        return sendCreatedResponse(res, "Mentor added successfully", newMentor);
    } catch (error) {
        if (req.file) fs.unlinkSync(path.resolve(req.file.path));
        return ThrowError(res, 500, error.message);
    }
};

// Get all mentors
export const getAllMentors = async (req, res) => {
    try {
        const mentors = await Mentor.find().populate('courseId', 'title').sort({ createdAt: -1 });

        if (!mentors.length) {
            return sendSuccessResponse(res, "No mentors found", []);
        }

        return sendSuccessResponse(res, "Mentors fetched successfully", mentors);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get mentor by ID
export const getMentorById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid mentor ID");
        }

        const mentor = await Mentor.findById(id).populate('courseId', 'title');
        if (!mentor) {
            return sendErrorResponse(res, 404, "Mentor not found");
        }

        return sendSuccessResponse(res, "Mentor retrieved successfully", mentor);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Update mentor (Admin only)
export const updateMentor = async (req, res) => {
    try {
        const { id } = req.params;
        const { mentorName, courseId, status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendBadRequestResponse(res, "Invalid mentor ID");
        }

        const existingMentor = await Mentor.findById(id);
        if (!existingMentor) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendErrorResponse(res, 404, "Mentor not found");
        }

        if (courseId) {
            if (!mongoose.Types.ObjectId.isValid(courseId)) {
                if (req.file) fs.unlinkSync(path.resolve(req.file.path));
                return sendBadRequestResponse(res, "Invalid Course ID format");
            }
            const course = await Course.findById(courseId);
            if (!course) {
                if (req.file) fs.unlinkSync(path.resolve(req.file.path));
                return sendErrorResponse(res, 404, "Course not found");
            }
            existingMentor.courseId = courseId;
        }

        if (req.file) {
            const newImagePath = `/public/mentorImages/${path.basename(req.file.path)}`;
            if (existingMentor.mentorImage) {
                const oldImagePath = path.join(process.cwd(), existingMentor.mentorImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            existingMentor.mentorImage = newImagePath;
        }

        if (mentorName) existingMentor.mentorName = mentorName;
        if (status) existingMentor.status = status;

        await existingMentor.save();

        return sendSuccessResponse(res, "Mentor updated successfully", existingMentor);
    } catch (error) {
        if (req.file) fs.unlinkSync(path.resolve(req.file.path));
        return ThrowError(res, 500, error.message);
    }
};

// Delete mentor (Admin only)
export const deleteMentor = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid mentor ID");
        }

        const mentor = await Mentor.findByIdAndDelete(id);
        if (!mentor) {
            return sendErrorResponse(res, 404, "Mentor not found");
        }

        if (mentor.mentorImage) {
            const imagePath = path.join(process.cwd(), mentor.mentorImage);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        return sendSuccessResponse(res, "Mentor deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get mentors by course
export const getMentorsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return sendBadRequestResponse(res, "Invalid Course ID");
        }
        const mentors = await Mentor.find({ courseId, status: 'active' }).populate('courseId', 'title');
        
        if (!mentors || mentors.length === 0) {
            return sendSuccessResponse(res, "No mentors found for this course", []);
        }
        
        return sendSuccessResponse(res, "Mentors for course fetched successfully", mentors);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
