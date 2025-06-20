import CourseSection from "../models/courseSectionModel.js";
import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import Course from "../models/courseModel.js";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';

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
        const { courseId, videoNo, total_time, sectionNo, section_title, video_title, video_time } = req.body;

        // Validate required fields
        if (!courseId || !videoNo || !sectionNo || !section_title || !video_title || !video_time) {
            return ThrowError(res, 400, "Missing required fields: All field are required");
        }

        // Validate files
        if (!req.files) {
            return ThrowError(res, 400, "No files were uploaded. Please upload video files.");
        }

        // Check if video exists in files
        if (!req.files.video || !req.files.video[0]) {
            return ThrowError(res, 400, "Video file is missing. Please upload a video file.");
        }

        // Get file URLs from req.files
        const video = req.files.video[0].location;

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return ThrowError(res, 400, "Invalid course ID");
        }

        // Check if the course exists
        const parentContent = await Course.findById(courseId);
        if (!parentContent) {
            return ThrowError(res, 404, "Parent course not found");
        }

        // Check for duplicate section title in the same course
        const existingSectionWithTitle = await CourseSection.findOne({
            courseId,
            section_title: { $regex: new RegExp(`^${section_title}$`, 'i') } // Case-insensitive match
        });

        if (existingSectionWithTitle) {
            return ThrowError(res, 400, "A section with this title already exists for this course");
        }

        // Check for duplicate video number in the same section
        const existingSectionWithNumber = await CourseSection.findOne({
            courseId,
            sectionNo,
            videoNo
        });

        if (existingSectionWithNumber) {
            return ThrowError(res, 400, "A video with this section and video number already exists");
        }

        const section = new CourseSection({
            courseId,
            sectionNo,
            section_title,
            total_time: total_time ? parseInt(total_time) : undefined,
            video,
            videoNo,
            video_title,
            video_time
        });

        const savedSection = await section.save();

        // Return a more detailed response
        res.status(201).json({
            status: true,
            message: "Section created successfully",
            data: {
                section: savedSection,
                fileInfo: {
                    video: {
                        url: video,
                        type: req.files.video[0].mimetype,
                        size: req.files.video[0].size
                    }
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

        section.courseId = courseId ?? section.courseId;
        section.sectionNo = sectionNo ?? section.sectionNo;
        section.section_title = section_title ?? section.section_title;
        section.total_time = total_time !== undefined ? parseInt(total_time) : section.total_time;
        section.video = video ?? section.video;
        section.videoNo = videoNo ?? section.videoNo;
        section.video_title = video_title ?? section.video_title;
        section.video_time = video_time ?? section.video_time;

        const updatedSection = await section.save();
        res.status(200).json(updatedSection);
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

