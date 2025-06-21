import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import Company from "../models/companyModel.js";
import { sendSuccessResponse, sendErrorResponse, sendBadRequestResponse, sendForbiddenResponse, sendCreatedResponse, sendUnauthorizedResponse } from '../utils/ResponseUtils.js';
import fs from 'fs';
import path from "path";



// add new company (Admin only)
export const addCompany = async (req, res) => {
    try {
        const { companyName, status } = req.body;

        if (!companyName) {
            // Clean up uploaded file if validation fails
            if (req.file) {
                const filePath = path.resolve(req.file.path);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            return sendBadRequestResponse(res, "Company name is required");
        }

        // Check if company already exists
        const existingCompany = await Company.findOne({ companyName });
        if (existingCompany) {
            // Clean up uploaded file if company already exists
            if (req.file) {
                const filePath = path.resolve(req.file.path);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            return sendBadRequestResponse(res, "Company with this name already exists");
        }

        // Handle image upload
        let companyImage = null;
        if (req.file) {
            companyImage = `/public/companyImage/${path.basename(req.file.path)}`;
        }

        const newCompany = await Company.create({
            companyName,
            status: status || 'active',
            companyImage
        });

        return sendCreatedResponse(res, "Company add successfully", newCompany);
    } catch (error) {
        // Clean up uploaded file if any error occurs
        if (req.file) {
            const filePath = path.resolve(req.file.path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        return ThrowError(res, 500, error.message);
    }
};

// Get all companies
export const getAllCompanies = async (req, res) => {
    try {
        const companies = await Company.find().sort({ createdAt: -1 });

        if (!companies || companies.length === 0) {
            return sendSuccessResponse(res, "No companies found", []);
        }

        return sendSuccessResponse(res, "Companies fetched successfully", companies);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get company by ID
export const getCompanyById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid course ID");
        }

        const company = await Company.findById(id);
        if (!company) {
            return sendErrorResponse(res, 404, "Company not found");
        }

        return sendSuccessResponse(res, "Company retrieved successfully", company);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Update company (Admin only)
export const updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyName, status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid course ID");
        }

        const existingCompany = await Company.findById(id);
        if (!existingCompany) {
            if (req.file) {
                const filePath = path.resolve(req.file.path);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            return sendErrorResponse(res, 404, "Company not found");
        }

        // Check if company name is being changed and if it already exists
        if (companyName && companyName !== existingCompany.companyName) {
            const companyWithSameName = await Company.findOne({
                companyName,
                _id: { $ne: id }
            });
            if (companyWithSameName) {
                if (req.file) {
                    const filePath = path.resolve(req.file.path);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
                return sendBadRequestResponse(res, "Company with this name already exists");
            }
        }

        // Handle image upload
        if (req.file) {
            // Convert the file path to a URL path
            const newImagePath = `/public/companyImage/${path.basename(req.file.path)}`;

            // Delete old image if exists
            if (existingCompany.companyImage) {
                const oldImagePath = path.join(process.cwd(), existingCompany.companyImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            existingCompany.companyImage = newImagePath;
        }

        // Update other fields
        if (companyName) {
            existingCompany.companyName = companyName;
        }
        if (status) {
            existingCompany.status = status;
        }

        await existingCompany.save();

        return sendSuccessResponse(res, "Company updated successfully", existingCompany);
    } catch (error) {
        if (req.file) {
            const filePath = path.resolve(req.file.path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        return ThrowError(res, 500, error.message);
    }
};

// Delete company (Admin only)
export const deleteCompany = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid course ID");
        }

        const existingCompany = await Company.findById(id);
        if (!existingCompany) {
            return sendErrorResponse(res, 404, "Company not found");
        }

        // Delete company image if exists
        if (existingCompany.companyImage) {
            const imagePath = path.join(process.cwd(), existingCompany.companyImage);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await Company.findByIdAndDelete(id);

        return sendSuccessResponse(res, "Company deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

