import Register from "../models/registerModel.js";
import { ThrowError } from "../utils/ErrorUtils.js"
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer"
import { sendSuccessResponse, sendErrorResponse, sendBadRequestResponse, sendUnauthorizedResponse } from '../utils/ResponseUtils.js';

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

        return sendSuccessResponse(res, "Login successful", {
            id: user._id,
            name: user.name,
            email: user.email,
            token: token,
            role: user.role
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
            return sendBadRequestResponse(res, "Provide Email Id");
        }

        const user = await Register.findOne({ email: email })
        if (!user) {
            return sendErrorResponse(res, 400, "User Not Found");
        }

        const otp = generateOTP();
        user.resetOTP = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000; // valid 10 minutes
        await user.save();

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.MY_GMAIL,
                pass: process.env.MY_PASSWORD,
            },
            tls: { rejectUnauthorized: false },
        });

        const mailOptions = {
            from: process.env.MY_GMAIL,
            to: email,
            subject: "Password Reset OTP",
            text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);
        return sendSuccessResponse(res, "OTP sent successfully to your email");

    } catch (error) {
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

        if (user.resetOTP !== otp || user.otpExpires < Date.now()) {
            return sendBadRequestResponse(res, "Invalid or expired OTP.");
        }

        await user.save();

        return sendSuccessResponse(res, "OTP Submitted successfully.");

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
        user.resetOTP = undefined;
        user.otpExpires = undefined;
        await user.save();

        return sendSuccessResponse(res, "Password reset successfully.", { id: user._id, email: user.email });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Change Password for user
export const changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return sendBadRequestResponse(res, "currentPassword, newPassword, and confirmPassword are required.");
        }

        const user = await Register.findById(id);
        if (!user) {
            return sendErrorResponse(res, 404, "User not found with the provided ID");
        }
        
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return sendBadRequestResponse(res, "Current password is incorrect.");
        }

        if (newPassword === currentPassword) {
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
        return ThrowError(res, 500, error.message);
    }
};

//logoutUser
export const logoutUser = async (req, res) => {
    try {
        return sendSuccessResponse(res, "User logout successfully...✅");
    } catch (error) {
        return sendErrorResponse(res, 400, error.message);
    }
};
