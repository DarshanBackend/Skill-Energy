import Wishlist from "../models/wishlistModel.js";
import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";

export const addToWishlist = async (req, res) => {
    try {
        const userId = req.user._id;
        const { courseId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return res.status(400).json({ success: false, message: "Invalid course ID." });
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
        const wishlist = await Wishlist.findOne({ userId }).populate('courses');
        if (!wishlist) {
            return res.status(200).json({ success: true, data: [] });
        }
        res.status(200).json({ success: true, data: wishlist.courses });
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

        wishlist.courses = wishlist.courses.filter(
            id => id.toString() !== courseId
        );
        await wishlist.save();

        res.status(200).json({ success: true, message: "Course removed from wishlist.", data: wishlist });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const clearWishlist = async (req, res) => {
    try {
        const userId = req.user._id;
        const wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            return res.status(404).json({ success: false, message: "Wishlist not found." });
        }
        wishlist.courses = [];
        await wishlist.save();
        res.status(200).json({ success: true, message: "Wishlist cleared.", data: wishlist });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};