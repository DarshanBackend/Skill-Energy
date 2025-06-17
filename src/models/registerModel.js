import mongoose from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs";

const registerSchema = mongoose.Schema({
    name: {
        type: String
    },
    phone: {
        type: String
    },
    email: {
        type: String
    },
    gender: {
        type: String,
        enum: ["male", "female", "other"]
    },
    password: {
        type: String
    },
    confirmed_password: {
        type: String
    },
    image: {
        type: String
    },
    role: {
        type: String,
        enum: ["admin", "user"]
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    resetOTP: {
        type: Number
    },
    otpExpires: {
        type: Date
    },
    planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Premium"
    },
    isSubscribed: {
        type: Boolean,
        default: false
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    planStatus: {
        type: String,
        enum: ["Active", "Expired", "No Subscription"],
        default: "No Subscription"
    },

})

registerSchema.methods.getJWT = async function () {
    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }

        const token = jwt.sign(
            { _id: this._id },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h",
                issuer: 'dance-fitme',
                audience: 'dance-fitme-users'
            }
        );

        return token;
    } catch (error) {
        console.error('Error generating JWT:', error);
        throw error;
    }
};

registerSchema.methods.validatePassword = async function (passwordInputByUser) {
    try {
        const isPasswordValid = await bcrypt.compare(
            passwordInputByUser,
            this.password
        );
        return isPasswordValid;
    } catch (error) {
        console.error('Error validating password:', error);
        throw error;
    }
};

export default mongoose.model("Register", registerSchema)