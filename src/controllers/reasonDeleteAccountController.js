import mongoose from 'mongoose';
import ReasonDeleteAccount from '../models/reasonDeleteAccountModel.js';
import registerModel from '../models/registerModel.js';
import { ThrowError } from '../utils/ErrorUtils.js';
import { sendBadRequestResponse } from '../utils/ResponseUtils.js';

// Create reason for cancellation (admin or user)
export const createReasonCancel = async (req, res) => {
    try {
        const { reasonCancel } = req.body;
        const userId = req.user._id;

        const existingReason = await ReasonDeleteAccount.find({ reasonCancel });

        if (existingReason.length > 0) {
            return sendBadRequestResponse(res, "This reason already exists");
        }

        const newReason = new ReasonDeleteAccount({ reasonCancel, user: userId });
        const savedReason = await newReason.save();
        res.status(201).json({
            success: true,
            message: "Reason For Delete Account created successfully",
            data: savedReason,
        });
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};

// Get all reasons for cancellation
export const getAllReasonCancel = async (req, res) => {
    try {
        const reasons = await ReasonDeleteAccount.find().populate('user', 'name email');

        if (!reasons) {
            return sendErrorResponse(res, 404, "No any reasons found");
        }

        res.status(200).json(reasons);
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};

// Get reason by ID
export const getReasonCancelById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return ThrowError(res, 400, "Invalid Reason ID");
        }

        const reason = await ReasonDeleteAccount.findById(req.params.id).populate('user', 'name email');


        if (!reason) {
            return res.status(404).json({
                success: false,
                message: "Reason not found"
            });
        }
        res.status(200).json({
            success: true,
            data: reason
        });
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};

// Update reason
export const updateReasonCancel = async (req, res) => {
    try {
        const { reasonCancel } = req.body;

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return ThrowError(res, 400, "Invalid Reason ID");
        }

        const updatedReason = await ReasonDeleteAccount.findByIdAndUpdate(
            req.params.id,
            { reasonCancel },
            { new: true }
        );
        if (!updatedReason) {
            return res.status(404).json({
                success: false,
                message: "Reason not found"
            });
        }
        res.status(200).json({
            success: true,
            message: "Reason updated successfully",
            data: updatedReason,
        });
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};

// Delete reason
export const deleteReasonCancel = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return ThrowError(res, 400, "Invalid Reason ID");
        }

        const deletedReason = await ReasonDeleteAccount.findByIdAndDelete(req.params.id);

        if (!deletedReason) {
            return res.status(404).json({
                success: false,
                message: "Reason not found"
            });
        }
        res.status(200).json({
            success: true,
            message: "Reason deleted successfully"
        });
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};

// User delete their own account 
export const deleteMyAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        await registerModel.findByIdAndDelete(userId);
        res.status(200).json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};
