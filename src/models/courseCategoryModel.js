import mongoose from "mongoose";

const courseCategorySchema = mongoose.Schema({
    courseCategoryName: {
        type: String
    }
}, { timestamps: true })


export default mongoose.model("CourseCategory", courseCategorySchema)