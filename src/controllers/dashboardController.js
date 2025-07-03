import registerModel from '../models/registerModel.js';
import Course from '../models/courseModel.js';
import Payment from '../models/paymentModel.js';
import mentorModel from '../models/mentorModel.js';
import CoursePayment from '../models/coursePaymentModel.js';
import Premium from '../models/premiumModel.js';
import CourseCategory from '../models/courseCategoryModel.js';
import Mentor from '../models/mentorModel.js';
import { ThrowError } from '../utils/ErrorUtils.js';

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

        // Calculate subscriptionIncome by summing the price of each referenced premium plan
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

// Get latest courses (limit 10, sorted by createdAt desc)
export const getLatestCourses = async (req, res) => {
    try {
        // Get the latest 50 courses
        const latestCourses = await Course.find({})
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('courseCategory');

        // Sort in-memory by number of users who purchased (descending)
        const sortedByPurchases = latestCourses.sort((a, b) => (b.user?.length || 0) - (a.user?.length || 0));

        // Take top 10
        const topLatest = sortedByPurchases.slice(0, 10);

        return res.status(200).json({
            success: true,
            message: "Latest popular courses fetched successfully",
            data: topLatest
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get popular Design courses (limit 10, sorted by number of users who purchased)
export const getPopularDesignCourses = async (req, res) => {
    try {
        // Find the Design category
        const designCategory = await CourseCategory.findOne({ courseCategoryName: /design/i });
        if (!designCategory) {
            return ThrowError(res, 404, 'Design category not found.');
        }

        // Show all popular Design courses to both admin and users
        const courses = await Course.find({ courseCategory: designCategory._id })
            .sort({ 'user.length': -1 })
            .limit(10)
            .populate('courseCategory');

        return res.status(200).json({
            success: true,
            message: "Popular Design courses fetched successfully",
            data: courses
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get popular Developer courses (limit 10, sorted by number of users who purchased)
export const getPopularDevelopmentCourses = async (req, res) => {
    try {
        const developmentCategory = await CourseCategory.findOne({ courseCategoryName: /development/i });
        if (!developmentCategory) {
            return ThrowError(res, 404, 'Development category not found.');
        }

        // Show all popular Development courses to both admin and users
        const courses = await Course.find({ courseCategory: developmentCategory._id })
            .sort({ 'user.length': -1 })
            .limit(10)
            .populate('courseCategory');

        return res.status(200).json({
            success: true,
            message: "Popular Development courses fetched successfully",
            data: courses
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get popular Business courses (limit 10, sorted by number of users who purchased)
export const getPopularBusinessCourses = async (req, res) => {
    try {
        const businessCategory = await CourseCategory.findOne({ courseCategoryName: /business/i });
        if (!businessCategory) {
            return ThrowError(res, 404, 'Business category not found.');
        }

        // Show all popular Business courses to both admin and users
        const courses = await Course.find({ courseCategory: businessCategory._id })
            .sort({ 'user.length': -1 })
            .limit(10)
            .populate('courseCategory');

        return res.status(200).json({
            success: true,
            message: "Popular Business courses fetched successfully",
            data: courses
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get Lerners are viewing (limit 10, sorted by number of users who purchased)
export const getLernersareviewing = async (req, res) => {
    try {
        // 1. Aggregate purchase counts
        const topCourses = await CoursePayment.aggregate([
            { $group: { _id: "$courseId", purchaseCount: { $sum: 1 } } }
        ]);

        // 2. Map courseId to purchaseCount
        const purchaseCountMap = {};
        topCourses.forEach(tc => {
            purchaseCountMap[tc._id.toString()] = tc.purchaseCount;
        });

        // 3. Get all courses
        let courses = await Course.find({}).populate('courseCategory').lean();

        // 4. Attach purchaseCount to each course
        courses = courses.map(course => ({
            ...course,
            purchaseCount: purchaseCountMap[course._id.toString()] || 0
        }));

        // 5. Sort by purchaseCount descending
        courses.sort((a, b) => b.purchaseCount - a.purchaseCount);

        return res.status(200).json({
            success: true,
            message: "Lernersare viewing courses fetched successfully",
            data: courses
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getTopMentors = async (req, res) => {
    try {
        const mentors = await Mentor.find({});
        // For each mentor, count the number of courses they are assigned to
        const mentorCourseCounts = await Promise.all(
            mentors.map(async (mentor) => {
                const courseCount = await Course.countDocuments({ mentorId: mentor._id });
                return { mentor, courseCount };
            })
        );
        // Sort by courseCount descending and take top 10
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
}
