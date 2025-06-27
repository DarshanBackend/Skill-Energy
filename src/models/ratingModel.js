import mongoose from "mongoose";

const ratingSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "register",
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    rate: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    description: {
        type: String
    }
}, { timestamps: true });

export default mongoose.model("rating", ratingSchema);