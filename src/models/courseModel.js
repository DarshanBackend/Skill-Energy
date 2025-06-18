import mongoose from "mongoose";

const courseSchema = mongoose.Schema({
    video: {
        type: String,
        default: null
    },
    thumnail: {
        type: String
    },
    video_title: {
        type: String
    },
    short_description: {
        type: String
    },
    student: {
        type: String
    },
    rating: {
        type: Number
    },
    created_by: {
        type: Date
    },
    last_updated: {
        type: Date
    },
    language: {
        type: String
    },
    cc: {
        type: String
    },
    price: {
        type: Number
    },
    what_are_learn: {
        type: Array
    },
    long_description: {
        type: String
    }
}, { timestamps: true });

export default mongoose.model("Coures", courseSchema)