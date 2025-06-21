import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import Language from "../models/languageModel.js";
import { sendSuccessResponse, sendErrorResponse, sendBadRequestResponse, sendCreatedResponse } from '../utils/ResponseUtils.js';

// Add new language (Admin only)
export const addLanguage = async (req, res) => {
    try {
        const { language } = req.body;

        if (!language) {
            return sendBadRequestResponse(res, "Language is required");
        }

        const existingLanguage = await Language.findOne({ language });
        if (existingLanguage) {
            return sendBadRequestResponse(res, "This language already exists");
        }

        const newLanguage = await Language.create({ language });

        return sendCreatedResponse(res, "Language added successfully", newLanguage);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get all languages
export const getAllLanguages = async (req, res) => {
    try {
        const languages = await Language.find().sort({ language: 1 });

        if (!languages.length) {
            return sendSuccessResponse(res, "No languages found", []);
        }

        return sendSuccessResponse(res, "Languages fetched successfully", languages);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get language by ID
export const getLanguageById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid language ID");
        }

        const language = await Language.findById(id);
        if (!language) {
            return sendErrorResponse(res, 404, "Language not found");
        }

        return sendSuccessResponse(res, "Language retrieved successfully", language);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Update language (Admin only)
export const updateLanguage = async (req, res) => {
    try {
        const { id } = req.params;
        const { language } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid language ID");
        }

        if (!language) {
            return sendBadRequestResponse(res, "Language is required");
        }

        const existingLanguage = await Language.findOne({ language, _id: { $ne: id } });
        if (existingLanguage) {
            return sendBadRequestResponse(res, "This language already exists");
        }

        const updatedLanguage = await Language.findByIdAndUpdate(id, { language }, { new: true });

        if (!updatedLanguage) {
            return sendErrorResponse(res, 404, "Language not found");
        }

        return sendSuccessResponse(res, "Language updated successfully", updatedLanguage);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Delete language (Admin only)
export const deleteLanguage = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid language ID");
        }

        const language = await Language.findByIdAndDelete(id);

        if (!language) {
            return sendErrorResponse(res, 404, "Language not found");
        }

        return sendSuccessResponse(res, "Language deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
}; 