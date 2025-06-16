import jwt from "jsonwebtoken";
import registerModel from "../models/registerModel.js";
import { 
    sendErrorResponse, 
    sendForbiddenResponse, 
    sendUnauthorizedResponse,
    sendNotFoundResponse 
} from '../utils/ResponseUtils.js';

export const UserAuth = async (req, res, next) => {
    try {
        const { token } = req.cookies;

        if (!token) {
            return sendUnauthorizedResponse(res, "Token is not valid");
        }

        const decodedObj = await jwt.verify(token, process.env.JWT_SECRET || "Darshan@123"); 
        
        const { _id } = decodedObj;

        const user = await registerModel.findById(_id);

        if (!user) {
            return sendNotFoundResponse(res, "User not found");
        }

        req.user = user;
        next();
    } catch (error) {
        return sendErrorResponse(res, 400, error.message);
    }
};

export const isAdmin = async (req, res, next) => {
    try {
        // Assuming UserAuth has already run and set req.user
        if (!req.user || !req.user.isAdmin) {
            return sendForbiddenResponse(res, "Access denied. Not an admin.");
        }
        next();
    } catch (error) {
        return sendErrorResponse(res, 500, error.message);
    }
};

export const isUser = async (req, res, next) => {
    try {
        // Assuming UserAuth has already run and set req.user
        if (!req.user) {
            return sendUnauthorizedResponse(res, "Authentication required");
        }
        // If isAdmin is false, it's a regular user
        if (req.user.isAdmin) {
            return sendForbiddenResponse(res, "Access denied. Not a regular user.");
        }
        next();
    } catch (error) {
        return sendErrorResponse(res, 500, error.message);
    }
};
    