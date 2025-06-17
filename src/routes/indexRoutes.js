import express from "express";
import upload, { convertJfifToJpeg } from "../middlewares/imageupload.js";
import { UserAuth } from "../middlewares/auth.js";
import { createRegister, getRegisterById, updateRegister, getAllMembers } from "../controllers/registerController.js";
import { changePassword, forgotPassword, loginUser, logoutUser, resetPassword, VerifyEmail } from '../controllers/loginController.js';


const indexRoutes = express.Router()


indexRoutes.post("/createRegister", createRegister)
indexRoutes.get("/getRegisterById/:id", UserAuth, getRegisterById)
indexRoutes.get("/getAllMembers", getAllMembers)
indexRoutes.put("/updateRegister/:id", UserAuth, upload.single("image"), convertJfifToJpeg, updateRegister)


indexRoutes.post('/loginUser', loginUser);
indexRoutes.post('/forgotPassword', forgotPassword);
indexRoutes.post('/VerifyEmail', VerifyEmail);
indexRoutes.post('/resetPassword', resetPassword);
indexRoutes.post('/changePassword', UserAuth, changePassword);
indexRoutes.post('/logoutUser', UserAuth, logoutUser);


export default indexRoutes