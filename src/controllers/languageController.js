import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import Language from "../models/languageModel.js";
import { sendSuccessResponse, sendErrorResponse, sendBadRequestResponse, sendCreatedResponse } from '../utils/ResponseUtils.js';
import path from 'path';
import fs from 'fs';

// Add new language (Admin only)
export const addLanguage = async (req, res) => {
    try {
        const { language } = req.body;

        if (!language) {
            // Clean up uploaded image if validation fails
            if (req.file) {
                const imgPath = path.resolve(req.file.path);
                if (fs.existsSync(imgPath)) {
                    fs.unlinkSync(imgPath);
                }
            }
            return sendBadRequestResponse(res, "Language is required");
        }

        const existingLanguage = await Language.findOne({ language });
        if (existingLanguage) {
            // Clean up uploaded image if duplicate
            if (req.file) {
                const imgPath = path.resolve(req.file.path);
                if (fs.existsSync(imgPath)) {
                    fs.unlinkSync(imgPath);
                }
            }
            return sendBadRequestResponse(res, "This language already exists");
        }

        let language_thumbnail = '';
        if (req.file) {
            language_thumbnail = req.file.path || req.file.location || '';
        }

        const newLanguage = await Language.create({ language, language_thumbnail });

        return sendCreatedResponse(res, "Language added successfully", newLanguage);
    } catch (error) {
        // Clean up uploaded image if any error occurs
        if (req.file) {
            const imgPath = path.resolve(req.file.path);
            if (fs.existsSync(imgPath)) {
                fs.unlinkSync(imgPath);
            }
        }
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
            // Clean up uploaded image if validation fails
            if (req.file) {
                const imgPath = path.resolve(req.file.path);
                if (fs.existsSync(imgPath)) {
                    fs.unlinkSync(imgPath);
                }
            }
            return sendBadRequestResponse(res, "Invalid language ID");
        }

        if (!language) {
            // Clean up uploaded image if validation fails
            if (req.file) {
                const imgPath = path.resolve(req.file.path);
                if (fs.existsSync(imgPath)) {
                    fs.unlinkSync(imgPath);
                }
            }
            return sendBadRequestResponse(res, "Language is required");
        }

        const existingLanguage = await Language.findOne({ language, _id: { $ne: id } });
        if (existingLanguage) {
            // Clean up uploaded image if duplicate
            if (req.file) {
                const imgPath = path.resolve(req.file.path);
                if (fs.existsSync(imgPath)) {
                    fs.unlinkSync(imgPath);
                }
            }
            return sendBadRequestResponse(res, "This language already exists");
        }

        const languageDoc = await Language.findById(id);
        if (!languageDoc) {
            // Clean up uploaded image if not found
            if (req.file) {
                const imgPath = path.resolve(req.file.path);
                if (fs.existsSync(imgPath)) {
                    fs.unlinkSync(imgPath);
                }
            }
            return sendErrorResponse(res, 404, "Language not found");
        }

        // If a new thumbnail is uploaded, delete the old file and update the path
        if (req.file) {
            if (languageDoc.language_thumbnail) {
                const oldThumbPath = path.resolve(languageDoc.language_thumbnail);
                if (fs.existsSync(oldThumbPath)) {
                    fs.unlinkSync(oldThumbPath);
                }
            }
            languageDoc.language_thumbnail = req.file.path;
        }

        languageDoc.language = language;
        const updatedLanguage = await languageDoc.save();

        return sendSuccessResponse(res, "Language updated successfully", updatedLanguage);
    } catch (error) {
        // Clean up uploaded image if any error occurs
        if (req.file) {
            const imgPath = path.resolve(req.file.path);
            if (fs.existsSync(imgPath)) {
                fs.unlinkSync(imgPath);
            }
        }
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

        const language = await Language.findById(id);
        if (!language) {
            return sendErrorResponse(res, 404, "Language not found");
        }

        // Delete language image if exists
        if (language.language_thumbnail) {
            const imgPath = path.resolve(language.language_thumbnail);
            if (fs.existsSync(imgPath)) {
                fs.unlinkSync(imgPath);
            }
        }

        await Language.findByIdAndDelete(id);

        return sendSuccessResponse(res, "Language deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
}; 