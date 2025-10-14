import CourseSection from "../models/courseSectionModel.js";
import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import Course from "../models/courseModel.js";
import path from "path";
import fs from "fs";
import { sendErrorResponse, sendSuccessResponse } from "../utils/ResponseUtils.js"


// Create a new section
export const createSection = async (req, res) => {
    try {
        const { courseId, videoNo, sectionNo, section_title, video_title, video_time } = req.body;

        // Validate required fields
        if (!courseId || !videoNo || !sectionNo || !section_title || !video_title || !video_time) {
            return ThrowError(res, 400, "Missing required fields: All fields are required");
        }

        // Validate files
        if (!req.files || !req.files.video || !req.files.video[0]) {
            return ThrowError(res, 400, "Video file is missing. Please upload a video file.");
        }

        // Get file URLs from req.files
        const video = req.files.video[0].path || req.files.video[0].location || "";

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
            // Clean up uploaded video if duplicate section
            if (req.files && req.files.video && req.files.video[0]) {
                const videoPath = path.resolve(req.files.video[0].path);
                if (fs.existsSync(videoPath)) {
                    fs.unlinkSync(videoPath);
                }
            }
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
            video,
            videoNo: parsedVideoNo,
            video_title,
            video_time: parsedVideoTime
        });

        await section.save();

        // --- Automatic Total Time Calculation ---
        const sectionVideos = await CourseSection.find({ courseId, sectionNo: parsedSectionNo });
        const newTotalTime = sectionVideos.reduce((sum, vid) => sum + (vid.video_time || 0), 0);

        await CourseSection.updateMany(
            { courseId, sectionNo: parsedSectionNo },
            { $set: { total_time: newTotalTime } }
        );

        // Fetch the created section again to get the updated total_time
        const updatedSavedSection = await CourseSection.findById(section._id);

        res.status(201).json({
            status: true,
            message: "Section video created successfully ",
            data: {
                section: updatedSavedSection,
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

// Get all sections for a particular course
export const getSectionsByCourseId = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return ThrowError(res, 400, "Invalid course ID");
        }

        const sections = await CourseSection.find({ courseId }).sort({ sectionNo: 1, videoNo: 1 });

        if (!sections.length) {
            return sendSuccessResponse(res, "No sections found for this course", []);
        }

        const grouped = sections.reduce((acc, section) => {
            const secNo = section.sectionNo;
            if (!acc[secNo]) {
                acc[secNo] = {
                    sectionNo: section.sectionNo,
                    section_title: section.section_title,
                    total_time: 0,
                    videos: []
                };
            }

            acc[secNo].videos.push({
                _id: section._id,
                videoNo: section.videoNo,
                video_title: section.video_title,
                video_time: section.video_time,
                video: section.video
            });

            acc[secNo].total_time += section.video_time || 0;

            return acc;
        }, {});

        const formattedSections = Object.values(grouped).sort((a, b) => a.sectionNo - b.sectionNo);

        return sendSuccessResponse(res, "Sections fetched successfully", formattedSections);

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

        const { courseId, sectionNo, section_title, total_time, videoNo, video_title, video_time } = req.body;

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
            section.courseId = courseId;
        }

        // If a new video file is uploaded, delete the old file and update the path
        if (req.files && req.files.video && req.files.video[0]) {
            if (section.video) {
                const oldVideoPath = path.resolve(section.video);
                if (fs.existsSync(oldVideoPath)) {
                    fs.unlinkSync(oldVideoPath);
                }
            }
            section.video = req.files.video[0].path;
        }

        // Update other fields if provided
        section.sectionNo = sectionNo !== undefined ? parseInt(sectionNo, 10) : section.sectionNo;
        section.section_title = section_title ?? section.section_title;
        section.total_time = total_time !== undefined ? parseInt(total_time) : section.total_time;
        section.videoNo = videoNo !== undefined ? parseInt(videoNo, 10) : section.videoNo;
        section.video_title = video_title ?? section.video_title;
        section.video_time = video_time !== undefined ? parseInt(video_time) : section.video_time;

        // --- Automatic Total Time Calculation (after update) ---
        const savedSection = await section.save();
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
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return ThrowError(res, 400, "Invalid section ID");
        }

        // Find the section first to get the file URLs
        const existingSection = await CourseSection.findById(id);
        if (!existingSection) {
            return sendErrorResponse(res, 404, "Section not found");
        }

        // Delete video file if exists
        if (existingSection.video) {
            const videoPath = path.resolve(existingSection.video);
            if (fs.existsSync(videoPath)) {
                fs.unlinkSync(videoPath);
            }
        }

        // Delete the section from database
        const deletedSection = await CourseSection.findByIdAndDelete(id);

        return sendSuccessResponse(res, "Section and associated files deleted successfully", deletedSection);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};



