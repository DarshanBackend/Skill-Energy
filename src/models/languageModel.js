import mongoose from "mongoose";

const languageSchema = mongoose.Schema({
    language: {
        type: String,
        required: true,
        unique: true
    },
    language_thumbnail: {
        type: String,
        default: ''
    },
    language_thumbnail_key: {
        type: String,
        default: null
    }
}, { timestamps: true });

export default mongoose.model("Language", languageSchema); 