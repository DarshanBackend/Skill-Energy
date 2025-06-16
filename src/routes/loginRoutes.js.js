import express from 'express';
import { changePassword, forgotPassword, loginUser, logoutUser, resetPassword, VerifyEmail } from '../controllers/loginController.js';
import { UserAuth } from '../middlewares/auth.js';

const loginRouter = express.Router();

loginRouter.post('/loginUser', loginUser);
loginRouter.post('/forgotPassword', forgotPassword);
loginRouter.post('/VerifyEmail', VerifyEmail);
loginRouter.post('/resetPassword', resetPassword);
loginRouter.post('/changePassword/:id', UserAuth, changePassword);
loginRouter.post('/logoutUser', UserAuth, logoutUser);


export default loginRouter; 