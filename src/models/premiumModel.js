import mongoose from 'mongoose';

const premiumSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Monthly', 'Yearly'],
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    duration: {
        type: String,
        enum: ['Monthly', 'Yearly'],
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
});


export default mongoose.model('Premium', premiumSchema);
