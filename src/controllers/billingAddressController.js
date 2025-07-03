import mongoose from "mongoose";
import billingAddressModel from "../models/billingAddressModel.js";
import { ThrowError } from "../utils/ErrorUtils.js";
import { sendBadRequestResponse, sendSuccessResponse, sendErrorResponse, sendForbiddenResponse } from "../utils/ResponseUtils.js";

// create billingAddress (User Only)
export const createbilling = async (req, res) => {
    try {
        const { country, state } = req.body;

        if (!country || !state) {
            return sendBadRequestResponse(res, "All fields are required");
        }

        const existing = await billingAddressModel.findOne({ user: req.user._id });
        if (existing) {
            return sendBadRequestResponse(res, "You already have a billing address. Please update it instead.");
        }

        const billingAddress = new billingAddressModel({
            country,
            state,
            user: req.user._id
        });

        const savedbillingAddress = await billingAddress.save();

        res.status(201).json({
            success: true,
            message: "Billing address added successfully",
            userId: req.user._id,
            data: {
                billingAddress: savedbillingAddress,
            }
        });

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// getbillingAddressById (User Only)
export const getBillingAddressById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid billingAddress ID");
        }

        const billingAddress = await billingAddressModel.findById(id);

        if (!billingAddress) {
            return sendErrorResponse(res, 404, "billingAddress not found");
        }

        // Only allow if user is admin or owner of the billing address
        const isAdmin = req.user && req.user.isAdmin;
        const isOwner = req.user && billingAddress.user && billingAddress.user.toString() === req.user._id.toString();

        if (!isAdmin && !isOwner) {
            return sendForbiddenResponse(res, "Access denied. You are not allowed to view this billing address.");
        }

        return sendSuccessResponse(res, "billingAddress retrieved successfully", billingAddress);

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

// getAllbillingAddress (Admin Only)
export const getAllBillingAddress = async (req, res) => {
    try {
        const billingAddress = await billingAddressModel.find();

        if (!billingAddress) {
            return sendErrorResponse(res, 404, "billingAddress not found");
        }

        return sendSuccessResponse(res, "billingAddress retrieved successfully", billingAddress);

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

// Update billingAddress (User Only)
export const updateBillingAddress = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return ThrowError(res, 400, 'Invalid billingAddress ID');
        }
        const updatedbillingAddress = await billingAddressModel.findByIdAndUpdate(
            id,
            { ...req.body },
            { new: true }
        );
        if (!updatedbillingAddress) {
            return ThrowError(res, 404, 'billingAddress not found');
        }
        res.status(200).json({
            success: true,
            message: "billingAddress updated successfully",
            billingAddress: updatedbillingAddress
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Delete billingAddress (User Only)
export const deleteBillingAddress = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return ThrowError(res, 400, 'Invalid billingAddress ID');
        }
        const billingAddress = await billingAddressModel.findByIdAndDelete(id);
        if (!billingAddress) {
            return ThrowError(res, 404, 'billingAddress not found');
        }
        res.status(200).json({
            success: true,
            message: "billingAddress deleted successfully"
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};





