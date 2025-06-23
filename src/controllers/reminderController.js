import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js"
import reminderModel from "../models/reminderModel.js";
import { sendBadRequestResponse } from "../utils/ResponseUtils.js";

export const addreminder = async (req, res) => {
    try {
        const { name, time, frequency } = req.body

        if (!name || !time || !frequency) {
            return sendBadRequestResponse(res, "All filed are required")
        }

        const newreminder = new reminderModel({
            name,
            time,
            frequency
        })

        await newreminder.save()

        res.status(500).json({ message: "Reminder is created..." })
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}