import mongoose from "mongoose";

const reminderSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'register',
        required: true
    },
    name: {
        type: String
    },
    time: {
        type: String,
        required: true
    },
    frequency: {
        type: String,
        enum: ["Once", "Daily", "Weakly"]
    }
}, { timestapms: true })

export default mongoose.model("Reminder", reminderSchema)