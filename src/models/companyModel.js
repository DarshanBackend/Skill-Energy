import mongoose from "mongoose";

const companySchema = mongoose.Schema({
    companyName: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    companyImage: {
        type: String
    },
    companyImage_key: {
        type: String,
        default: null
    }
}, { timestamps: true })

export default mongoose.model("Company", companySchema)