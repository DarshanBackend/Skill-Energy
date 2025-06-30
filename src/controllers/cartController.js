import Cart from "../models/cartModel.js";
import Course from "../models/courseModel.js";
import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";

// Add course to cart
export const addToCart = async (req, res) => {
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

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, courses: [courseId] });
        } else {
            if (cart.courses.some(id => id.toString() === courseId)) {
                return res.status(400).json({ success: false, message: "Course already in cart." });
            }
            cart.courses.push(courseId);
        }
        await cart.save();
        res.status(200).json({ success: true, message: "Course added to cart.", data: cart });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get all courses in user's cart
export const getCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const cart = await Cart.findOne({ userId }).populate({
            path: 'courses',
            select: 'thumnail video_title price'
        });
        if (!cart || cart.courses.length === 0) {
            return res.status(200).json({ success: true, message: "no any courses found", data: [] });
        }
        res.status(200).json({ success: true, data: cart.courses });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Remove a course from cart
export const removeFromCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const { courseId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return res.status(400).json({ success: false, message: "Invalid course ID." });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found." });
        }

        if (cart.courses.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is already empty." });
        }

        const courseIndex = cart.courses.findIndex(id => id.toString() === courseId);
        if (courseIndex === -1) {
            return res.status(404).json({ success: false, message: "Course not found in cart." });
        }

        cart.courses.splice(courseIndex, 1);
        await cart.save();

        if (cart.courses.length === 0) {
            return res.status(200).json({ success: true, message: "Course removed. Cart is now empty.", data: [] });
        }

        res.status(200).json({ success: true, message: "Course removed from cart.", data: cart });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Clear all courses from cart
export const clearCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found." });
        }
        if (cart.courses.length === 0) {
            // Cart is already empty, delete the cart document
            await Cart.findByIdAndDelete(cart._id);
            return res.status(400).json({ success: false, message: "Cart is already empty and has been deleted." });
        }
        cart.courses = [];
        await cart.save();
        // After clearing, delete the cart document
        await Cart.findByIdAndDelete(cart._id);
        res.status(200).json({ success: true, message: "Cart cleared and deleted.", data: null });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
