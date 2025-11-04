import express from "express";
import { uploadMedia, upload, convertJfifToJpeg } from "../middlewares/imageupload.js";
import { isAdmin, isUser, UserAuth } from "../middlewares/auth.js";
import { createRegister, getRegisterById, getAllUsers, updateProfileUser, updateProfileAdmin } from "../controllers/registerController.js";
import { changePassword, forgotPassword, googleLogin, loginUser, resetPassword, VerifyEmail } from '../controllers/loginController.js';
import { createCourse, getCourseById, getAllCourses, updateCourse, deleteCourse, getCourseByCategory } from '../controllers/courseController.js';
import { createCourseCategory, deleteCourseCategory, getAllCourseCategories, getCourseCategoryById, updateCourseCategory } from "../controllers/courseCategoryController.js";
import { createPremium, deletePremium, getAllPremium, getPremiumById, updatePremium } from "../controllers/premiumController.js";
import { createPayment, deletePayment, getAllPayments, getPaymentById, updatePayment, getMySubscription } from "../controllers/paymentController.js";
import { createbilling, deleteBillingAddress, getAllBillingAddress, getBillingAddress, getBillingAddressById, updateBillingAddress } from "../controllers/billingAddressController.js";
import { createReasonCancel, deleteMyAccount, deleteReasonCancel, getAllReasonCancel, getReasonCancelById, updateReasonCancel } from "../controllers/reasonDeleteAccountController.js";
import { createSection, deleteSection, getSectionById, getSectionsByCourseId, updateSection } from "../controllers/courseSectionController.js";
import { addCompany, deleteCompany, getAllCompanies, getCompanyById, updateCompany } from "../controllers/companyController.js";
import { addMentor, deleteMentor, getAllMentors, getMentorById, getMentorsByCourse, updateMentor } from "../controllers/mentorController.js";
import { addLanguage, deleteLanguage, getAllLanguages, getLanguageById, updateLanguage } from "../controllers/languageController.js";
import { addreminder, getAllReminders, getReminderById, updateReminder, deleteReminder } from "../controllers/reminderController.js";
import { addRating, getRatingById, getAllRatings, updateRating, deleteRating, getCourseRatings, totalRatings } from "../controllers/ratingController.js";
import { addToWishlist, clearWishlist, getUserWishlist, removeFromWishlist } from "../controllers/wishlistController.js";
import { addToCart, clearCart, getCart, removeFromCart } from "../controllers/cartController.js";
import { createCoursePayment, getAllCoursePayments, getCoursePaymentById, updateCoursePayment, deleteCoursePayment, getUserPurchasedCourses } from "../controllers/coursePaymentController.js";
import { getDashboardStats, getLatestCourses, getPopularBusinessCourses, getPopularDesignCourses, getPopularDevelopmentCourses, getLernersareviewing, getTopMentors, filterCoursesController } from "../controllers/dashboardController.js";
import { S3Client } from "@aws-sdk/client-s3";
import { ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";

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
indexRoutes.put("/updateProfileUser/:id", UserAuth, isUser, upload.single("image"), updateProfileUser)
indexRoutes.put("/updateProfileAdmin/:id", UserAuth, isAdmin, upload.single("image"), updateProfileAdmin)


//login Routes
indexRoutes.post('/loginUser', loginUser);
indexRoutes.post('/forgotPassword', forgotPassword);
indexRoutes.post('/VerifyEmail', VerifyEmail);
indexRoutes.post('/resetPassword', resetPassword);
indexRoutes.post('/changePassword', UserAuth, changePassword);
indexRoutes.post('/googleLogin', googleLogin);
// indexRoutes.post('/logoutUser', UserAuth, logoutUser);


//language Routes
indexRoutes.post("/addLanguage", UserAuth, isAdmin, upload.single('language_thumbnail'), addLanguage)
indexRoutes.get("/getLanguageById/:id", UserAuth, getLanguageById)
indexRoutes.get("/getAllLanguages", UserAuth, getAllLanguages)
indexRoutes.put("/updateLanguage/:id", UserAuth, isAdmin, upload.single('language_thumbnail'), updateLanguage)
indexRoutes.delete("/deleteLanguage/:id", UserAuth, isAdmin, deleteLanguage)


//couresCategory Routes
indexRoutes.post("/createCourseCategory", UserAuth, isAdmin, createCourseCategory)
indexRoutes.get("/getAllCourseCategories", UserAuth, getAllCourseCategories)
indexRoutes.get("/getCourseCategoryById/:id", UserAuth, isAdmin, getCourseCategoryById)
indexRoutes.put("/updateCourseCategory/:id", UserAuth, isAdmin, updateCourseCategory)
indexRoutes.delete("/deleteCourseCategory/:id", UserAuth, isAdmin, deleteCourseCategory)


//company Routes
indexRoutes.post("/addCompany", UserAuth, isAdmin, upload.single("companyImage"), addCompany)
indexRoutes.get("/getCompanyById/:id", UserAuth, isAdmin, getCompanyById)
indexRoutes.get("/getAllCompanies", UserAuth, getAllCompanies)
indexRoutes.put("/updateCompany/:id", UserAuth, isAdmin, upload.single("companyImage"), updateCompany)
indexRoutes.delete("/deleteCompany/:id", UserAuth, isAdmin, deleteCompany)


//course Routes
indexRoutes.post('/createCourse', UserAuth, isAdmin, upload.single('thumbnail'), createCourse);
indexRoutes.get('/getAllCourses', UserAuth, getAllCourses);
indexRoutes.get('/getCourseById/:id', UserAuth, getCourseById);
indexRoutes.get('/getCourseByCategory/:categoryId', UserAuth, getCourseByCategory);
indexRoutes.put('/updateCourse/:id', UserAuth, isAdmin, upload.single('thumbnail'), updateCourse);
indexRoutes.delete('/deleteCourse/:id', UserAuth, isAdmin, deleteCourse);
indexRoutes.get('/getPopularDesignCourses', UserAuth, getPopularDesignCourses);
indexRoutes.get('/filterCoursesController', filterCoursesController);



//courseSection Routes
indexRoutes.post("/createSection", UserAuth, isAdmin, upload.fields([{ name: 'video', maxCount: 1 }]), createSection)
indexRoutes.get("/getSectionById/:id", UserAuth, getSectionById)
indexRoutes.get("/getSectionsByCourseId/:courseId", UserAuth, getSectionsByCourseId)
indexRoutes.put("/updateSection/:id", UserAuth, isAdmin, upload.fields([{ name: 'video', maxCount: 1 }]), updateSection)
indexRoutes.delete("/deleteSection/:id", UserAuth, isAdmin, deleteSection)


//mentor Routes
indexRoutes.post("/addMentor", UserAuth, isAdmin, upload.single("mentorImage"), addMentor)
indexRoutes.get("/getMentorById/:id", UserAuth, getMentorById)
indexRoutes.get("/getAllMentors", UserAuth, getAllMentors)
indexRoutes.put("/updateMentor/:id", UserAuth, isAdmin, upload.single("mentorImage"), updateMentor)
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
indexRoutes.get("/getBillingAddress", UserAuth, getBillingAddress)
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
indexRoutes.get("/getUserPurchasedCourses", UserAuth, isUser, getUserPurchasedCourses);


//deleteAccount Routes
indexRoutes.post("/createReasonCancel", UserAuth, createReasonCancel)
indexRoutes.get("/getReasonCancelById/:id", UserAuth, getReasonCancelById)
indexRoutes.get("/getAllReasonCancel", UserAuth, isAdmin, getAllReasonCancel)
indexRoutes.put("/updateReasonCancel/:id", UserAuth, updateReasonCancel)
indexRoutes.delete("/deleteReasonCancel/:id", UserAuth, deleteReasonCancel)
indexRoutes.delete("/deleteMyAccount", UserAuth, deleteMyAccount)


const s3Client = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
    },
});

// List all files in bucket
indexRoutes.get("/listBucket", async (req, res) => {
    try {
        const command = new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET_NAME });
        const response = await s3Client.send(command);

        const files = (response.Contents || []).map(file => ({
            Key: file.Key,
            Size: file.Size,
            LastModified: file.LastModified,
            ETag: file.ETag,
            StorageClass: file.StorageClass,
        }));

        return res.json({ success: true, files });
    } catch (err) {
        console.error("Error listing bucket:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Delete a file from bucket
indexRoutes.delete("/deleteBucketFile", async (req, res) => {
    try {
        const { key } = req.body; // example: "images/1757483363902-9.jfif"
        if (!key) return res.status(400).json({ success: false, message: "File key is required" });

        await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
        }));

        return res.json({ success: true, message: `File deleted successfully: ${key}` });
    } catch (err) {
        console.error("Error deleting file:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});


export default indexRoutes