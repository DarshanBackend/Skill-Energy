import mongoose from "mongoose";

const PremiumSchema = mongoose.Schema({
    type: {
        type: String,
        enum: ["Personal Plans", "Team Plans", "Enterprice Plan"],
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    content: {
        type: Array,
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export default mongoose.model("Premium", PremiumSchema);