import Register from "../models/registerModel.js";
import { ThrowError } from "../utils/ErrorUtils.js"
import bcrypt from "bcryptjs";
import fs from 'fs';
import path from "path";
import {
    sendSuccessResponse,
    sendErrorResponse,
    sendBadRequestResponse,
    sendNotFoundResponse,
    sendForbiddenResponse,
    sendCreatedResponse
} from '../utils/ResponseUtils.js';

// Create new user
export const createRegister = async (req, res) => {
    try {
        const { name, phone, email, gender, password, confirmed_password, role } = req.body;

        if (!name || !phone || !email || !password || !confirmed_password || !role) {
            return sendBadRequestResponse(res, "All fields are required");
        }

        if (password !== confirmed_password) {
            return sendBadRequestResponse(res, "Passwords do not match");
        }

        // Check for existing user with same email or phone
        const existingUser = await Register.findOne({
            $or: [
                { email: email.toLowerCase() },
                { phone: phone }
            ]
        });

        if (existingUser) {
            return sendBadRequestResponse(res, "Email or phone already registered");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newRegister = await Register.create({
            name,
            phone,
            email: email.toLowerCase(),
            gender,
            password: hashedPassword,
            confirmed_password: hashedPassword,
            role,
            isAdmin: role === 'admin',
            image: null
        });

        return sendCreatedResponse(res, "Registration successful", newRegister);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get single user by ID
export const getRegisterById = async (req, res) => {
    try {
        const { id } = req.params;

        let query = { _id: id };
        if (!req.user.isAdmin && req.user._id.toString() !== id) {
            return sendForbiddenResponse(res, "Access denied. You can only view your own profile.");
        }

        const register = await Register.findOne(query);

        if (!register) {
            return sendNotFoundResponse(res, "User not found");
        }

        return sendSuccessResponse(res, "User retrieved successfully", register);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Update user
export const updateRegister = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, email, gender } = req.body;
        const newImagePath = req.file?.path;

        if (!req.user.isAdmin && req.user._id.toString() !== id) {
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
            return sendNotFoundResponse(res, "User not found");
        }

        if (name) {
            existingUser.name = name;
        }
        if (phone) {
            existingUser.phone = phone;
        }
        if (gender) {
            existingUser.gender = gender;
        }
        if (email) {
            existingUser.email = email;
        }

        if (newImagePath) {
            if (existingUser.image) {
                const oldImagePath = path.resolve(existingUser.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            existingUser.image = newImagePath;
        }

        await existingUser.save();

        return sendSuccessResponse(res, "User updated successfully", existingUser);
    } catch (error) {
        if (req.file) {
            const filePath = path.resolve(req.file.path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        return sendErrorResponse(res, 500, error.message);
    }
};

// Delete user
export const deleteRegister = async (req, res) => {
    try {
        const { id } = req.params;

        const existingUser = await Register.findById(id);
        if (!existingUser) {
            return sendNotFoundResponse(res, "User not found");
        }

        if (existingUser.image) {
            const imagePath = path.resolve(existingUser.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await Register.findByIdAndDelete(id);

        return sendSuccessResponse(res, "User deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getAllUsers = async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return sendForbiddenResponse(res, "Access denied. Only admins can view all users.");
        }

        const users = await Register.find({ role: 'user' });

        if (!users || users.length === 0) {
            return sendSuccessResponse(res, "No users found", []);
        }

        return sendSuccessResponse(res, "Users fetched successfully", users);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
