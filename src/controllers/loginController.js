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
            console.log("❌ No email provided");
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address",
                result: []
            });
        }

        const cleanEmail = email.toLowerCase().trim();
        console.log("📧 Searching for user with email:", cleanEmail);

        const user = await Register.findOne({ 
            email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') }
        }).lean();

        console.log("👤 User found:", !!user);

        if (!user) {
            console.log("ℹ️ User not found, returning generic success");
            return res.status(200).json({
                success: true,
                message: "If the email exists, OTP will be sent",
                result: []
            });
        }

        // ✅ Generate OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        console.log("🔑 Generated OTP:", otp);

        // ✅ Update user
        await Register.updateOne({ email: user.email }, { otp, otpExpiry });
        console.log("💾 OTP saved to database for:", user.email);

        // ✅ Email configuration
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.MY_GMAIL,
                pass: process.env.MY_PASSWORD,
            },
        });

        console.log("🔄 Attempting to send email to:", user.email);

        const mailOptions = {
            from: `"Skill Energy" <${process.env.MY_GMAIL}>`,
            to: user.email,
            subject: "🔐 Password Reset OTP",
            html: `
                <div style="font-family:sans-serif;line-height:1.5">
                    <h2>Forgot Password Request</h2>
                    <p>Hello <b>${user.name || "User"}</b>,</p>
                    <p>Your One-Time Password (OTP) for password reset is:</p>
                    <h1 style="color:#1a73e8;letter-spacing:4px">${otp}</h1>
                    <p>This OTP is valid for <b>10 minutes</b>. Please do not share it with anyone.</p>
                    <br />
                    <p>Best Regards,</p>
                    <p><b>Skill Energy Team</b></p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully to:", user.email);
        
        // ✅ SUCCESS - Return response
        console.log("🎯 Returning success response to client");
        return res.status(200).json({
            success: true,
            message: "If the email exists, OTP will be sent",
            result: []
        });

    } catch (error) {
        console.error("❌ Forgot Password Error:", error);
        console.error("📝 Error stack:", error.stack);
        console.error("🔍 Error code:", error.code);
        
        // Return generic error for security
        return res.status(500).json({
            success: false,
            message: "Unable to process request. Please try again later.",
            result: []
        });
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
