import mongoose from "mongoose";

const courseCategorySchema = mongoose.Schema({
    courseCategoryName: {
        type: String
    }
})


export default mongoose.model("CourseCategory", courseCategorySchema)