import registerModel from '../models/registerModel.js';
import Course from '../models/courseModel.js';
import Payment from '../models/paymentModel.js';
import mentorModel from '../models/mentorModel.js';

export const getDashboardStats = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return sendForbiddenResponse(res, "Access denied. Admins only.");
        }

        const [totalUsers, totalCourses, totalMentors, totalIncome] = await Promise.all([
            registerModel.countDocuments({ role: 'user' }),
            Course.countDocuments(),
            mentorModel.countDocuments(),
            Payment.aggregate([
                { $group: { _id: null, total: { $sum: '$total' } } }
            ])
        ]);

        const income = totalIncome.length > 0 ? totalIncome[0].total : 0;

        res.status(200).json({
            success: true,
            message: "Dashboard stats fetched successfully",
            data: {
                totalUsers,
                totalCourses,
                totalMentors,
                totalIncome: income
            }
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
