import mongoose from 'mongoose';
import registerModel from '../models/registerModel.js';
import Course from '../models/courseModel.js';
import Payment from '../models/paymentModel.js';
import mentorModel from '../models/mentorModel.js';
import CoursePayment from '../models/coursePaymentModel.js';
import Premium from '../models/premiumModel.js';
import CourseCategory from '../models/courseCategoryModel.js';
import Mentor from '../models/mentorModel.js';
import { ThrowError } from '../utils/ErrorUtils.js';
import { attachWishlistFlag } from "../utils/wishlistHelper.js";
import Wishlist from '../models/wishlistModel.js';
import { sendErrorResponse, sendSuccessResponse } from '../utils/ResponseUtils.js';
import Language from "../models/languageModel.js";
import CourseSection from "../models/courseSectionModel.js";

export const getDashboardStats = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return sendForbiddenResponse(res, "Access denied. Admins only.");
        }

        const [totalUsers, totalCourses, totalMentors, coursePaymentIncomeAgg, subscriptionPayments] = await Promise.all([
            registerModel.countDocuments({ role: 'user' }),
            Course.countDocuments(),
            mentorModel.countDocuments(),
            CoursePayment.aggregate([
                { $group: { _id: null, total: { $sum: '$price' } } }
            ]),
            Payment.find({}, 'premiumPlan')
        ]);

        let subscriptionIncome = 0;
        if (subscriptionPayments.length > 0) {
            const premiumPlanIds = subscriptionPayments.map(p => p.premiumPlan).filter(Boolean);
            if (premiumPlanIds.length > 0) {
                const premiumPlans = await Premium.find({ _id: { $in: premiumPlanIds } }, 'price');
                const priceMap = new Map(premiumPlans.map(plan => [plan._id.toString(), plan.price]));
                subscriptionIncome = premiumPlanIds.reduce((sum, id) => sum + (priceMap.get(id.toString()) || 0), 0);
            }
        }

        const coursePaymentIncome = coursePaymentIncomeAgg.length > 0 ? coursePaymentIncomeAgg[0].total : 0;
        const totalIncome = subscriptionIncome + coursePaymentIncome;

        res.status(200).json({
            success: true,
            message: "Dashboard stats fetched successfully",
            data: {
                totalUsers,
                totalCourses,
                totalMentors,
                subscriptionIncome,
                coursePaymentIncome,
                totalIncome
            }
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getLatestCourses = async (req, res) => {
    try {
        const userId = req.user?._id;

        const latestCourses = await Course.find({})
            .sort({ createdAt: -1 })
            .limit(50)
            .populate("courseCategory");

        const sortedByPurchases = latestCourses.sort(
            (a, b) => (b.user?.length || 0) - (a.user?.length || 0)
        );

        const topLatest = sortedByPurchases.slice(0, 10);

        const data = await attachWishlistFlag(topLatest, userId);

        return res.status(200).json({
            success: true,
            message: "Latest popular courses fetched successfully",
            data,
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getPopularDesignCourses = async (req, res) => {
    try {
        const userId = req.user?._id;

        const designCategory = await CourseCategory.findOne({ courseCategoryName: /design/i });
        if (!designCategory) {
            return ThrowError(res, 404, "Design category not found.");
        }

        const courses = await Course.find({ courseCategory: designCategory._id })
            .sort({ "user.length": -1 })
            .limit(10)
            .populate("courseCategory")
            .lean();

        let wishlistCourseIds = [];
        if (userId) {
            const wishlist = await Wishlist.findOne({ userId });
            wishlistCourseIds = wishlist ? wishlist.courses.map(id => id.toString()) : [];
        }

        const data = courses.map(course => ({
            ...course,
            isWishlisted: wishlistCourseIds.includes(course._id.toString())
        }));

        return res.status(200).json({
            success: true,
            message: "Popular Design courses fetched successfully",
            data,
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getPopularDevelopmentCourses = async (req, res) => {
    try {
        const userId = req.user?._id;

        const developmentCategory = await CourseCategory.findOne({ courseCategoryName: /development/i });
        if (!developmentCategory) {
            return ThrowError(res, 404, "Development category not found.");
        }

        const courses = await Course.find({ courseCategory: developmentCategory._id })
            .sort({ "user.length": -1 })
            .limit(10)
            .populate("courseCategory")
            .lean();

        let wishlistCourseIds = [];
        if (userId) {
            const wishlist = await Wishlist.findOne({ userId });
            wishlistCourseIds = wishlist ? wishlist.courses.map(id => id.toString()) : [];
        }

        const data = courses.map(course => ({
            ...course,
            isWishlisted: wishlistCourseIds.includes(course._id.toString())
        }));

        return res.status(200).json({
            success: true,
            message: "Popular Development courses fetched successfully",
            data,
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getPopularBusinessCourses = async (req, res) => {
    try {
        const userId = req.user?._id;

        const businessCategory = await CourseCategory.findOne({
            courseCategoryName: /business/i,
        });
        if (!businessCategory) {
            return ThrowError(res, 404, "Business category not found.");
        }

        const courses = await Course.aggregate([
            { $match: { courseCategory: businessCategory._id } },
            { $addFields: { userCount: { $size: "$user" } } },
            { $sort: { userCount: -1 } },
            { $limit: 10 },
        ]);

        const populatedCourses = await Course.populate(courses, {
            path: "courseCategory",
        });

        let wishlistCourseIds = [];
        if (userId) {
            const wishlist = await Wishlist.findOne({ userId });
            wishlistCourseIds = wishlist
                ? wishlist.courses.map((id) => id.toString())
                : [];
        }

        const data = populatedCourses.map((course) => ({
            ...course,
            isWishlisted: wishlistCourseIds.includes(course._id.toString()),
        }));

        return res.status(200).json({
            success: true,
            message: "Popular Business courses fetched successfully",
            data,
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getLernersareviewing = async (req, res) => {
    try {
        const userId = req.user?._id;

        const topCourses = await CoursePayment.aggregate([
            { $group: { _id: "$courseId", purchaseCount: { $sum: 1 } } },
        ]);

        const purchaseCountMap = Object.fromEntries(
            topCourses.map(tc => [tc._id.toString(), tc.purchaseCount])
        );

        let courses = await Course.find({})
            .populate("courseCategory")
            .lean();

        courses = courses.map(course => ({
            ...course,
            purchaseCount: purchaseCountMap[course._id.toString()] || 0,
        }));

        courses.sort((a, b) => b.purchaseCount - a.purchaseCount);

        let wishlistCourseIds = [];
        if (userId) {
            const wishlist = await Wishlist.findOne({ userId });
            wishlistCourseIds = wishlist ? wishlist.courses.map(id => id.toString()) : [];
        }

        const data = courses.slice(0, 10).map(course => ({
            ...course,
            isWishlisted: wishlistCourseIds.includes(course._id.toString()),
        }));

        return res.status(200).json({
            success: true,
            message: "Learners are viewing courses fetched successfully",
            data,
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getTopMentors = async (req, res) => {
    try {
        const mentors = await Mentor.find({});
        const mentorCourseCounts = await Promise.all(
            mentors.map(async (mentor) => {
                const courseCount = await Course.countDocuments({ mentorId: mentor._id });
                return { mentor, courseCount };
            })
        );
        const topMentors = mentorCourseCounts
            .sort((a, b) => b.courseCount - a.courseCount)
            .slice(0, 10)
            .map(item => ({
                mentor: item.mentor,
                courseCount: item.courseCount
            }));
        return res.status(200).json({
            success: true,
            message: "Top mentors fetched successfully",
            data: topMentors
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const filterCoursesController = async (req, res) => {
    try {
        const { sortBy, language, topics, category, minRating } = req.query;
        const userId = req.user?._id;

        let filter = {};

        if (category) {
            filter.courseCategory = category;
        }

        if (language) {
            filter.language = { $regex: new RegExp(language, "i") };
        }

        if (topics) {
            const languageDoc = await Language.findOne({
                language: { $regex: new RegExp(topics, "i") }
            });
            if (languageDoc) {
                filter.course_languageId = languageDoc._id;
            }
        }

        let wishlistCourseIds = [];
        if (userId) {
            const wishlist = await Wishlist.findOne({ userId });
            wishlistCourseIds = wishlist ? wishlist.courses.map(id => id.toString()) : [];
        }

        let coursesQuery = Course.find(filter).populate("courseCategory");

        if (sortBy === "newest") {
            coursesQuery = coursesQuery.sort({ createdAt: -1 });
        } else if (sortBy === "popular") {
            coursesQuery = coursesQuery.sort({ "user.length": -1 });
        } else {
            coursesQuery = coursesQuery.sort({ createdAt: -1 });
        }

        let courses = await coursesQuery.lean();

        courses = courses.map(course => {
            const totalRatings = course.ratings.length;
            const avgRating =
                totalRatings > 0
                    ? course.ratings.reduce((sum, rating) => sum + rating.rating, 0) / totalRatings
                    : 0;
            return {
                ...course,
                avgRating: parseFloat(avgRating.toFixed(1)),
                totalRatings,
                totalEnrollments: course.user.length
            };
        });

        if (minRating) {
            courses = courses.filter(course => course.avgRating >= parseFloat(minRating));
        }

        if (sortBy === "ratings") {
            courses.sort((a, b) => b.avgRating - a.avgRating);
        }

        const coursesWithWishlist = courses.map(course => ({
            ...course,
            isWishlisted: wishlistCourseIds.includes(course._id.toString())
        }));

        return sendSuccessResponse(res, "Courses filtered successfully", coursesWithWishlist);
    } catch (error) {
        console.error("Filter Error:", error);
        return sendErrorResponse(res, 500, "Error filtering courses", error.message);
    }
};
