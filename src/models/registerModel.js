import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const registerSchema = mongoose.Schema({
    firstName: { type: String },
    lastName: { type: String },
    name: { type: String },
    phone: { type: Number },
    email: { type: String },
    password: { type: String },
    image: { type: String },
    image_key: { type: String, default: null },
    otp: { type: Number },
    otpExpiry: { type: Date },
    isAdmin: { type: Boolean, default: false },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "Premium" },
    isSubscribed: { type: Boolean, default: false },
    startDate: { type: Date },
    endDate: { type: Date },
    bio: { type: String },
    language: { type: String },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    planStatus: { type: String, enum: ["Active", "Expired", "No Subscription"], default: "No Subscription" },
    googleId: { type: String, default: null },
    verified: { type: Boolean, default: false },
}, { timestamps: true });

// Sync isAdmin with role
registerSchema.pre('save', function (next) {
    this.isAdmin = this.role === 'admin';
    next();
});

// JWT token method
registerSchema.methods.getJWT = async function () {
    const user = this;
    const token = jwt.sign({
        _id: user._id,
        role: user.role || 'user',
        isAdmin: user.role === 'admin'
    }, process.env.JWT_SECRET, { expiresIn: "7d" });
    return token;
};

// Password validation method
registerSchema.methods.validatePassword = async function (passwordInputByUser) {
    const user = this;
    return await bcrypt.compare(passwordInputByUser, user.password);
};

export default mongoose.model("register", registerSchema);