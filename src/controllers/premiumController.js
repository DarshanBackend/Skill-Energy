import Premium from '../models/premiumModel.js';
import { ThrowError } from '../utils/ErrorUtils.js';
import {
    sendSuccessResponse,
    sendBadRequestResponse,
    sendNotFoundResponse,
    sendCreatedResponse
} from '../utils/ResponseUtils.js';

import mongoose from 'mongoose';

// Create a new premium plan
export const createPremiumPlan = async (req, res) => {
    try {
        const { type, price, duration, isActive } = req.body;

        if (!type || !price || !duration) {
            return sendBadRequestResponse(res, "All fields (type, price, duration) are required.");
        }

        const existingPlan = await Premium.findOne({ type, duration });
        if (existingPlan) {
            return sendBadRequestResponse(res, "A premium plan with this type and duration already exists.");
        }

        const newPlan = await Premium.create({
            type,
            price,
            duration,
            isActive: isActive !== undefined ? isActive : true

        });

        return sendCreatedResponse(res, "Premium plan created successfully.", newPlan);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get all premium plans
export const getAllPremiumPlans = async (req, res) => {
    try {
        const plans = await Premium.find();
        if (!plans || plans.length === 0) {
            return sendNotFoundResponse(res, "No premium plans found.");
        }
        return sendSuccessResponse(res, "Premium plans retrieved successfully.", plans);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get a single premium plan by ID
export const getPremiumPlanById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid premium plan ID format.");
        }

        const plan = await Premium.findById(id);
        if (!plan) {
            return sendNotFoundResponse(res, "Premium plan not found.");
        }
        return sendSuccessResponse(res, "Premium plan retrieved successfully.", plan);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Update a premium plan
export const updatePremiumPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, price, duration } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid premium plan ID format.");
        }

        const updatedPlan = await Premium.findByIdAndUpdate(
            id,
            { type, price, duration },
            { new: true, runValidators: true }
        );

        if (!updatedPlan) {
            return sendNotFoundResponse(res, "Premium plan not found.");
        }
        return sendSuccessResponse(res, "Premium plan updated successfully.", updatedPlan);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Delete a premium plan
export const deletePremiumPlan = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid premium plan ID format.");
        }

        const deletedPlan = await Premium.findByIdAndDelete(id);
        if (!deletedPlan) {
            return sendNotFoundResponse(res, "Premium plan not found.");
        }
        return sendSuccessResponse(res, "Premium plan deleted successfully.", null);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
