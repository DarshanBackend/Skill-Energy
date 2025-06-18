import express from "express";
import { upload, convertJfifToJpeg } from "../middlewares/imageupload.js";
import { isAdmin, isUser, UserAuth } from "../middlewares/auth.js";
import { createRegister, getRegisterById, updateRegister, getAllUsers } from "../controllers/registerController.js";
import { changePassword, forgotPassword, loginUser, logoutUser, resetPassword, VerifyEmail } from '../controllers/loginController.js';
import { createCourse, getCourseById, getAllCourses, updateCourse, deleteCourse } from '../controllers/coursController.js';
import { createCourseCategory, deleteCourseCategory, getAllCourseCategories, getCourseCategoryById, updateCourseCategory } from "../controllers/courseCategoryController.js";
import { createPremium, deletePremium, getAllPremium, getPremiumById, updatePremium } from "../controllers/premiumController.js";
import { createPayment, deletePayment, getAllPayments, getPaymentById, updatePayment } from "../controllers/paymentController.js";


const indexRoutes = express.Router()

//Regitser Routes
indexRoutes.post("/createRegister", createRegister)
indexRoutes.get("/getRegisterById/:id", UserAuth, getRegisterById)
indexRoutes.get("/getAllUsers", UserAuth, getAllUsers)
indexRoutes.put("/updateRegister/:id", UserAuth, upload.single("image"), convertJfifToJpeg, updateRegister)


//login Routes
indexRoutes.post('/loginUser', loginUser);
indexRoutes.post('/forgotPassword', forgotPassword);
indexRoutes.post('/VerifyEmail', VerifyEmail);
indexRoutes.post('/resetPassword', resetPassword);
indexRoutes.post('/changePassword', UserAuth, changePassword);
indexRoutes.post('/logoutUser', UserAuth, logoutUser);


//course Routes
indexRoutes.post('/createCourse', UserAuth, upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'video', maxCount: 1 }]), createCourse);
indexRoutes.get('/getAllCourses', getAllCourses);
indexRoutes.get('/getCourseById/:id', getCourseById);
indexRoutes.put('/updateCourse/:id', upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'video', maxCount: 1 }]), updateCourse);
indexRoutes.delete('/deleteCourse/:id', deleteCourse);


//couresCategory Routes
indexRoutes.post("/createCourseCategory", UserAuth, isAdmin, createCourseCategory)
indexRoutes.get("/getAllCourseCategories", getAllCourseCategories)
indexRoutes.get("/getCourseCategoryById/:id", UserAuth, isAdmin, getCourseCategoryById)
indexRoutes.put("/updateCourseCategory/:id", UserAuth, isAdmin, updateCourseCategory)
indexRoutes.delete("/deleteCourseCategory/:id", UserAuth, isAdmin, deleteCourseCategory)


//premium Routes
indexRoutes.post("/createPremium", UserAuth, isAdmin, createPremium)
indexRoutes.get("/getAllPremium", getAllPremium)
indexRoutes.get("/getPremiumById/:id", UserAuth, isAdmin, getPremiumById)
indexRoutes.put("/updatePremium/:id", UserAuth, isAdmin, updatePremium)
indexRoutes.delete("/deletePremium/:id", UserAuth, isAdmin, deletePremium)


//payment Routes
indexRoutes.post("/createPayment", UserAuth, isUser, createPayment)
indexRoutes.get("/getAllPayments", isUser, getAllPayments)
indexRoutes.get("/getPaymentById/:id", UserAuth, getPaymentById)
indexRoutes.put("/updatePayment/:id", UserAuth, isUser, updatePayment)
indexRoutes.delete("/deletePayment/:id", UserAuth, isUser, deletePayment)




export default indexRoutes