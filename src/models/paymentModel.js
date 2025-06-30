import mongoose from "mongoose";

const PaymentSchema = mongoose.Schema({
    transactionId: {
        type: String
    },
    premiumPlan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Premium',
    },
    billingAddressId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BillingAddress',
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'register',
        required: true
    }
}, { timestamps: true });

const Payment = mongoose.model('Payment', PaymentSchema);

export default Payment; 
