import Register from "../models/registerModel.js";
import { ThrowError } from "../utils/ErrorUtils.js"
import bcrypt from "bcryptjs";
import fs from 'fs';
import path from "path";
import { sendSuccessResponse, sendErrorResponse, sendBadRequestResponse, sendForbiddenResponse, sendCreatedResponse, sendUnauthorizedResponse } from '../utils/ResponseUtils.js';

// Create new register
export const createRegister = async (req, res) => {
    try {
        const { name, phone, email, password, role } = req.body;

        if (!name || !phone || !email || !password || !role) {
            return sendBadRequestResponse(res, "All fields are required");
        }

        const existingTrainer = await Register.findOne({ email });
        if (existingTrainer) {
            return sendBadRequestResponse(res, "Email already registered");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newRegister = await Register.create({
            name,
            phone,
            email,
            password: hashedPassword,
            role,
            isAdmin: role === 'admin',
            image: null
        });

        return sendCreatedResponse(res, "Registration successful", newRegister);
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};

// Get single register by ID
export const getRegisterById = async (req, res) => {
    try {
        const { id } = req.params;

        let query = { _id: id };
        // Check if user exists and has proper role
        if (!req.user) {
            return sendUnauthorizedResponse(res, "Authentication required");
        }

        // Check if user is admin or accessing their own profile
        const isAdmin = req.user.role === 'admin';
        if (!isAdmin && req.user._id.toString() !== id) {
            return sendForbiddenResponse(res, "Access denied. You can only view your own profile.");
        }

        const register = await Register.findOne(query);

        if (!register) {
            return sendErrorResponse(res, 404, "User not found");
        }

        return sendSuccessResponse(res, "User retrieved successfully", register);
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};

// Update register
export const updateRegister = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, bio, language, role } = req.body;

        if (!req.user || (!req.user.isAdmin && req.user._id.toString() !== id)) {
            return sendForbiddenResponse(res, "Access denied. You can only update your own profile.");
        }

        const existingUser = await Register.findById(id);
        if (!existingUser) {
            if (req.file) {
                const filePath = path.resolve(req.file.path);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            return sendErrorResponse(res, 404, "User not found");
        }

        // Handle image upload
        if (req.file) {
            // Convert the file path to a URL path
            const newImagePath = `/public/images/${path.basename(req.file.path)}`;

            // Delete old image if exists
            if (existingUser.image) {
                const oldImagePath = path.join(process.cwd(), existingUser.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            existingUser.image = newImagePath;
        }

        // Update other fields
        if (name) {
            existingUser.name = name;
        }
        if (bio) {
            existingUser.bio = bio;
        }
        if (language) {
            existingUser.language = language;
        }
        if (role) {
            existingUser.role = role;
            existingUser.isAdmin = role === 'admin';
        }

        await existingUser.save();

        // Return user data without password
        const userResponse = existingUser.toObject();
        delete userResponse.password;

        return sendSuccessResponse(res, "User updated successfully", userResponse);
    } catch (error) {
        if (req.file) {
            const filePath = path.resolve(req.file.path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        return ThrowError(res, 500, error.message)
    }
};

// Delete register
export const deleteRegister = async (req, res) => {
    try {
        const { id } = req.params;

        const existingTrainer = await Register.findById(id);
        if (!existingTrainer) {
            return sendErrorResponse(res, 404, "Member not found");
        }

        if (existingTrainer.trainer_image) {
            const imagePath = path.resolve(existingTrainer.trainer_image);

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await Register.findByIdAndDelete(id);

        return sendSuccessResponse(res, "Member deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};


export const getAllMembers = async (req, res) => {
    try {
        // --- Access Control: Only allow trainers to view all members ---
        if (!req.trainer.isAdmin) {
            // If the logged-in register is NOT an admin (i.e., they are a member),
            // they are forbidden from accessing this list.
            return sendForbiddenResponse(res, "Access denied. Only trainers can view all members.");
        }
        // ---------------------------------------------------------------

        // Find all registers where the 'role' field is 'member'
        const members = await Register.find({ role: 'member' });

        // Check if any members were found
        if (!members || members.length === 0) {
            return sendSuccessResponse(res, "No members found", []);
        }

        // Send a success response with the fetched members
        return sendSuccessResponse(res, "Members fetched successfully", members);

    } catch (error) {
        // Handle any errors that occur during the process
        // (e.g., database connection issues, server errors)
        return ThrowError(res, 500, error.message)
    }
};