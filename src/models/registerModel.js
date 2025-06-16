import mongoose from "mongoose";
import jwt from "jsonwebtoken"

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
    type: {
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
    }
})

registerSchema.methods.getJWT = async function () {
    const register = this;

    const token = jwt.sign({ _id: register._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    return token;
};

registerSchema.methods.validatePassword = async function (passwordInputByUser) {
    const register = this;
    const passwordhash = register.password;

    const isPasswordValid = await bcrypt.compare(
        passwordInputByUser,
        passwordhash
    );

    return isPasswordValid;
};

export default mongoose.model("Register", registerSchema)