import Register from "../models/registerModel.js";
import { ThrowError } from "../utils/ErrorUtils.js"
import bcrypt from "bcryptjs";
import { sendSuccessResponse, sendErrorResponse, sendBadRequestResponse, sendForbiddenResponse, sendCreatedResponse, sendUnauthorizedResponse } from '../utils/ResponseUtils.js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// 🛠 S3 Client Configuration
const s3 = new S3Client({
    region: process.env.S3_REGION || 'ap-south-1',
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
    const region = process.env.S3_REGION || 'ap-south-1';
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

// ➕ Create new register (UNCHANGED - No file upload)
export const createRegister = async (req, res) => {
    try {
        const { name, phone, email, password, role } = req.body;

        if (!name || !phone || !email || !password || !role) {
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

        // 🚨 BUG FIX: Generate token for newRegister, not existingTrainer
        const token = await newRegister.getJWT();
        if (!token) {
            return sendErrorResponse(res, 500, "Failed to generate token");
        }

        // Remove password from response for security
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

// 🔍 Get single register by ID (UNCHANGED)
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

        // Fetch wishlist and populate courses
        const Wishlist = (await import('../models/wishlistModel.js')).default;
        const wishlistDoc = await Wishlist.findOne({ userId: id }).populate('courses');
        const wishlistCourses = wishlistDoc ? wishlistDoc.courses : [];

        // Prepare user response
        const userResponse = register.toObject();
        delete userResponse.password;
        userResponse.wishlist = wishlistCourses;

        return sendSuccessResponse(res, "User retrieved successfully", userResponse);
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};

// ✏️ Update profile only user - UPDATED FOR S3
export const updateProfileUser = async (req, res) => {
    // Support different upload scenarios
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

        // 🆕 Handle S3 image upload
        if (uploaded?.key) {
            // Delete old image from S3 if exists
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
                    // Continue with update even if old image deletion fails
                }
            }

            // Update with new image
            existingUser.image = publicUrlForKey(uploaded.key);
            existingUser.image_key = uploaded.key;
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
        await cleanupUploadedIfAny(uploaded);
        return ThrowError(res, 500, error.message)
    }
};

// ✏️ Update profile only Admin - UPDATED FOR S3
export const updateProfileAdmin = async (req, res) => {
    // Support different upload scenarios
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

        // 🆕 Handle S3 image upload
        if (uploaded?.key) {
            // Delete old image from S3 if exists
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
                    // Continue with update even if old image deletion fails
                }
            }

            // Update with new image
            existingAdmin.image = publicUrlForKey(uploaded.key);
            existingAdmin.image_key = uploaded.key;
        }

        // Update other fields
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

        // Return Admin data without password
        const adminResponse = existingAdmin.toObject();
        delete adminResponse.password;

        return sendSuccessResponse(res, "Admin updated successfully", adminResponse);
    } catch (error) {
        await cleanupUploadedIfAny(uploaded);
        return ThrowError(res, 500, error.message)
    }
};

// 🗑 Delete register - UPDATED FOR S3
export const deleteRegister = async (req, res) => {
    try {
        const { id } = req.params;

        const existingTrainer = await Register.findById(id);
        if (!existingTrainer) {
            return sendErrorResponse(res, 404, "Member not found");
        }

        // 🆕 Delete image from S3 if exists
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
                // Continue with deletion even if image deletion fails
            }
        }

        await Register.findByIdAndDelete(id);

        return sendSuccessResponse(res, "Member deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};

// 📋 Get all users (admin only) - UNCHANGED
export const getAllUsers = async (req, res) => {
    try {
        // Check if user is authenticated and is admin
        if (!req.user) {
            return sendUnauthorizedResponse(res, "Authentication required");
        }

        if (!req.user.isAdmin) {
            return sendForbiddenResponse(res, "Access denied. Only admins can view all users.");
        }

        // Find all users with role 'user'
        const users = await Register.find({ role: 'user' }).select('-password');

        // Check if any users were found
        if (!users || users.length === 0) {
            return sendSuccessResponse(res, "No users found", []);
        }

        // Send a success response with the fetched users
        return sendSuccessResponse(res, "Users fetched successfully", users);

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};