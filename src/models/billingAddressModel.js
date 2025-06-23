import mongoose from "mongoose"

const billingAddressSchema = mongoose.Schema({
    country: {
        type: String
    },
    state: {
        type: String
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'register',
        required: true,
        unique: true
    }
}, { timestamps: true })

export default mongoose.model("BillngAdderss", billingAddressSchema)