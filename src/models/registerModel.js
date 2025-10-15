import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const registerSchema = mongoose.Schema({
    firstName: {
        type: String,
    },
    lastName: {
        type: String
    },
    name: { type: String },
    phone: { type: Number },
    email: { type: String },
    password: { type: String },
    image: { type: String },
    otp: { type: Number },
    otpExpiry: { type: Date },
    isAdmin: {
        type: Boolean,
        default: false
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
    image: {
        type: String
    },
    image_key: {
        type: String,
        default: null
    },
    bio: {
        type: String
    },
    language: {
        type: String
    },
    role: {
        type: String,
        enum: ["admin", "user"],
        default: "user"
    },
    planStatus: {
        type: String,
        enum: ["Active", "Expired", "No Subscription"],
        default: "No Subscription"
    },
}, { timestamps: true });

// Pre-save middleware to ensure isAdmin is in sync with role
registerSchema.pre('save', function (next) {
    this.isAdmin = this.role === 'admin';
    next();
});

//  JWT token create method
registerSchema.methods.getJWT = async function () {
    const user = this;
    const token = jwt.sign({
        _id: user._id,
        role: user.role || 'user',
        isAdmin: user.role === 'admin'
    }, process.env.JWT_SECRET);
    return token;
};

//  Password validation method
registerSchema.methods.validatePassword = async function (passwordInputByUser) {
    const user = this;
    return await bcrypt.compare(passwordInputByUser, user.password);
};

export default mongoose.model("register", registerSchema);