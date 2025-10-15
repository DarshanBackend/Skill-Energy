import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import Company from "../models/companyModel.js";
import { sendSuccessResponse, sendErrorResponse, sendBadRequestResponse, sendForbiddenResponse, sendCreatedResponse, sendUnauthorizedResponse } from '../utils/ResponseUtils.js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// 🛠 S3 Client Configuration
const s3 = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY.trim(),
        secretAccessKey: process.env.S3_SECRET_KEY.trim(),
    },
});

// 🌐 Build public URL for S3 objects
const publicUrlForKey = (key) => {
    const cdn = process.env.CDN_BASE_URL?.replace(/\/$/, '');
    if (cdn) return `${cdn}/${key}`;
    const bucket = process.env.S3_BUCKET_NAME;
    const region = process.env.S3_REGION || 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`;
};

// 🗑 Cleanup uploaded S3 object in case of errors
const cleanupUploadedIfAny = async (file) => {
    if (file?.key) {
        try {
            await s3.send(
                new DeleteObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: file.key,
                })
            );
        } catch (e) {
            console.error('S3 cleanup failed:', e.message);
        }
    }
};

// ➕ Add new company (Admin only) - UPDATED FOR S3
export const addCompany = async (req, res) => {
    // Support different upload scenarios
    const pickUploaded = () => {
        if (req.file) return req.file;
        if (req.files?.companyImage?.[0]) return req.files.companyImage[0];
        if (req.files?.image?.[0]) return req.files.image[0];
        return null;
    };

    const uploaded = pickUploaded();

    try {
        const { companyName, status } = req.body;

        if (!companyName) {
            await cleanupUploadedIfAny(uploaded);
            return sendBadRequestResponse(res, "Company name is required");
        }

        // Check if company already exists
        const existingCompany = await Company.findOne({ companyName });
        if (existingCompany) {
            await cleanupUploadedIfAny(uploaded);
            return sendBadRequestResponse(res, "Company with this name already exists");
        }

        // 🆕 Handle S3 image upload
        let companyImage = null;
        let companyImage_key = null;
        if (uploaded?.key) {
            companyImage = publicUrlForKey(uploaded.key);
            companyImage_key = uploaded.key;
        }

        const newCompany = await Company.create({
            companyName,
            status: status || 'active',
            companyImage,
            companyImage_key // Store S3 key for future deletion
        });

        return sendCreatedResponse(res, "Company added successfully", newCompany);
    } catch (error) {
        await cleanupUploadedIfAny(uploaded);
        return ThrowError(res, 500, error.message);
    }
};

// 📋 Get all companies (UNCHANGED)
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

// 🔍 Get company by ID (UNCHANGED)
export const getCompanyById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid company ID");
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

// ✏️ Update company (Admin only) - UPDATED FOR S3
export const updateCompany = async (req, res) => {
    const pickUploaded = () => {
        if (req.file) return req.file;
        if (req.files?.companyImage?.[0]) return req.files.companyImage[0];
        if (req.files?.image?.[0]) return req.files.image[0];
        return null;
    };

    const uploaded = pickUploaded();

    try {
        const { id } = req.params;
        const { companyName, status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            await cleanupUploadedIfAny(uploaded);
            return sendBadRequestResponse(res, "Invalid company ID");
        }

        const existingCompany = await Company.findById(id);
        if (!existingCompany) {
            await cleanupUploadedIfAny(uploaded);
            return sendErrorResponse(res, 404, "Company not found");
        }

        // Check if company name is being changed and if it already exists
        if (companyName && companyName !== existingCompany.companyName) {
            const companyWithSameName = await Company.findOne({
                companyName,
                _id: { $ne: id }
            });
            if (companyWithSameName) {
                await cleanupUploadedIfAny(uploaded);
                return sendBadRequestResponse(res, "Company with this name already exists");
            }
        }

        // 🆕 Handle S3 image upload
        if (uploaded?.key) {
            // Delete old image from S3 if exists
            if (existingCompany.companyImage_key) {
                try {
                    await s3.send(
                        new DeleteObjectCommand({
                            Bucket: process.env.S3_BUCKET_NAME,
                            Key: existingCompany.companyImage_key,
                        })
                    );
                } catch (error) {
                    console.error('Error deleting old image from S3:', error.message);
                    // Continue with update even if old image deletion fails
                }
            }

            // Update with new image
            existingCompany.companyImage = publicUrlForKey(uploaded.key);
            existingCompany.companyImage_key = uploaded.key;
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
        await cleanupUploadedIfAny(uploaded);
        return ThrowError(res, 500, error.message);
    }
};

// 🗑 Delete company (Admin only) - UPDATED FOR S3
export const deleteCompany = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid company ID");
        }

        const existingCompany = await Company.findById(id);
        if (!existingCompany) {
            return sendErrorResponse(res, 404, "Company not found");
        }

        // 🆕 Delete company image from S3 if exists
        if (existingCompany.companyImage_key) {
            try {
                await s3.send(
                    new DeleteObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: existingCompany.companyImage_key,
                    })
                );
            } catch (error) {
                console.error('Error deleting image from S3:', error.message);
                // Continue with deletion even if image deletion fails
            }
        }

        await Company.findByIdAndDelete(id);

        return sendSuccessResponse(res, "Company deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};