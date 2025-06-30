import CourseSection from "../models/courseSectionModel.js";
import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import Course from "../models/courseModel.js";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
import { sendBadRequestResponse } from "../utils/ResponseUtils.js"

dotenv.config();

// Configure S3 client
const s3 = new S3Client({
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY.trim(),
        secretAccessKey: process.env.S3_SECRET_KEY.trim()
    },
    region: process.env.S3_REGION || "us-east-1"
});

// Helper function to delete file from S3
const deleteFileFromS3 = async (fileUrl) => {
    try {
        if (!fileUrl) return;

        // Extract the key from the URL
        const key = fileUrl.split('.com/')[1];
        if (!key) return;

        const deleteParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key
        };

        await s3.send(new DeleteObjectCommand(deleteParams));
    } catch (error) {
        console.error('Error deleting file from S3:', error);
        throw error;
    }
};

// Create a new section
export const createSection = async (req, res) => {
    try {
        const { courseId, videoNo, sectionNo, section_title, video_title, video_time } = req.body;

        // Validate required fields
        if (!courseId || !videoNo || !sectionNo || !section_title || !video_title || !video_time) {
            return ThrowError(res, 400, "Missing required fields: All fields are required");
        }

        // Validate files
        // if (!req.files || !req.files.video || !req.files.video[0]) {
        //     return ThrowError(res, 400, "Video file is missing. Please upload a video file.");
        // }

        // Get file URLs from req.files
        // const video = req.files.video[0].location;

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return ThrowError(res, 400, "Invalid course ID");
        }

        // Check if the course exists
        const parentContent = await Course.findById(courseId);
        if (!parentContent) {
            return ThrowError(res, 404, "Parent course not found");
        }

        // --- Parse all numeric inputs ---

        const parsedSectionNo = parseInt(sectionNo, 10);
        const parsedVideoNo = parseInt(videoNo, 10);
        // Strip any non-numeric characters and then parse
        const numericVideoTimeString = video_time.toString().replace(/[^0-9]/g, '');
        const parsedVideoTime = parseInt(numericVideoTimeString, 10);

        if (isNaN(parsedVideoTime)) {
            return ThrowError(res, 400, "Invalid format for video_time. Please provide a number.");
        }

        // Check for duplicate video with the same videoNo or video_title in the same section
        const existingVideo = await CourseSection.findOne({
            courseId,
            sectionNo: parsedSectionNo,
            $or: [
                { videoNo: parsedVideoNo },
                { video_title: video_title }
            ]
        });

        if (existingVideo) {
            let message = "A video with the same ";
            if (existingVideo.videoNo === parsedVideoNo && existingVideo.video_title === video_title) {
                message += "number and title";
            } else if (existingVideo.videoNo === parsedVideoNo) {
                message += "number";
            } else {
                message += "title";
            }
            message += " already exists in this section.";
            return ThrowError(res, 400, message);
        }

        const section = new CourseSection({
            courseId,
            sectionNo: parsedSectionNo,
            section_title,
            // video,
            videoNo: parsedVideoNo,
            video_title,
            video_time: parsedVideoTime
        });

        const savedSection = await section.save();

        // --- Automatic Total Time Calculation ---
        const sectionVideos = await CourseSection.find({ courseId, sectionNo: parsedSectionNo });
        const newTotalTime = sectionVideos.reduce((sum, vid) => sum + (vid.video_time || 0), 0);

        await CourseSection.updateMany(
            { courseId, sectionNo: parsedSectionNo },
            { $set: { total_time: newTotalTime } }
        );

        // Fetch the created section again to get the updated total_time
        const updatedSavedSection = await CourseSection.findById(savedSection._id);

        res.status(201).json({
            status: true,
            message: "Section video created successfully ",
            data: {
                section: updatedSavedSection,
                fileInfo: {
                    // video: {
                    //     url: video,
                    //     type: req.files.video[0].mimetype,
                    //     size: req.files.video[0].size
                    // }
                }
            }
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get all sections (optional: filter by courseId)
export const getAllSections = async (req, res) => {
    try {
        const { courseId } = req.query;
        let query = {};
        if (courseId) {
            if (!mongoose.Types.ObjectId.isValid(courseId)) {
                return ThrowError(res, 400, "Invalid course ID");
            }
            query.courseId = courseId;
        }
        const sections = await CourseSection.find(query).populate('courseId');
        if (!sections || sections.length === 0) {
            return ThrowError(res, 404, 'No sections found');
        }

        const getBySection = sections.reduce((acc, section) => {
            const sectionNum = section.sectionNo;
            if (!acc[sectionNum]) {
                acc[sectionNum] = [];
            }
            acc[sectionNum].push(section);
            return acc;
        }, {});

        res.status(200).json({
            status: true,
            message: "Sections fetched successfully",
            data: getBySection
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get section by ID
export const getSectionById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return ThrowError(res, 400, "Invalid section ID");
        }
        const section = await CourseSection.findById(req.params.id).populate('courseId');
        if (!section) {
            return ThrowError(res, 404, "Section not found");
        }
        res.status(200).json(section);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Update a section
export const updateSection = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return ThrowError(res, 400, "Invalid section ID");
        }

        const { courseId, sectionNo, section_title, total_time, video, videoNo, video_title, video_time } = req.body;

        const section = await CourseSection.findById(req.params.id);
        if (!section) {
            return ThrowError(res, 404, "Section not found");
        }

        if (courseId && !mongoose.Types.ObjectId.isValid(courseId)) {
            return ThrowError(res, 400, "Invalid course ID");
        }

        if (courseId) {
            const parentContent = await Course.findById(courseId);
            if (!parentContent) {
                return ThrowError(res, 404, "Parent course not found");
            }
        }

        // --- Duplicate check (exclude current section) ---
        const parsedSectionNo = sectionNo !== undefined ? parseInt(sectionNo, 10) : section.sectionNo;
        const parsedVideoNo = videoNo !== undefined ? parseInt(videoNo, 10) : section.videoNo;
        const videoTitleToCheck = video_title !== undefined ? video_title : section.video_title;
        const duplicate = await CourseSection.findOne({
            _id: { $ne: section._id },
            courseId: courseId ?? section.courseId,
            sectionNo: parsedSectionNo,
            $or: [
                { videoNo: parsedVideoNo },
                { video_title: videoTitleToCheck }
            ]
        });
        if (duplicate) {
            let message = "A video with the same ";
            if (duplicate.videoNo === parsedVideoNo && duplicate.video_title === videoTitleToCheck) {
                message += "number and title";
            } else if (duplicate.videoNo === parsedVideoNo) {
                message += "number";
            } else {
                message += "title";
            }
            message += " already exists in this section.";
            return ThrowError(res, 400, message);
        }

        section.courseId = courseId ?? section.courseId;
        section.sectionNo = sectionNo !== undefined ? parsedSectionNo : section.sectionNo;
        section.section_title = section_title ?? section.section_title;
        section.total_time = total_time !== undefined ? parseInt(total_time) : section.total_time;
        section.video = video ?? section.video;
        section.videoNo = videoNo !== undefined ? parsedVideoNo : section.videoNo;
        section.video_title = video_title ?? section.video_title;
        section.video_time = video_time !== undefined ? parseInt(video_time) : section.video_time;


        // --- Automatic Total Time Calculation (after update) ---
        const sectionVideos = await CourseSection.find({ courseId: section.courseId, sectionNo: section.sectionNo });
        const newTotalTime = sectionVideos.reduce((sum, vid) => sum + (vid.video_time || 0), 0);
        await CourseSection.updateMany(
            { courseId: section.courseId, sectionNo: section.sectionNo },
            { $set: { total_time: newTotalTime } }
        );
        // Fetch the updated section again to get the new total_time
        const updatedSectionWithTotal = await CourseSection.findById(section._id);

        res.status(200).json(updatedSectionWithTotal);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Delete a section
export const deleteSection = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return ThrowError(res, 400, "Invalid section ID");
        }

        // Find the section first to get the file URLs
        const section = await CourseSection.findById(req.params.id);
        if (!section) {
            return ThrowError(res, 404, "Section not found");
        }

        // Delete video file from S3
        try {
            if (section.video) {
                await deleteFileFromS3(section.video);
            }
        } catch (s3Error) {
            console.error('Error deleting files from S3:', s3Error);
            // Continue with section deletion even if S3 deletion fails
        }

        // Delete the section from database
        const deletedSection = await CourseSection.findByIdAndDelete(req.params.id);

        res.status(200).json({
            status: true,
            message: "Section and associated files deleted successfully",
            data: {
                section: deletedSection
            }
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

