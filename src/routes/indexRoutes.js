import express from "express";
import { upload, convertJfifToJpeg } from "../middlewares/imageupload.js";
import { isAdmin, isUser, UserAuth } from "../middlewares/auth.js";
import { createRegister, getRegisterById, getAllUsers, updateProfileUser, updateProfileAdmin } from "../controllers/registerController.js";
import { changePassword, forgotPassword, loginUser, resetPassword, VerifyEmail } from '../controllers/loginController.js';
import { createCourse, getCourseById, getAllCourses, updateCourse, deleteCourse, getCourseByCategory } from '../controllers/courseController.js';
import { createCourseCategory, deleteCourseCategory, getAllCourseCategories, getCourseCategoryById, updateCourseCategory } from "../controllers/courseCategoryController.js";
import { createPremium, deletePremium, getAllPremium, getPremiumById, updatePremium } from "../controllers/premiumController.js";
import { createPayment, deletePayment, getAllPayments, getPaymentById, updatePayment, getMySubscription } from "../controllers/paymentController.js";
import { createbilling, deleteBillingAddress, getAllBillingAddress, getBillingAddressById, updateBillingAddress } from "../controllers/billingAddressController.js";
import { createReasonCancel, deleteMyAccount, deleteReasonCancel, getAllReasonCancel, getReasonCancelById, updateReasonCancel } from "../controllers/reasonDeleteAccountController.js";
import { createSection, deleteSection, getSectionById, getSectionsByCourseId, updateSection } from "../controllers/courseSectionController.js";
import { addCompany, deleteCompany, getAllCompanies, getCompanyById, updateCompany } from "../controllers/companyController.js";
import { addMentor, deleteMentor, getAllMentors, getMentorById, getMentorsByCourse, updateMentor } from "../controllers/mentorController.js";
import { addLanguage, deleteLanguage, getAllLanguages, getLanguageById, updateLanguage } from "../controllers/languageController.js";
import { addreminder, getAllReminders, getReminderById, updateReminder, deleteReminder } from "../controllers/reminderController.js";
import { addRating, getRatingById, getAllRatings, updateRating, deleteRating, getCourseRatings, totalRatings } from "../controllers/ratingController.js";
import { addToWishlist, clearWishlist, getUserWishlist, removeFromWishlist } from "../controllers/wishlistController.js";
import { addToCart, clearCart, getCart, removeFromCart } from "../controllers/cartController.js";
import { createCoursePayment, getAllCoursePayments, getCoursePaymentById, updateCoursePayment, deleteCoursePayment } from "../controllers/coursePaymentController.js";
import { getDashboardStats, getLatestCourses, getPopularBusinessCourses, getPopularDesignCourses, getPopularDevelopmentCourses, getLernersareviewing, getTopMentors } from "../controllers/dashboardController.js";

const indexRoutes = express.Router()

//dashbord Routes
indexRoutes.get('/getDashboardStats', UserAuth, isAdmin, getDashboardStats);
indexRoutes.get('/getLatestCourses', UserAuth, getLatestCourses);
indexRoutes.get('/getPopularDesignCourses', UserAuth, getPopularDesignCourses);
indexRoutes.get('/getPopularDevelopmentCourses', UserAuth, getPopularDevelopmentCourses);
indexRoutes.get('/getPopularBusinessCourses', UserAuth, getPopularBusinessCourses);
indexRoutes.get('/getLernersareviewing', UserAuth, getLernersareviewing);
indexRoutes.get('/getTopMentors', UserAuth, getTopMentors);


//Regitser Routes
indexRoutes.post("/createRegister", createRegister)
indexRoutes.get("/getRegisterById/:id", UserAuth, getRegisterById)
indexRoutes.get("/getAllUsers", UserAuth, getAllUsers)
indexRoutes.put("/updateProfileUser/:id", UserAuth, isUser, upload.single("image"), convertJfifToJpeg, updateProfileUser)
indexRoutes.put("/updateProfileAdmin/:id", UserAuth, isAdmin, upload.single("image"), convertJfifToJpeg, updateProfileAdmin)


//login Routes
indexRoutes.post('/loginUser', loginUser);
indexRoutes.post('/forgotPassword', forgotPassword);
indexRoutes.post('/VerifyEmail', VerifyEmail);
indexRoutes.post('/resetPassword', resetPassword);
indexRoutes.post('/changePassword', UserAuth, changePassword);
// indexRoutes.post('/logoutUser', UserAuth, logoutUser);


