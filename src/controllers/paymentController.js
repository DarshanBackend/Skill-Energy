import Payment from '../models/paymentModel.js';
import { ThrowError } from '../utils/ErrorUtils.js';
import mongoose from 'mongoose';
import { sendBadRequestResponse } from '../utils/ResponseUtils.js';
import premiumModel from '../models/premiumModel.js';
import registerModel from '../models/registerModel.js';

// Create new payment record (User)
export const createPayment = async (req, res) => {
    try {
        const userId = req.user._id;
        const { paymentMethodType, cardNumber, cardHolderName, expiryDate, cvv, upiId, premiumPlan, billingAddressId } = req.body;

        // Basic validation for required fields
        if (!paymentMethodType || !premiumPlan) {
            return sendBadRequestResponse(res, "Missing required fields: paymentMethodType, premiumPlan");
        }

        // Fetch the premium plan
        if (!mongoose.Types.ObjectId.isValid(premiumPlan)) {
            return sendBadRequestResponse(res, 'Invalid Premium Plan ID format.');
        }
        const plan = await premiumModel.findById(premiumPlan);
        if (!plan) {
            return sendBadRequestResponse(res, 'Premium plan not found.');
        }

        const user = await registerModel.findById(userId);
        if (!user) {
            return ThrowError(res, 404, 'User not found.');
        }

        // Check if user has an active subscription for the same plan
        if (user.planId && user.endDate && new Date() < new Date(user.endDate)) {
            if (user.planId.toString() === premiumPlan) {
                return sendBadRequestResponse(res, 'You already have an active subscription for this plan. You can renew it after it expires.');
            }
        }

        // Derive plan details
        const planName = plan.type;
        const price = plan.price;
        const discount = 0; // or from coupon
        const total = price - discount;

        // Conditional validation for payment method
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

        if (billingAddressId && !mongoose.Types.ObjectId.isValid(billingAddressId)) {
            return ThrowError(res, 400, 'Invalid Billing Address ID format.');
        }

        let endDate = new Date();
        switch (plan.duration) {
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

        user.planId = premiumPlan;
        user.endDate = endDate;
        user.isSubscribed = true;
        user.planStatus = "Active";
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
            discount,
            total,
            premiumPlan,
            billingAddressId,
            user: userId
        });

        const savedPayment = await newPayment.save();

        return res.status(201).json({
            success: true,
            message: "Payment created successfully",
            payment: savedPayment
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
        const payments = await Payment.find().populate('user', 'name email');

        if (!payments || payments.length === 0) {
            return ThrowError(res, 404, 'No any payment found');
        }

        res.status(200).json({
            success: true,
            message: "All payment records fetched successfully",
            payments
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get single payment record by ID (Admin or User)
export const getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, 'Invalid Payment ID.');
        }
        const payment = await Payment.findById(id);
        if (!payment) {
            return sendBadRequestResponse(res, 'Payment record not found.');
        }
        // Allow admin or the user who owns the payment to access it
        if (!req.user.isAdmin && payment.user && payment.user.toString() !== req.user._id.toString()) {
            return sendBadRequestResponse(res, 'Access denied. You can only access your own payment records.');
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

// Update payment record (User Only)
export const updatePayment = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, 'Invalid Payment ID format.');
        }
        const payment = await Payment.findById(id);
        if (!payment) {
            return sendBadRequestResponse(res, 'Payment record not found.');
        }
        // Only allow the user who owns the payment to update it
        if (payment.user && payment.user.toString() !== req.user._id.toString()) {
            return sendBadRequestResponse(res, 'Access denied. You can only update your own payment records.');
        }
        // Validate billingAddressId if provided
        if (req.body.billingAddressId && !mongoose.Types.ObjectId.isValid(req.body.billingAddressId)) {
            return sendBadRequestResponse(res, 'Invalid Billing Address ID format.');
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

// Delete payment record (User Only)
export const deletePayment = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, 'Invalid Payment ID format.');
        }
        const payment = await Payment.findById(id);
        if (!payment) {
            return sendBadRequestResponse(res, 'Payment record not found.');
        }
        // Only allow the user who owns the payment to delete it
        if (payment.user && payment.user.toString() !== req.user._id.toString()) {
            return sendBadRequestResponse(res, 'Access denied. You can only delete your own payment records.');
        }

        // Remove subscription details from the user
        await registerModel.findByIdAndUpdate(payment.user, {
            $set: {
                planId: null,
                endDate: null,
                isSubscribed: false,
                planStatus: "No Subscription"
            }
        });

        await Payment.findByIdAndDelete(id);
        res.status(200).json({
            success: true,
            message: "Payment record deleted successfully and user subscription cleared"
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get logged-in user's active subscription plan
export const getMySubscription = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await registerModel.findById(userId);
        // Check for no plan or expired plan
        if (!user || !user.planId || !user.endDate || new Date(user.endDate) < new Date()) {
            return res.status(404).json({ success: false, message: "No active subscription found" });
        }

        const plan = await premiumModel.findById(user.planId);
        if (!plan) {
            return res.status(404).json({ success: false, message: "Subscription plan not found" });
        }

        // Format the date
        const validTillDate = new Date(user.endDate);
        const options = { day: '2-digit', month: 'short', year: 'numeric' };
        const validTill = validTillDate.toLocaleDateString('en-GB', options).replace(/ /g, ' ');

        res.json({
            success: true,
            plan: {
                name: plan.plan_name,
                price: plan.price,
                validTill,
                specification: plan.description
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

