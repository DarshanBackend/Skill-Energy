import Wishlist from "../models/wishlistModel.js";
import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import Course from "../models/courseModel.js";

export const addToWishlist = async (req, res) => {
    try {
        const userId = req.user._id;
        const { courseId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return res.status(400).json({ success: false, message: "Invalid course ID." });
        }

        // Check if course exists
        const courseExists = await Course.findById(courseId);
        if (!courseExists) {
            return res.status(404).json({ success: false, message: "Course not found." });
        }

        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = new Wishlist({ userId, courses: [courseId] });
        } else {
            // Prevent duplicate
            if (wishlist.courses.some(id => id.toString() === courseId)) {
                return res.status(400).json({ success: false, message: "Course already in wishlist." });
            }
            wishlist.courses.push(courseId);
        }

        await wishlist.save();
        res.status(200).json({ success: true, message: "Course added to wishlist.", data: wishlist });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getUserWishlist = async (req, res) => {
    try {
        const userId = req.user._id;
        const wishlist = await Wishlist.findOne({ userId }).populate({
            path: 'courses',
            select: 'thumnail video_title price ratings'
        });
        if (!wishlist || !wishlist.courses || wishlist.courses.length === 0) {
            return res.status(200).json({ success: true, message: "No wishlist courses found.", data: [] });
        }

        // Check for missing courses
        const originalCourseIds = wishlist.courses.map(c => c && c._id ? c._id.toString() : null);
        const missingCourseIds = wishlist.courses
            .map((c, idx) => c ? null : wishlist.courses[idx])
            .filter(id => id);

        if (missingCourseIds.length > 0) {
            return res.status(404).json({ success: false, message: `Course ID(s) not found: ${missingCourseIds.join(', ')}` });
        }

        // Map courses to include only required fields and user-specific rating
        const data = wishlist.courses.map(course => {
            let averageRating = 0;
            if (course.ratings && Array.isArray(course.ratings)) {
                const totalRating = course.ratings.reduce((sum, r) => sum + r.rating, 0);
                averageRating = course.ratings.length > 0 ? totalRating / course.ratings.length : 0;
            }
            return {
                courseId: course._id,
                _id: course._id,
                thumnail: course.thumnail,
                video_title: course.video_title,
                price: course.price,
                averageRating: Math.round(averageRating * 10) / 10
            };
        });
        res.status(200).json({ success: true, data });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.user._id;
        const { courseId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return res.status(400).json({ success: false, message: "Invalid course ID." });
        }

        const wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            return res.status(404).json({ success: false, message: "Wishlist not found." });
        }


        if (wishlist.courses.length === 0) {
            return res.status(400).json({ success: false, message: "wishlist is already empty." });
        }


        const wishlistIndex = wishlist.courses.findIndex(id => id.toString() === courseId);
        if (wishlistIndex === -1) {
            return res.status(404).json({ success: false, message: "Course not found in wishlist." });
        }

        wishlist.courses.splice(wishlistIndex, 1);
        await wishlist.save();

        if (wishlist.courses.length === 0) {
            return res.status(200).json({ success: true, message: "Course removed. wishlist is now empty.", data: [] });
        }

        res.status(200).json({ success: true, message: "Course removed from wishlist.", data: cart });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Clear all courses from wishlist
export const clearWishlist = async (req, res) => {
    try {
        const userId = req.user._id;
        const wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            return res.status(404).json({ success: false, message: "Wishlist not found." });
        }
        if (wishlist.courses.length === 0) {
            // Wishlist is already empty, delete the wishlist document
            await Wishlist.findByIdAndDelete(wishlist._id);
            return res.status(400).json({ success: false, message: "Wishlist is already empty and has been deleted." });
        }
        wishlist.courses = [];
        await wishlist.save();
        // After clearing, delete the wishlist document
        await Wishlist.findByIdAndDelete(wishlist._id);
        res.status(200).json({ success: true, message: "Wishlist cleared and deleted.", data: null });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
