import express from 'express';
import { UserAuth } from '../middlewares/auth.js';
import {
    createPreferences,
    getUserPreferences,
    deleteUserPreferences,
    getAllUsersPreferences
} from '../controllers/userPreferencesController.js';

const UserPreferencesrouter = express.Router();
UserPreferencesrouter.use(UserAuth);
UserPreferencesrouter.post('/createPreferences', createPreferences);
UserPreferencesrouter.get('/getUserPreferences', getUserPreferences);
UserPreferencesrouter.get('/getAllUsersPreferences', getAllUsersPreferences);
UserPreferencesrouter.delete('/deleteUserPreferences', deleteUserPreferences);

export default UserPreferencesrouter; 