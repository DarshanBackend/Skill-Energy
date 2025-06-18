import Payment from '../models/paymentModel.js';
import { ThrowError } from '../utils/ErrorUtils.js';
import mongoose from 'mongoose';
import { sendBadRequestResponse } from '../utils/ResponseUtils.js';
import premiumModel from '../models/premiumModel.js';
import registerModel from '../models/registerModel.js';
// Create new payment record (User)
export const createPayment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { paymentMethodType, cardNumber, cardHolderName, expiryDate, cvv, upiId, planId } = req.body;

        // Basic validation for required fields for Payment
        if (!paymentMethodType || !planId) {
            return ThrowError(res, 400, "Payment method type and planId are required fields.");
        }

        // Conditional validation for Credit Card type
        if (paymentMethodType === 'Credit Card') {
            if (!cardNumber || !cardHolderName || !expiryDate || !cvv) {
                return ThrowError(res, 400, "Card number, card holder name, expiry date, and CVV are required for Credit Card payments.");
            }
            if (upiId) {
                return ThrowError(res, 400, "UPI ID should not be provided for Credit Card payments.");
            }
        } else if (paymentMethodType === 'UPI') {
            if (!upiId) {
                return ThrowError(res, 400, "UPI ID is required for UPI payments.");
            }
            if (cardNumber || cardHolderName || expiryDate || cvv) {
                return ThrowError(res, 400, "Card details should not be provided for UPI payments.");
            }
        }

        if (!mongoose.Types.ObjectId.isValid(planId)) {
            return ThrowError(res, 400, 'Invalid Plan ID format.');
        }

        const premiumPlan = await premiumModel.findById(planId);
        if (!premiumPlan) {
            return ThrowError(res, 404, 'Premium plan not found.');
        }

        // Derive plan details from premiumPlan
        const planName = premiumPlan.type;
        const price = parseFloat(premiumPlan.price); // Ensure price is a number

        if (isNaN(price)) {
            return ThrowError(res, 400, "Premium plan price is invalid. Please ensure it's a number.");
        }

        const discount = 0;
        const platformFee = 1;
        const total = price - discount + platformFee;

        const user = await registerModel.findById(userId);
        if (!user) {
            return ThrowError(res, 404, 'User not found.');
        }

        let endDate = new Date();
        switch (premiumPlan.duration) {
            case "Weekly":
                endDate.setDate(endDate.getDate() + 7);
                break;
            case "Monthly":
                endDate.setMonth(endDate.getMonth() + 1);
                break;
            case "Yearly":
                endDate.setFullYear(endDate.getFullYear() + 1);
                break;
            default:
                return ThrowError(res, 400, 'Invalid premium plan duration.');
        }

        user.planId = planId;
        user.endDate = endDate;
        await user.save();

        const newPayment = new Payment({
            paymentMethodType,
            cardNumber,
            cardHolderName,
            expiryDate,
            cvv,
            upiId,
            planName,
            price,
            discount: discount || 0,
            total,
            premiumPlan
        });

        const savedPayment = await newPayment.save();

        return res.status(201).json({
            message: "Payment and subscription created successfully",
            payment: savedPayment,
            userSubscription: { planId: user.planId, endDate: user.endDate }
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get all payment records (Admin Only)
export const getAllPayments = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return sendBadRequestResponse(res, "Access denied. Admins only.");
        }
        const payments = await Payment.find();
        res.status(200).json({
            success: true,
            message: "All payment records fetched successfully",
            payments
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get single payment record by ID (Admin Only)
export const getPaymentById = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return sendBadRequestResponse(res, "Access denied. Admins only.");
        }
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, 'Invalid Payment ID.');
        }
        const payment = await Payment.findById(id);
        if (!payment) {
            return sendBadRequestResponse(res, 'Payment record not found.');
        }
        res.status(200).json({
            success: true,
            message: "Payment record fetched successfully",
            payment
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Update payment record (Admin Only)
export const updatePayment = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return sendBadRequestResponse(res, "Access denied. Admins only.");
        }
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, 'Invalid Payment ID format.');
        }
        const payment = await Payment.findById(id);
        if (!payment) {
            return sendBadRequestResponse(res, 'Payment record not found.');
        }
        const updatedPayment = await Payment.findByIdAndUpdate(
            id,
            { ...req.body },
            { new: true }
        );
        res.status(200).json({
            success: true,
            message: "Payment record updated successfully",
            payment: updatedPayment
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Delete payment record (Admin Only)
export const deletePayment = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return sendBadRequestResponse(res, "Access denied. Admins only.");
        }
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, 'Invalid Payment ID format.');
        }
        const payment = await Payment.findByIdAndDelete(id);
        if (!payment) {
            return sendBadRequestResponse(res, 'Payment record not found.');
        }
        res.status(200).json({
            success: true,
            message: "Payment record deleted successfully"
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

