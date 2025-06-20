import mongoose from "mongoose";

const courseSectionSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Coures" },
    sectionNo: { type: String, required: true },
    section_title: { type: String, required: true },
    total_time: { String: Number },
    video: { type: String },
    videoNo: { type: String, required: true },
    video_title: { type: String, required: true },
    video_time: { type: String, required: true }
}, { timestamps: true });

courseSectionSchema.virtual('formattedDuration').get(function () {
    if (typeof this.total_time !== 'number' || this.total_time < 0) {
        return null; // Or handle as appropriate
    }
    const totalMinutes = Math.floor(this.total_time / 60000); // Convert milliseconds to minutes
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
        return `${hours}h ${minutes} min`;
    } else {
        return `${minutes} min`;
    }
});

export default mongoose.model("courseSectionSchema", courseSectionSchema);