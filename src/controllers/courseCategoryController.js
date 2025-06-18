import mongoose from "mongoose";
import courseCategoryModel from "../models/courseCategoryModel.js";
import { ThrowError } from "../utils/ErrorUtils.js"
import { sendSuccessResponse, sendErrorResponse, sendBadRequestResponse, sendForbiddenResponse, sendCreatedResponse, sendUnauthorizedResponse } from '../utils/ResponseUtils.js';
import { UserAuth } from "../middlewares/auth.js";

//create CourseCategory
export const createCourseCategory = async (req, res) => {
    try {
        const {
            courseCategoryName
        } = req.body;

        const existingcourseCategoryName = await courseCategoryModel.findOne({ courseCategoryName })
        if (existingcourseCategoryName) {
            return sendBadRequestResponse(res, "courseCategoryName already exist");
        }

        // Create the courseCategory
        const newCourseCategory = new courseCategoryModel({
            courseCategoryName
        });

        const savedCourse = await newCourseCategory.save();

        // Return a detailed response
        res.status(201).json({
            success: true,
            message: "CourseCategory created successfully",
            category: {
                _id: savedCourse._id,
                courseCategoryName: savedCourse.courseCategoryName
            }
        });

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getAllCourseCategories = async (req, res) => {
    try {
        const categories = await courseCategoryModel.find();

        if (!categories || categories.length === 0) {
            return sendSuccessResponse(res, "No course categories found", []);
        }

        return sendSuccessResponse(res, "Course categories fetched successfully", categories);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getCourseCategoryById = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return sendForbiddenResponse(res, "Access denied. Only admins can view a course category by ID.");
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return ThrowError(res, 400, "Invalid courseCategory ID");
        }

        const category = await courseCategoryModel.findById(req.params.id);
        if (!category) {
            return sendBadRequestResponse(res, "Course category not found");
        }
        res.status(200).json({
            success: true,
            message: "Course category fetched successfully",
            data: category
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const updateCourseCategory = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return sendForbiddenResponse(res, "Access denied. Only admins can update a course category.");
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return ThrowError(res, 400, "Invalid courseCategory ID");
        }

        const { courseCategoryName } = req.body;
        const category = await courseCategoryModel.findById(req.params.id);
        if (!category) {
            return sendBadRequestResponse(res, "Course category not found");
        }
        category.courseCategoryName = courseCategoryName || category.courseCategoryName;
        const updatedCategory = await category.save();
        res.status(200).json({
            success: true,
            message: "Course category updated successfully",
            data: updatedCategory
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const deleteCourseCategory = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return sendForbiddenResponse(res, "Access denied. Only admins can delete a course category.");
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return ThrowError(res, 400, "Invalid courseCategory ID");
        }

        const category = await courseCategoryModel.findByIdAndDelete(req.params.id);
        if (!category) {
            return sendBadRequestResponse(res, "Course category not found");
        }
        res.status(200).json({
            success: true,
            message: "Course category deleted successfully"
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