//language Routes
indexRoutes.post("/addLanguage", UserAuth, isAdmin, upload.single('language_thumbnail'), convertJfifToJpeg, addLanguage)
indexRoutes.get("/getLanguageById/:id", UserAuth, getLanguageById)
indexRoutes.get("/getAllLanguages", UserAuth, getAllLanguages)
indexRoutes.put("/updateLanguage/:id", UserAuth, isAdmin, upload.single('language_thumbnail'), convertJfifToJpeg, updateLanguage)
indexRoutes.delete("/deleteLanguage/:id", UserAuth, isAdmin, deleteLanguage)


//couresCategory Routes
indexRoutes.post("/createCourseCategory", UserAuth, isAdmin, createCourseCategory)
indexRoutes.get("/getAllCourseCategories", UserAuth, getAllCourseCategories)
indexRoutes.get("/getCourseCategoryById/:id", UserAuth, isAdmin, getCourseCategoryById)
indexRoutes.put("/updateCourseCategory/:id", UserAuth, isAdmin, updateCourseCategory)
indexRoutes.delete("/deleteCourseCategory/:id", UserAuth, isAdmin, deleteCourseCategory)


//company Routes
indexRoutes.post("/addCompany", UserAuth, isAdmin, upload.single("companyImage"), convertJfifToJpeg, addCompany)
indexRoutes.get("/getCompanyById/:id", UserAuth, isAdmin, getCompanyById)
indexRoutes.get("/getAllCompanies", UserAuth, getAllCompanies)
indexRoutes.put("/updateCompany/:id", UserAuth, isAdmin, upload.single("companyImage"), convertJfifToJpeg, updateCompany)
indexRoutes.delete("/deleteCompany/:id", UserAuth, isAdmin, deleteCompany)


//course Routes
indexRoutes.post('/createCourse', UserAuth, isAdmin, upload.single('thumbnail'), convertJfifToJpeg, createCourse);
indexRoutes.get('/getAllCourses', UserAuth, getAllCourses);
indexRoutes.get('/getCourseById/:id', UserAuth, getCourseById);
indexRoutes.get('/getCourseByCategory/:categoryId', UserAuth, getCourseByCategory);
indexRoutes.put('/updateCourse/:id', UserAuth, isAdmin, upload.single('thumbnail'), convertJfifToJpeg, updateCourse);
indexRoutes.delete('/deleteCourse/:id', UserAuth, isAdmin, deleteCourse);
indexRoutes.get('/getPopularDesignCourses', UserAuth, getPopularDesignCourses);



//courseSection Routes
indexRoutes.post("/createSection", UserAuth, isAdmin, upload.fields([{ name: 'video', maxCount: 1 }]), convertJfifToJpeg, createSection)
indexRoutes.get("/getSectionById/:id", UserAuth, getSectionById)
indexRoutes.get("/getSectionsByCourseId/:courseId", UserAuth, getSectionsByCourseId)
indexRoutes.put("/updateSection/:id", UserAuth, isAdmin, upload.fields([{ name: 'video', maxCount: 1 }]), convertJfifToJpeg, updateSection)
indexRoutes.delete("/deleteSection/:id", UserAuth, isAdmin, deleteSection)


//mentor Routes
indexRoutes.post("/addMentor", UserAuth, isAdmin, upload.single("mentorImage"), convertJfifToJpeg, addMentor)
indexRoutes.get("/getMentorById/:id", UserAuth, getMentorById)
indexRoutes.get("/getAllMentors", UserAuth, getAllMentors)
indexRoutes.put("/updateMentor/:id", UserAuth, isAdmin, upload.single("mentorImage"), convertJfifToJpeg, updateMentor)
indexRoutes.delete("/deleteMentor/:id", UserAuth, isAdmin, deleteMentor)
indexRoutes.get("/getMentorsByCourse/:courseId", UserAuth, getMentorsByCourse)


//premium Routes
indexRoutes.post("/createPremium", UserAuth, isAdmin, createPremium)
indexRoutes.get("/getAllPremium", UserAuth, getAllPremium)
indexRoutes.get("/getPremiumById/:id", UserAuth, getPremiumById)
indexRoutes.put("/updatePremium/:id", UserAuth, isAdmin, updatePremium)
indexRoutes.delete("/deletePremium/:id", UserAuth, isAdmin, deletePremium)


