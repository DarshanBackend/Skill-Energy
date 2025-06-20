import express from "express";
import { upload, convertJfifToJpeg } from "../middlewares/imageupload.js";
import { isAdmin, isUser, UserAuth } from "../middlewares/auth.js";
import { createRegister, getRegisterById, updateRegister, getAllUsers } from "../controllers/registerController.js";
import { changePassword, forgotPassword, loginUser, logoutUser, resetPassword, VerifyEmail } from '../controllers/loginController.js';
import { createCourse, getCourseById, getAllCourses, updateCourse, deleteCourse } from '../controllers/coursController.js';
import { createCourseCategory, deleteCourseCategory, getAllCourseCategories, getCourseCategoryById, updateCourseCategory } from "../controllers/courseCategoryController.js";
import { createPremium, deletePremium, getAllPremium, getPremiumById, updatePremium } from "../controllers/premiumController.js";
import { createPayment, deletePayment, getAllPayments, getPaymentById, updatePayment, getMySubscription } from "../controllers/paymentController.js";
import { createbilling, deleteBillingAddress, getAllBillingAddress, getBillingAddressById, updateBillingAddress } from "../controllers/billingAddressController.js";
import { createReasonCancel, deleteMyAccount, deleteReasonCancel, getAllReasonCancel, getReasonCancelById, updateReasonCancel } from "../controllers/reasonDeleteAccountController.js";
import { createSection, deleteSection, getAllSections, getSectionById, updateSection } from "../controllers/courseSectionController.js";


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
indexRoutes.get('/getAllCourses', UserAuth, getAllCourses);
indexRoutes.get('/getCourseById/:id', UserAuth, getCourseById);
indexRoutes.put('/updateCourse/:id', upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'video', maxCount: 1 }]), UserAuth, updateCourse);
indexRoutes.delete('/deleteCourse/:id', UserAuth, deleteCourse);


//couresCategory Routes
indexRoutes.post("/createCourseCategory", UserAuth, isAdmin, createCourseCategory)
indexRoutes.get("/getAllCourseCategories", UserAuth, getAllCourseCategories)
indexRoutes.get("/getCourseCategoryById/:id", UserAuth, isAdmin, getCourseCategoryById)
indexRoutes.put("/updateCourseCategory/:id", UserAuth, isAdmin, updateCourseCategory)
indexRoutes.delete("/deleteCourseCategory/:id", UserAuth, isAdmin, deleteCourseCategory)


//premium Routes
indexRoutes.post("/createPremium", UserAuth, isAdmin, createPremium)
indexRoutes.get("/getAllPremium", UserAuth, getAllPremium)
indexRoutes.get("/getPremiumById/:id", UserAuth, isAdmin, getPremiumById)
indexRoutes.put("/updatePremium/:id", UserAuth, isAdmin, updatePremium)
indexRoutes.delete("/deletePremium/:id", UserAuth, isAdmin, deletePremium)


//payment Routes
indexRoutes.post("/createPayment", UserAuth, isUser, createPayment)
indexRoutes.get("/getAllPayments", UserAuth, isAdmin, getAllPayments)
indexRoutes.get("/getPaymentById/:id", UserAuth, isUser, getPaymentById)
indexRoutes.put("/updatePayment/:id", UserAuth, isUser, updatePayment)
indexRoutes.delete("/deletePayment/:id", UserAuth, isUser, deletePayment)
indexRoutes.get('/getMySubscription', UserAuth, isUser, getMySubscription);


//billingAddress Routes
indexRoutes.post("/createbilling", UserAuth, isUser, createbilling)
indexRoutes.get("/getBillingAddressById/:id", UserAuth, getBillingAddressById)
indexRoutes.get("/getAllBillingAddress", UserAuth, isAdmin, getAllBillingAddress)
indexRoutes.put("/updateBillingAddress/:id", UserAuth, isUser, updateBillingAddress)
indexRoutes.delete("/deleteBillingAddress/:id", UserAuth, isUser, deleteBillingAddress)


//billingAddress Routes
indexRoutes.post("/createReasonCancel", UserAuth, createReasonCancel)
indexRoutes.get("/getReasonCancelById/:id", UserAuth, getReasonCancelById)
indexRoutes.get("/getAllReasonCancel", UserAuth, isAdmin, getAllReasonCancel)
indexRoutes.put("/updateReasonCancel/:id", UserAuth, updateReasonCancel)
indexRoutes.delete("/deleteReasonCancel/:id", UserAuth, deleteReasonCancel)
indexRoutes.delete("/deleteMyAccount", UserAuth, deleteMyAccount)


//courseSection Routes
indexRoutes.post("/createSection", UserAuth, createSection)
indexRoutes.post("/getSectionById", UserAuth, getSectionById)
indexRoutes.post("/getAllSections", UserAuth, getAllSections)
indexRoutes.post("/updateSection", UserAuth, updateSection)
indexRoutes.post("/deleteSection", UserAuth, deleteSection)

export default indexRoutes