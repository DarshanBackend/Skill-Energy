import ratingModel from "../models/ratingModel.js";
import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import { sendSuccessResponse } from "../utils/ResponseUtils.js";

export const addRating = async (req, res) => {
    try {
        const { courseId, rate, description } = req.body;
        const userId = req.user._id;

        // Validate courseId
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid courseId."
            });
        }

        // Check if user already rated this course
        const existing = await ratingModel.findOne({ userId, courseId });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "You have already rated this course."
            });
        }

        const newRating = new ratingModel({
            userId,
            courseId,
            rate,
            description
        });

        await newRating.save();

        res.status(201).json({
            success: true,
            message: "Rating added successfully.",
            data: newRating
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getCourseRatings = async (req, res) => {
    try {
        const { courseId } = req.params;

        // Get all ratings with user name
        const ratings = await ratingModel.find({ courseId })
            .populate('userId', 'name')
            .sort({ createdAt: -1 });

        // Get count for each star
        const ratingCounts = await ratingModel.aggregate([
            { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
            { $group: { _id: "$rate", count: { $sum: 1 } } }
        ]);

        // Format counts as { 1: xx, 2: xx, ... }
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratingCounts.forEach(rc => { counts[rc._id] = rc.count; });

        // Calculate average
        const totalRatings = ratings.length;
        const averageRating = totalRatings
            ? (ratings.reduce((sum, r) => sum + r.rate, 0) / totalRatings).toFixed(1)
            : 0;

        res.status(200).json({
            success: true,
            averageRating,
            ratingCounts: counts,
            ratings: ratings.map(r => ({
                userName: r.userId.name,
                rate: r.rate,
                description: r.description,
                createdAt: r.createdAt
            }))
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getRatingById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid rating ID." });
        }
        const rating = await ratingModel.findById(id).populate('userId', 'name');
        if (!rating) {
            return res.status(404).json({ success: false, message: "Rating not found." });
        }
        res.status(200).json({ success: true, data: rating });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getAllRatings = async (req, res) => {
    try {
        const ratings = await ratingModel.find().populate('userId', 'name').populate('courseId', 'title');

        if (!ratings || ratings.length === 0) {
            return sendSuccessResponse(res, "No Rating found", []);
        }

        res.status(200).json({ success: true, data: ratings });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const updateRating = async (req, res) => {
    try {
        const { id } = req.params;
        const { rate, description } = req.body;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid rating ID." });
        }
        const updated = await ratingModel.findOneAndUpdate(
            { _id: id, userId: req.user._id }, // Only allow user to update their own rating
            { rate, description },
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({ success: false, message: "Rating not found or you do not have permission." });
        }
        res.status(200).json({ success: true, message: "Rating updated.", data: updated });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const deleteRating = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid rating ID." });
        }
        const deleted = await ratingModel.findOneAndDelete({ _id: id, userId: req.user._id });
        if (!deleted) {
            return res.status(404).json({ success: false, message: "No any Rating found" });
        }
        res.status(200).json({ success: true, message: "Rating deleted." });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const totalRatings = async (req, res) => {
    try {
        const totalRatings = await ratingModel.find().countDocuments()

        if (!totalRatings || totalRatings.length === 0) {
            return sendSuccessResponse(res, "No Rating found", []);
        }

        return sendSuccessResponse(res, "Toatal rating fetched successfully... ", { count: totalRatings });
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}
