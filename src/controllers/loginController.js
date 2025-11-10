import Register from "../models/registerModel.js";
import { ThrowError } from "../utils/ErrorUtils.js"
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer"
import jwt from "jsonwebtoken";
import { sendSuccessResponse, sendErrorResponse, sendBadRequestResponse, sendUnauthorizedResponse } from '../utils/ResponseUtils.js';
import dotenv from "dotenv";
dotenv.config();

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return sendBadRequestResponse(res, "Email and password are required");
        }

        const user = await Register.findOne({ email: email.toLowerCase() });
        if (!user) {
            return sendErrorResponse(res, 404, "User not found");
        }

        // Validate password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return sendUnauthorizedResponse(res, "Invalid password");
        }

        // Generate JWT token
        const token = await user.getJWT();
        if (!token) {
            return sendErrorResponse(res, 500, "Failed to generate token");
        }

        // Return user data with role and isAdmin status
        return sendSuccessResponse(res, "Login successful", {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role || 'user',
            isAdmin: user.role === 'admin',
            token: token
        });
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
};

//forgot password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return sendBadRequestResponse(res, "Email is required");
        }

        // Check user existence
        const user = await Register.findOne({ email });
        if (!user) {
            return sendErrorResponse(res, 404, "User not found");
        }

        // Generate & save OTP
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.MY_GMAIL,
                pass: process.env.MY_PASSWORD,
            },
        });

        // Mail options
        const mailOptions = {
            from: `"Skill Energy" <${process.env.MY_GMAIL}>`,
            to: email,
            subject: "Password Reset OTP",
            text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
        };

        // Send email
        await transporter.sendMail(mailOptions);
        console.log(`✅ OTP sent successfully to ${email}`);

        return sendSuccessResponse(res, "OTP sent successfully to your email");

    } catch (error) {
        console.error("❌ Forgot Password Error:", error.message);
        return ThrowError(res, 500, error.message);
    }
};

//Verify Email
export const VerifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return sendBadRequestResponse(res, "Please provide email and OTP.");
        }

        const user = await Register.findOne({ email: email });
        if (!user) {
            return sendErrorResponse(res, 404, "User not found.");
        }

        // Check if OTP exists and is not expired
        if (!user.otp || !user.otpExpiry) {
            return sendBadRequestResponse(res, "No OTP found. Please request a new OTP.");
        }

        if (user.otp !== otp) {
            return sendBadRequestResponse(res, "Invalid OTP.");
        }

        if (user.otpExpiry < Date.now()) {
            return sendBadRequestResponse(res, "OTP has expired. Please request a new OTP.");
        }

        await user.save();

        return sendSuccessResponse(res, "OTP verified successfully.");

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Reset Password using OTP
export const resetPassword = async (req, res) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;
        if (!newPassword || !confirmPassword) {
            return sendBadRequestResponse(res, "Please provide email, newpassword and confirmpassword.");
        }

        const user = await Register.findOne({ email: email });
        if (!user) {
            return sendErrorResponse(res, 400, "User Not Found");
        }

        if (!(newPassword === confirmPassword)) {
            return sendBadRequestResponse(res, "Please check newpassword and confirmpassword.");
        }

        await Register.findOne({ password: newPassword });
        user.password = await bcrypt.hash(newPassword, 10);
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        return sendSuccessResponse(res, "Password reset successfully.", { id: user._id, email: user.email });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Change Password for user
export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;

        if (!oldPassword || !newPassword || !confirmPassword) {
            return sendBadRequestResponse(res, "oldPassword, newPassword, and confirmPassword are required.");
        }

        // Get user from the authenticated request
        const user = await Register.findById(req.user._id);
        if (!user) {
            return sendErrorResponse(res, 404, "User not found");
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return sendBadRequestResponse(res, "Current password is incorrect.");
        }

        if (newPassword === oldPassword) {
            return sendBadRequestResponse(res, "New password cannot be the same as current password.");
        }

        if (newPassword !== confirmPassword) {
            return sendBadRequestResponse(res, "New password and confirm password do not match.");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        return sendSuccessResponse(res, "Password changed successfully.");

    } catch (error) {
        return sendErrorResponse(res, 500, error.message);
    }
};

export const googleLogin = async (req, res) => {
    try {
        const { uid, name, email, image } = req.body;

        if (!uid || !name || !email || !image) {
            return res.status(400).json({
                success: false,
                message: "uid, name, email & image are required!"
            });
        }

        // Try to find existing user
        let user = await Register.findOne({ email });
        let isNewUser = false;

        if (user) {
            // Update user info if it changed
            const updatedFields = {};
            if (user.name !== name) updatedFields.name = name;
            if (user.image !== image) updatedFields.image = image;
            if (user.googleId !== uid) updatedFields.googleId = uid;

            if (Object.keys(updatedFields).length > 0) {
                user = await Register.findByIdAndUpdate(user._id, updatedFields, { new: true });
            }
        } else {
            // Create new user
            user = await Register.create({
                googleId: uid,
                name,
                email,
                image,
                verified: true
            });
            isNewUser = true;
        }

        // Generate JWT token
        const payload = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role || 'user',
            isAdmin: user.role === 'admin'
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

        return res.status(isNewUser ? 201 : 200).json({
            success: true,
            message: isNewUser
                ? "New social login & registration successful"
                : "Login successful",
            user,
            token
        });

    } catch (error) {
        console.error("Google Login Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Error while logging in with Google",
            error: error.message
        });
    }
};

//logoutUser
// export const logoutUser = async (req, res) => {
//     try {
//         res.cookie("token", null, {
//             expires: new Date(Date.now()),
//             httpOnly: true,
//             path: "/"
//         });
//         return sendSuccessResponse(res, "User logout successfully...✅");
//     } catch (error) {
//         return sendErrorResponse(res, 400, error.message);
//     }
// };
