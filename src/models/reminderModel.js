import mongoose from "mongoose";

const reminderSchema = mongoose.Schema({
    name: {
        type: String
    },
    time: {
        type: Date
    },
    frequency: {
        type: String,
        enum: ["Once", "Daily", "Weakly"]
    }
}, { timestapms: true })

export default mongoose.model("Reminder", reminderSchema)