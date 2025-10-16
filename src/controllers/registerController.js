import Register from "../models/registerModel.js";
import { ThrowError } from "../utils/ErrorUtils.js"
import bcrypt from "bcryptjs";
import { sendSuccessResponse, sendErrorResponse, sendBadRequestResponse, sendForbiddenResponse, sendCreatedResponse, sendUnauthorizedResponse } from '../utils/ResponseUtils.js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
    region: process.env.S3_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY.trim(),
        secretAccessKey: process.env.S3_SECRET_KEY.trim()
    },
    forcePathStyle: false,
    endpoint: `https://s3.${process.env.S3_REGION || 'ap-south-1'}.amazonaws.com`
});

const publicUrlForKey = (key) => {
    const bucket = process.env.S3_BUCKET_NAME;
    const region = process.env.S3_REGION || 'ap-south-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

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

export const createRegister = async (req, res) => {
    try {
        const { name, phone, email, password, role } = req.body;

        if (!name || !phone || !email || !password) {
            return sendBadRequestResponse(res, "All fields are required");
        }

        const existingTrainer = await Register.findOne({
            $or: [
                { email: email.toLowerCase() },
                { phone: phone }
            ]
        });
        if (existingTrainer) {
            return sendBadRequestResponse(res, "Email or phone already registered");
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

        const token = await newRegister.getJWT();
        if (!token) {
            return sendErrorResponse(res, 500, "Failed to generate token");
        }

        const userResponse = newRegister.toObject();
        delete userResponse.password;

        return sendCreatedResponse(res, "Registration successful", {
            user: userResponse,
            token
        });
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};

export const getRegisterById = async (req, res) => {
    try {
        const { id } = req.params;

        let query = { _id: id };
        if (!req.user) {
            return sendUnauthorizedResponse(res, "Authentication required");
        }

        const isAdmin = req.user.role === 'admin';
        if (!isAdmin && req.user._id.toString() !== id) {
            return sendForbiddenResponse(res, "Access denied. You can only view your own profile.");
        }

        const register = await Register.findOne(query);
        if (!register) {
            return sendErrorResponse(res, 404, "User not found");
        }

        const Wishlist = (await import('../models/wishlistModel.js')).default;
        const wishlistDoc = await Wishlist.findOne({ userId: id }).populate('courses');
        const wishlistCourses = wishlistDoc ? wishlistDoc.courses : [];

        const userResponse = register.toObject();
        delete userResponse.password;
        userResponse.wishlist = wishlistCourses;

        return sendSuccessResponse(res, "User retrieved successfully", userResponse);
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};

export const updateProfileUser = async (req, res) => {
    const pickUploaded = () => {
        if (req.file) return req.file;
        if (req.files?.image?.[0]) return req.files.image[0];
        if (req.files?.profileImage?.[0]) return req.files.profileImage[0];
        return null;
    };

    const uploaded = pickUploaded();

    try {
        const { id } = req.params;
        const { name, bio, language, role } = req.body;

        if (!req.user || (!req.user.isAdmin && req.user._id.toString() !== id)) {
            await cleanupUploadedIfAny(uploaded);
            return sendForbiddenResponse(res, "Access denied. You can only update your own profile.");
        }

        const existingUser = await Register.findById(id);
        if (!existingUser) {
            await cleanupUploadedIfAny(uploaded);
            return sendErrorResponse(res, 404, "User not found");
        }

        if (uploaded?.key) {
            if (existingUser.image_key) {
                try {
                    await s3.send(
                        new DeleteObjectCommand({
                            Bucket: process.env.S3_BUCKET_NAME,
                            Key: existingUser.image_key,
                        })
                    );
                } catch (error) {
                    console.error('Error deleting old image from S3:', error.message);
                }
            }

            existingUser.image = publicUrlForKey(uploaded.key);
            existingUser.image_key = uploaded.key;
        }

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

        const userResponse = existingUser.toObject();
        delete userResponse.password;

        return sendSuccessResponse(res, "User updated successfully", userResponse);
    } catch (error) {
        await cleanupUploadedIfAny(uploaded);
        return ThrowError(res, 500, error.message)
    }
};

export const updateProfileAdmin = async (req, res) => {
    const pickUploaded = () => {
        if (req.file) return req.file;
        if (req.files?.image?.[0]) return req.files.image[0];
        if (req.files?.profileImage?.[0]) return req.files.profileImage[0];
        return null;
    };

    const uploaded = pickUploaded();

    try {
        const { id } = req.params;
        const { firstName, lastName, email, phone, role } = req.body;

        if (!req.user || (!req.user.isAdmin && req.user._id.toString() !== id)) {
            await cleanupUploadedIfAny(uploaded);
            return sendForbiddenResponse(res, "Access denied. You can only update your own profile.");
        }

        const existingAdmin = await Register.findById(id);
        if (!existingAdmin) {
            await cleanupUploadedIfAny(uploaded);
            return sendErrorResponse(res, 404, "Admin not found");
        }

        if (uploaded?.key) {
            if (existingAdmin.image_key) {
                try {
                    await s3.send(
                        new DeleteObjectCommand({
                            Bucket: process.env.S3_BUCKET_NAME,
                            Key: existingAdmin.image_key,
                        })
                    );
                } catch (error) {
                    console.error('Error deleting old image from S3:', error.message);
                }
            }

            existingAdmin.image = publicUrlForKey(uploaded.key);
            existingAdmin.image_key = uploaded.key;
        }

        if (firstName) {
            existingAdmin.firstName = firstName;
        }
        if (lastName) {
            existingAdmin.lastName = lastName;
        }
        if (email) {
            existingAdmin.email = email;
        }
        if (phone) {
            existingAdmin.phone = phone;
        }
        if (role) {
            existingAdmin.role = role;
            existingAdmin.isAdmin = role === 'admin';
        }

        await existingAdmin.save();

        const adminResponse = existingAdmin.toObject();
        delete adminResponse.password;

        return sendSuccessResponse(res, "Admin updated successfully", adminResponse);
    } catch (error) {
        await cleanupUploadedIfAny(uploaded);
        return ThrowError(res, 500, error.message)
    }
};

export const deleteRegister = async (req, res) => {
    try {
        const { id } = req.params;

        const existingTrainer = await Register.findById(id);
        if (!existingTrainer) {
            return sendErrorResponse(res, 404, "Member not found");
        }

        if (existingTrainer.image_key) {
            try {
                await s3.send(
                    new DeleteObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: existingTrainer.image_key,
                    })
                );
            } catch (error) {
                console.error('Error deleting image from S3:', error.message);
            }
        }

        await Register.findByIdAndDelete(id);

        return sendSuccessResponse(res, "Member deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};

export const getAllUsers = async (req, res) => {
    try {
        if (!req.user) {
            return sendUnauthorizedResponse(res, "Authentication required");
        }

        if (!req.user.isAdmin) {
            return sendForbiddenResponse(res, "Access denied. Only admins can view all users.");
        }

        const users = await Register.find({ role: 'user' }).select('-password');

        if (!users || users.length === 0) {
            return sendSuccessResponse(res, "No users found", []);
        }

        return sendSuccessResponse(res, "Users fetched successfully", users);

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};