import mongoose from "mongoose"

const billingAddressSchema = mongoose.Schema({
    country: {
        type: String
    },
    state: {
        type: String
    }
}, { timestamps: true })

export default mongoose.model("BillngAdderss", billingAddressSchema)