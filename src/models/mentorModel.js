import mongoose from "mongoose";

const mentorSchema = mongoose.Schema({
    mentorName: {
        type: String,
        required: true,
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course"
    },
    mentorImage: {
        type: String
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
}, { timestamps: true })

export default mongoose.model("Mentor", mentorSchema)   