//billingAddress Routes
indexRoutes.post("/createbilling", UserAuth, isUser, createbilling)
indexRoutes.get("/getBillingAddressById/:id", UserAuth, getBillingAddressById)
indexRoutes.get("/getAllBillingAddress", UserAuth, isAdmin, getAllBillingAddress)
indexRoutes.put("/updateBillingAddress/:id", UserAuth, isUser, updateBillingAddress)
indexRoutes.delete("/deleteBillingAddress/:id", UserAuth, isUser, deleteBillingAddress)


//payment Routes
indexRoutes.post("/createPayment", UserAuth, isUser, createPayment)
indexRoutes.get("/getAllPayments", UserAuth, isAdmin, getAllPayments)
indexRoutes.get("/getPaymentById/:id", UserAuth, isUser, getPaymentById)
indexRoutes.put("/updatePayment/:id", UserAuth, isUser, updatePayment)
indexRoutes.delete("/deletePayment/:id", UserAuth, isUser, deletePayment)
indexRoutes.get('/getMySubscription', UserAuth, isUser, getMySubscription);


//Reminder Routes
indexRoutes.post('/addreminder', UserAuth, isUser, addreminder);
indexRoutes.get('/getAllReminders', UserAuth, isUser, getAllReminders);
indexRoutes.get('/getReminderById/:id', UserAuth, isUser, getReminderById);
indexRoutes.put('/updateReminder/:id', UserAuth, isUser, updateReminder);
indexRoutes.delete('/deleteReminder/:id', UserAuth, isUser, deleteReminder);


//Rating Routes
indexRoutes.post('/addRating', UserAuth, isUser, addRating);
indexRoutes.get('/getCourseRatings/:courseId', UserAuth, getCourseRatings);
indexRoutes.get('/getRatingById/:id', getRatingById);
indexRoutes.get('/getAllRatings', getAllRatings);
indexRoutes.put('/updateRating/:id', UserAuth, isUser, updateRating);
indexRoutes.delete('/deleteRating/:id', UserAuth, isUser, deleteRating);
indexRoutes.get('/totalRatings', UserAuth, totalRatings);


//Watchlist Routes
indexRoutes.post('/addToWishlist', UserAuth, isUser, addToWishlist);
indexRoutes.get('/getUserWishlist', UserAuth, isUser, getUserWishlist);
indexRoutes.delete('/removeFromWishlist/:courseId', UserAuth, isUser, removeFromWishlist);
indexRoutes.delete('/clearWishlist/:courseId', UserAuth, isUser, clearWishlist);


//Cart Routes
indexRoutes.post('/addToCart', UserAuth, isUser, addToCart);
indexRoutes.get('/getCart', UserAuth, isUser, getCart);
indexRoutes.delete('/removeFromCart/:courseId', UserAuth, isUser, removeFromCart);
indexRoutes.delete('/clearCart/:courseId', UserAuth, isUser, clearCart);


//coursePayment Routes
indexRoutes.post("/createCoursePayment", UserAuth, isUser, createCoursePayment);
indexRoutes.get("/getAllCoursePayments", UserAuth, isAdmin, getAllCoursePayments);
indexRoutes.get("/getCoursePaymentById/:id", UserAuth, isUser, getCoursePaymentById);
indexRoutes.put("/updateCoursePayment/:id", UserAuth, isUser, updateCoursePayment);
indexRoutes.delete("/deleteCoursePayment/:id", UserAuth, isUser, deleteCoursePayment);


//deleteAccount Routes
indexRoutes.post("/createReasonCancel", UserAuth, createReasonCancel)
indexRoutes.get("/getReasonCancelById/:id", UserAuth, getReasonCancelById)
indexRoutes.get("/getAllReasonCancel", UserAuth, isAdmin, getAllReasonCancel)
indexRoutes.put("/updateReasonCancel/:id", UserAuth, updateReasonCancel)
indexRoutes.delete("/deleteReasonCancel/:id", UserAuth, deleteReasonCancel)
indexRoutes.delete("/deleteMyAccount", UserAuth, deleteMyAccount)


export default indexRoutes