import express from 'express';
import upload, { convertJfifToJpeg } from '../middlewares/imageupload.js';
import { UserAuth, isAdmin, isUser } from '../middlewares/auth.js';
import { createRegister, getRegisterById, updateRegister, deleteRegister, getAllUsers } from '../controllers/registerController.js';
import { changePassword, forgotPassword, loginUser, logoutUser, resetPassword, VerifyEmail } from '../controllers/loginController.js';
import { createPreferences, getUserPreferences, deleteUserPreferences, getAllUsersPreferences } from '../controllers/userPreferencesController.js';
import { createPremiumPlan, getAllPremiumPlans, getPremiumPlanById, updatePremiumPlan, deletePremiumPlan } from '../controllers/premiumController.js';

const indexRouter = express.Router();

indexRouter.post('/createRegister', createRegister);
indexRouter.get('/getRegisterById/:id', UserAuth, getRegisterById);
indexRouter.put('/updateRegister/:id', UserAuth, upload.single("image"), convertJfifToJpeg, updateRegister);
indexRouter.delete('/deleteRegister/:id', UserAuth, deleteRegister);
indexRouter.get('/getAllUsers', UserAuth, isAdmin, getAllUsers);


indexRouter.post('/loginUser', loginUser);
indexRouter.post('/forgotPassword', forgotPassword);
indexRouter.post('/VerifyEmail', VerifyEmail);
indexRouter.post('/resetPassword', resetPassword);
indexRouter.post('/changePassword/:id', UserAuth, changePassword);
indexRouter.post('/logoutUser', UserAuth, logoutUser);


indexRouter.post('/createPreferences', UserAuth, isUser, createPreferences);
indexRouter.get('/getUserPreferences', UserAuth, getUserPreferences);
indexRouter.get('/getAllUsersPreferences', UserAuth, isAdmin, getAllUsersPreferences);
indexRouter.delete('/deleteUserPreferences', UserAuth, isUser, deleteUserPreferences);


indexRouter.post('/createPremiumPlan', UserAuth, isAdmin, createPremiumPlan);
indexRouter.get('/getAllPremiumPlans', UserAuth, getAllPremiumPlans);
indexRouter.get('/getPremiumPlanById/:id', UserAuth, getPremiumPlanById);
indexRouter.put('/updatePremiumPlan/:id', UserAuth, isAdmin, updatePremiumPlan);
indexRouter.delete('/deletePremiumPlan/:id', UserAuth, isAdmin, deletePremiumPlan);


export default indexRouter;  