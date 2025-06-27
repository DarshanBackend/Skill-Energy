import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js"
import reminderModel from "../models/reminderModel.js";
import { sendBadRequestResponse, sendSuccessResponse } from "../utils/ResponseUtils.js";

export const addreminder = async (req, res) => {
    try {
        const { name, time, frequency } = req.body;

        if (!name || !time || !frequency) {
            return sendBadRequestResponse(res, "All fields are required");
        }

        // Check for duplicate reminder for this user
        const existing = await reminderModel.findOne({ name, time, user: req.user._id });
        if (existing) {
            return sendBadRequestResponse(res, "A reminder with the same name and time already exists for this user.");
        }

        const newreminder = new reminderModel({
            name,
            time,
            frequency,
            user: req.user._id
        });

        await newreminder.save();

        res.status(201).json({ success: true, message: "Reminder is created...", data: newreminder });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
}

export const getAllReminders = async (req, res) => {
    try {
        const reminders = await reminderModel.find({ user: req.user._id });

        if (!reminders || reminders.length === 0) {
            return sendSuccessResponse(res, "No reminders found", []);
        }
        res.status(200).json({
            success: true,
            message: "All reminders fetched successfully",
            data: reminders
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getReminderById = async (req, res) => {
    try {
        const { id } = req.params;
        const reminder = await reminderModel.findOne({ _id: id, user: req.user._id });
        if (!reminder) {    
            return res.status(404).json({
                success: false,
                message: "Reminder not found"
            });
        }
        res.status(200).json({
            success: true,
            data: reminder
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const updateReminder = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, time, frequency } = req.body;
        const updatedReminder = await reminderModel.findOneAndUpdate(
            { _id: id, user: req.user._id },
            { name, time, frequency },
            { new: true }
        );
        if (!updatedReminder) {
            return res.status(404).json({
                success: false,
                message: "Reminder not found or you do not have permission to update this reminder."
            });
        }
        res.status(200).json({
            success: true,
            message: "Reminder updated successfully",
            data: updatedReminder
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const deleteReminder = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedReminder = await reminderModel.findOneAndDelete({ _id: id, user: req.user._id });
        if (!deletedReminder) {
            return res.status(404).json({
                success: false,
                message: "Reminder not found or you do not have permission to delete this reminder."
            });
        }
        res.status(200).json({
            success: true,
            message: "Reminder deleted successfully"
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};