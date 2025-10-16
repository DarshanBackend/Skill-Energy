import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import Mentor from "../models/mentorModel.js";
import Course from "../models/courseModel.js";
import { sendSuccessResponse, sendErrorResponse, sendBadRequestResponse, sendCreatedResponse } from '../utils/ResponseUtils.js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY.trim(),
        secretAccessKey: process.env.S3_SECRET_KEY.trim(),
    },
});

const publicUrlForKey = (key) => {
    const cdn = process.env.CDN_BASE_URL?.replace(/\/$/, '');
    if (cdn) return `${cdn}/${key}`;
    const bucket = process.env.S3_BUCKET_NAME;
    const region = process.env.S3_REGION || 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`;
};

const cleanupUploadedIfAny = async (file) => {
    if (file?.key) {
        try {
            await s3.send(
                new DeleteObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: file.key,
                })
            );
        } catch (e) {
            console.error('S3 cleanup failed:', e.message);
        }
    }
};

export const addMentor = async (req, res) => {
    const pickUploaded = () => {
        if (req.file) return req.file;
        if (req.files?.mentorImage?.[0]) return req.files.mentorImage[0];
        if (req.files?.image?.[0]) return req.files.image[0];
        return null;
    };

    const uploaded = pickUploaded();

    try {
        const { mentorName, courseId, status } = req.body;

        if (!mentorName || !courseId) {
            await cleanupUploadedIfAny(uploaded);
            return sendBadRequestResponse(res, "Mentor name and Course ID are required");
        }

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            await cleanupUploadedIfAny(uploaded);
            return sendBadRequestResponse(res, "Invalid Course ID");
        }

        const course = await Course.findById(courseId);
        if (!course) {
            await cleanupUploadedIfAny(uploaded);
            return sendErrorResponse(res, 404, "Course not found");
        }

        const existingMentor = await Mentor.findOne({ mentorName, courseId });
        if (existingMentor) {
            await cleanupUploadedIfAny(uploaded);
            return sendBadRequestResponse(res, "This mentor is already assigned to this course");
        }

        let mentorImage = null;
        let mentorImage_key = null;
        if (uploaded?.key) {
            mentorImage = publicUrlForKey(uploaded.key);
            mentorImage_key = uploaded.key;
        }

        const newMentor = await Mentor.create({
            mentorName,
            courseId,
            status: status || 'active',
            mentorImage,
            mentorImage_key
        });

        return sendCreatedResponse(res, "Mentor added successfully", newMentor);
    } catch (error) {
        await cleanupUploadedIfAny(uploaded);
        return ThrowError(res, 500, error.message);
    }
};

export const getAllMentors = async (req, res) => {
    try {
        const mentors = await Mentor.find().populate('courseId', 'title').sort({ createdAt: -1 });

        if (!mentors.length) {
            return sendSuccessResponse(res, "No mentors found", []);
        }

        return sendSuccessResponse(res, "Mentors fetched successfully", mentors);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getMentorById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid mentor ID");
        }

        const mentor = await Mentor.findById(id).populate('courseId', 'title');
        if (!mentor) {
            return sendErrorResponse(res, 404, "Mentor not found");
        }

        return sendSuccessResponse(res, "Mentor retrieved successfully", mentor);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const updateMentor = async (req, res) => {
    const pickUploaded = () => {
        if (req.file) return req.file;
        if (req.files?.mentorImage?.[0]) return req.files.mentorImage[0];
        if (req.files?.image?.[0]) return req.files.image[0];
        return null;
    };

    const uploaded = pickUploaded();

    try {
        const { id } = req.params;
        const { mentorName, courseId, status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            await cleanupUploadedIfAny(uploaded);
            return sendBadRequestResponse(res, "Invalid mentor ID");
        }

        const existingMentor = await Mentor.findById(id);
        if (!existingMentor) {
            await cleanupUploadedIfAny(uploaded);
            return sendErrorResponse(res, 404, "Mentor not found");
        }

        if (courseId) {
            if (!mongoose.Types.ObjectId.isValid(courseId)) {
                await cleanupUploadedIfAny(uploaded);
                return sendBadRequestResponse(res, "Invalid Course ID format");
            }
            const course = await Course.findById(courseId);
            if (!course) {
                await cleanupUploadedIfAny(uploaded);
                return sendErrorResponse(res, 404, "Course not found");
            }
            existingMentor.courseId = courseId;
        }

        if (uploaded?.key) {
            if (existingMentor.mentorImage_key) {
                try {
                    await s3.send(
                        new DeleteObjectCommand({
                            Bucket: process.env.S3_BUCKET_NAME,
                            Key: existingMentor.mentorImage_key,
                        })
                    );
                } catch (error) {
                    console.error('Error deleting old image from S3:', error.message);
                }
            }

            existingMentor.mentorImage = publicUrlForKey(uploaded.key);
            existingMentor.mentorImage_key = uploaded.key;
        }

        if (mentorName) existingMentor.mentorName = mentorName;
        if (status) existingMentor.status = status;

        await existingMentor.save();

        return sendSuccessResponse(res, "Mentor updated successfully", existingMentor);
    } catch (error) {
        await cleanupUploadedIfAny(uploaded);
        return ThrowError(res, 500, error.message);
    }
};

export const deleteMentor = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid mentor ID");
        }

        const mentor = await Mentor.findById(id);
        if (!mentor) {
            return sendErrorResponse(res, 404, "Mentor not found");
        }

        if (mentor.mentorImage_key) {
            try {
                await s3.send(
                    new DeleteObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: mentor.mentorImage_key,
                    })
                );
            } catch (error) {
                console.error('Error deleting image from S3:', error.message);
            }
        }

        await Mentor.findByIdAndDelete(id);

        return sendSuccessResponse(res, "Mentor deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getMentorsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return sendBadRequestResponse(res, "Invalid Course ID");
        }
        const mentors = await Mentor.find({ courseId, status: 'active' }).populate('courseId', 'title');
        
        if (!mentors || mentors.length === 0) {
            return sendSuccessResponse(res, "No mentors found for this course", []);
        }
        
        return sendSuccessResponse(res, "Mentors for course fetched successfully", mentors);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};