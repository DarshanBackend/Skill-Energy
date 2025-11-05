import mongoose from "mongoose";

const mentorSchema = mongoose.Schema({
    mentorName: {
        type: String,
        required: true,
        unique: true,
    },
    courseIds: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
        },
    ],
    mentorImage: {
        type: String,
    },
    mentorImage_key: {
        type: String,
        default: null,
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active",
    },
}, { timestamps: true });

export default mongoose.model("Mentor", mentorSchema);
