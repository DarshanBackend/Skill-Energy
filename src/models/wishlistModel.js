import mongoose from "mongoose";

const wishlistSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "register",
        required: true
    },
    courses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course"
    }]
}, { timestamps: true });

export default mongoose.model("Wishlist", wishlistSchema);