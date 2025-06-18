import Premium from '../models/premiumModel.js';
import { ThrowError } from '../utils/ErrorUtils.js';
import mongoose from 'mongoose';
import { sendBadRequestResponse } from '../utils/ResponseUtils.js';

// Create new premium plan (Admin Only)
export const createPremium = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return ThrowError(res, 403, "Access denied. Admins only.");
        }
        const { type, price, content, isActive } = req.body;
        if (!type || !price || !content) {
            return ThrowError(res, 400, "type, price, and content are required");
        }

        const existingPremium = await Premium.find({ type });
        if (existingPremium.length > 0) {
            return sendBadRequestResponse(res, "Premium already exists");
        }

        const newPremium = new Premium({
            type,
            price,
            content,
            isActive: isActive !== undefined ? isActive : true
        });
        const savedPremium = await newPremium.save();
        res.status(201).json({
            success: true,
            message: "Premium plan created successfully",
            premium: savedPremium
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get all premium plans (Public)
export const getAllPremium = async (req, res) => {
    try {
        const premiums = await Premium.find();

        if (!premiums || premiums.length === 0) {
            return sendBadRequestResponse(res, "No premiums found", []);
        }

        res.status(200).json({
            success: true,
            message: "All premium plans fetched successfully",
            premiums
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get premium plan by ID (Admin Only)
export const getPremiumById = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return ThrowError(res, 403, "Access denied. Admins only.");
        }
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return ThrowError(res, 400, 'Invalid Premium ID format');
        }
        const premium = await Premium.findById(id);
        if (!premium) {
            return ThrowError(res, 404, 'Premium plan not found');
        }
        res.status(200).json({
            success: true,
            message: "Premium plan fetched successfully",
            premium
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Update premium plan (Admin Only)
export const updatePremium = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return ThrowError(res, 403, "Access denied. Admins only.");
        }
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return ThrowError(res, 400, 'Invalid Premium ID format');
        }
        const updatedPremium = await Premium.findByIdAndUpdate(
            id,
            { ...req.body },
            { new: true }
        );
        if (!updatedPremium) {
            return ThrowError(res, 404, 'Premium plan not found');
        }
        res.status(200).json({
            success: true,
            message: "Premium plan updated successfully",
            premium: updatedPremium
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Delete premium plan (Admin Only)
export const deletePremium = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return ThrowError(res, 403, "Access denied. Admins only.");
        }
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return ThrowError(res, 400, 'Invalid Premium ID format');
        }
        const premium = await Premium.findByIdAndDelete(id);
        if (!premium) {
            return ThrowError(res, 404, 'Premium plan not found');
        }
        res.status(200).json({
            success: true,
            message: "Premium plan deleted successfully"
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
