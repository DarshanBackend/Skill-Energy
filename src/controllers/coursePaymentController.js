import mongoose from "mongoose";
import CoursePayment from "../models/coursePaymentModel.js";
import Course from "../models/courseModel.js";
import { ThrowError } from "../utils/ErrorUtils.js";

export const createCoursePayment = async (req, res) => {
    try {
        const userId = req.user._id;
        const { transactionId, courseId } = req.body;

        if (!transactionId || !courseId) {
            return ThrowError(res, 400, "Missing required fields: transactionId, courseId");
        }
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return ThrowError(res, 400, "Invalid courseId");
        }

        // Check if course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return ThrowError(res, 404, "Course not found");
        }

        // Check if user already bought the course
        const existingPayment = await CoursePayment.findOne({ courseId, user: userId });
        if (existingPayment) {
            return ThrowError(res, 400, "You have already purchased this course.");
        }

        // Use the course price
        const price = course.price;

        const newPayment = new CoursePayment({
            transactionId,
            courseId,
            user: userId,
            price
        });
        const savedPayment = await newPayment.save();

        // Add user to course's user array if not already present
        const courseDoc = await Course.findById(courseId);
        if (courseDoc) {
            const alreadyAdded = courseDoc.user.some(u => u.userId.toString() === userId.toString());
            if (!alreadyAdded) {
                courseDoc.user.push({ userId: userId, timestamp: new Date() });
                await courseDoc.save();
            }
        }

        return res.status(201).json({
            success: true,
            message: "Course purchased successfully",
            payment: savedPayment
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get all course payment records (Admin Only)
export const getAllCoursePayments = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return ThrowError(res, 403, "Access denied. Admins only.");
        }
        const payments = await CoursePayment.find().populate('user', 'name email').populate('courseId', 'video_title price');
        if (!payments || payments.length === 0) {
            return ThrowError(res, 404, 'No course payment found');
        }
        res.status(200).json({
            success: true,
            message: "All course payment records fetched successfully",
            payments
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get single course payment record by ID (Admin or User)
export const getCoursePaymentById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return ThrowError(res, 400, 'Invalid Course Payment ID.');
        }
        const payment = await CoursePayment.findById(id).populate('user', 'name email').populate('courseId', 'video_title price');
        if (!payment) {
            return ThrowError(res, 404, 'Course payment record not found.');
        }

        // Allow admin or the user who owns the payment to access it
        if (!req.user.isAdmin && payment.user && payment.user._id.toString() !== req.user._id.toString()) {
            return ThrowError(res, 403, 'Access denied. You can only access your own course payment records.');
        }

        res.status(200).json({
            success: true,
            message: "Course payment record fetched successfully",
            payment
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Update course payment record (User Only)
export const updateCoursePayment = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return ThrowError(res, 400, 'Invalid Course Payment ID format.');
        }
        const payment = await CoursePayment.findById(id);
        if (!payment) {
            return ThrowError(res, 404, 'Course payment record not found.');
        }
        // Only allow the user who owns the payment to update it
        if (payment.user && payment.user.toString() !== req.user._id.toString()) {
            return ThrowError(res, 403, 'Access denied. You can only update your own course payment records.');
        }
        // Validate courseId if provided
        if (req.body.courseId) {
            if (!mongoose.Types.ObjectId.isValid(req.body.courseId)) {
                return ThrowError(res, 400, 'Invalid Course ID format.');
            }
            // Check if course exists
            const Course = (await import('../models/courseModel.js')).default;
            const course = await Course.findById(req.body.courseId);
            if (!course) {
                return ThrowError(res, 404, 'Course not found.');
            }
        }
     
        const updatedPayment = await CoursePayment.findByIdAndUpdate(
            id,
            { ...req.body },
            { new: true }
        );
        res.status(200).json({
            success: true,
            message: "Course payment record updated successfully",
            payment: updatedPayment
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Delete course payment record (User Only)
export const deleteCoursePayment = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return ThrowError(res, 400, 'Invalid Course Payment ID format.');
        }
        const payment = await CoursePayment.findById(id);
        if (!payment) {
            return ThrowError(res, 404, 'Course payment record not found.');
        }
        // Only allow the user who owns the payment to delete it
        if (payment.user && payment.user.toString() !== req.user._id.toString()) {
            return ThrowError(res, 403, 'Access denied. You can only delete your own course payment records.');
        }
        await CoursePayment.findByIdAndDelete(id);
        res.status(200).json({
            success: true,
            message: "Course payment record deleted successfully"
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
}; 