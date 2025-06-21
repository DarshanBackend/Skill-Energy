import mongoose from "mongoose";

const languageSchema = mongoose.Schema({
    language: {
        type: String,
        required: true,
        unique: true 
    }
}, { timestamps: true });

export default mongoose.model("Language", languageSchema); 