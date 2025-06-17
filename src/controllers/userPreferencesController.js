import UserPreferences from '../models/userPreferencesModel.js';
import {
    sendSuccessResponse,
    sendErrorResponse,
    sendBadRequestResponse,
    sendNotFoundResponse,
    sendForbiddenResponse
} from '../utils/ResponseUtils.js';

// Create user preferences
export const createPreferences = async (req, res) => {
    try {
        // Check if user is a regular user
        if (req.user.isAdmin) {
            return sendForbiddenResponse(res, "Only users can create preferences");
        }

        const {
            height,
            weight,
            goalWeight,
            gender,
            age,
            danceStyle,
            musicStyle,
            physicalActivity
        } = req.body;

        // Validate required fields
        if (!height || !weight || !goalWeight || !gender || !age || !danceStyle || !musicStyle || !physicalActivity) {
            return sendBadRequestResponse(res, "All fields are required");
        }

        // Validate height
        if (!height.value || !height.unit || !['FT', 'CM'].includes(height.unit)) {
            return sendBadRequestResponse(res, "Invalid height format");
        }

        // Validate weight
        if (!weight.value || !weight.unit || !['LB', 'KG'].includes(weight.unit)) {
            return sendBadRequestResponse(res, "Invalid weight format");
        }

        // Validate goal weight
        if (!goalWeight.value || !goalWeight.unit || !['LB', 'KG'].includes(goalWeight.unit)) {
            return sendBadRequestResponse(res, "Invalid goal weight format");
        }

        // Validate gender
        if (!['male', 'female', 'other'].includes(gender)) {
            return sendBadRequestResponse(res, "Invalid gender");
        }

        // Validate age
        if (age < 13 || age > 100) {
            return sendBadRequestResponse(res, "Age must be between 13 and 100");
        }

        // Validate dance style
        const validDanceStyles = [
            'Try All Style',
            'Dance Fitness',
            'Boxing',
            'Jazz',
            'Afro',
            'Latin',
            'Belly Dance',
            'Hip Hop'
        ];
        if (!validDanceStyles.includes(danceStyle)) {
            return sendBadRequestResponse(res, "Invalid dance style");
        }

        // Validate music style
        const validMusicStyles = [
            'Electronic',
            'Pop',
            'Latin',
            'Country',
            'K-Pop',
            'Non Preference'
        ];
        if (!validMusicStyles.includes(musicStyle)) {
            return sendBadRequestResponse(res, "Invalid music style");
        }

        // Validate physical activity
        const validPhysicalActivities = [
            'Not Much',
            '1-2 per week',
            '3-5 per week',
            '5-7 per week'
        ];
        if (!validPhysicalActivities.includes(physicalActivity)) {
            return sendBadRequestResponse(res, "Invalid physical activity level");
        }

        // Check if preferences already exist for this user
        const existingPreferences = await UserPreferences.findOne({ userId: req.user._id });

        if (existingPreferences) {
            return sendBadRequestResponse(res, "Preferences already exist for this user");
        }

        // Create new preferences
        const preferences = await UserPreferences.create({
            userId: req.user._id,
            height,
            weight,
            goalWeight,
            gender,
            age,
            danceStyle,
            musicStyle,
            physicalActivity
        });

        return sendSuccessResponse(res, "Preferences created successfully", preferences);
    } catch (error) {
        return sendErrorResponse(res, 500, error.message);
    }
};

// Get user preferences
export const getUserPreferences = async (req, res) => {
    try {
        const userId = req.query.userId; // Get userId from query parameter

        // If userId is provided and user is admin, get that user's preferences
        if (userId && req.user.isAdmin) {
            const preferences = await UserPreferences.findOne({ userId });
            if (!preferences) {
                return sendNotFoundResponse(res, "No preferences found for the specified user");
            }
            return sendSuccessResponse(res, "Preferences retrieved successfully", preferences);
        }

        // If no userId provided or user is not admin, get current user's preferences
        const preferences = await UserPreferences.findOne({ userId: req.user._id });
        if (!preferences) {
            return sendNotFoundResponse(res, "No preferences found for this user");
        }

        return sendSuccessResponse(res, "Preferences retrieved successfully", preferences);
    } catch (error) {
        return sendErrorResponse(res, 500, error.message);
    }
};

// Get all users preferences (admin only)
export const getAllUsersPreferences = async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return sendForbiddenResponse(res, "Access denied. Only admins can view all users preferences");
        }

        const preferences = await UserPreferences.find().populate('userId', 'name email');

        if (!preferences || preferences.length === 0) {
            return sendSuccessResponse(res, "No preferences found", []);
        }

        return sendSuccessResponse(res, "All users preferences retrieved successfully", preferences);
    } catch (error) {
        return sendErrorResponse(res, 500, error.message);
    }
};

// Delete user preferences
export const deleteUserPreferences = async (req, res) => {
    try {
        const preferences = await UserPreferences.findOneAndDelete({ userId: req.user._id });

        if (!preferences) {
            return sendNotFoundResponse(res, "No preferences found for this user");
        }

        return sendSuccessResponse(res, "Preferences deleted successfully");
    } catch (error) {
        return sendErrorResponse(res, 500, error.message);
    }
}; 