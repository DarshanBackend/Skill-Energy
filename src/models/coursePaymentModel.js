import mongoose from "mongoose";

const CoursePaymentSchema = mongoose.Schema({
    transactionId: {
        type: String,
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'register',
        required: true
    },
    price: {
        type: Number,
        required: true
    }
}, { timestamps: true });

const CoursePayment = mongoose.model('CoursePayment', CoursePaymentSchema);

export default CoursePayment; 