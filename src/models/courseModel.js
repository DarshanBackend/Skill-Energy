import mongoose from "mongoose";

const courseSchema = mongoose.Schema({
    courseCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CourseCategory"
    },
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
    },
    user: {
        type: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            timestamp: { type: Date, default: Date.now }
        }],
        default: []
    },
    rating: { type: Number, default: 0 },
    ratings: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rating: { type: Number, min: 1, max: 5 },
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });


// Add a pre-save middleware to handle the views field
courseSchema.pre('save', function (next) {
    // If views is a number, convert it to the new format
    if (typeof this.views === 'number') {
        this.views = [];
    }
    next();
});


export default mongoose.model("Course", courseSchema)