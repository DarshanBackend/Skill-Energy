import CourseSection from "../models/courseSectionModel.js";
import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import Course from "../models/courseModel.js";
import { sendErrorResponse, sendSuccessResponse } from "../utils/ResponseUtils.js";
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

export const createSection = async (req, res) => {
    let uploadedVideo = null;

    try {
        const { courseId, videoNo, sectionNo, section_title, video_title, video_time } = req.body;

        if (!courseId || !videoNo || !sectionNo || !section_title || !video_title || !video_time) {
            return ThrowError(res, 400, "Missing required fields: All fields are required");
        }

        if (!req.files || !req.files.video || !req.files.video[0]) {
            return ThrowError(res, 400, "Video file is missing. Please upload a video file.");
        }

        uploadedVideo = req.files.video[0];

        const video = uploadedVideo.key ? publicUrlForKey(uploadedVideo.key) : "";
        const video_key = uploadedVideo.key || null;

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            await cleanupUploadedIfAny(uploadedVideo);
            return ThrowError(res, 400, "Invalid course ID");
        }

        const parentContent = await Course.findById(courseId);
        if (!parentContent) {
            await cleanupUploadedIfAny(uploadedVideo);
            return ThrowError(res, 404, "Parent course not found");
        }

        const parsedSectionNo = parseInt(sectionNo, 10);
        const parsedVideoNo = parseInt(videoNo, 10);
        const numericVideoTimeString = video_time.toString().replace(/[^0-9]/g, '');
        const parsedVideoTime = parseInt(numericVideoTimeString, 10);

        if (isNaN(parsedVideoTime)) {
            await cleanupUploadedIfAny(uploadedVideo);
            return ThrowError(res, 400, "Invalid format for video_time. Please provide a number.");
        }

        const existingVideo = await CourseSection.findOne({
            courseId,
            sectionNo: parsedSectionNo,
            $or: [
                { videoNo: parsedVideoNo },
                { video_title: video_title }
            ]
        });

        if (existingVideo) {
            await cleanupUploadedIfAny(uploadedVideo);
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
            video_key,
            videoNo: parsedVideoNo,
            video_title,
            video_time: parsedVideoTime
        });

        await section.save();

        const sectionVideos = await CourseSection.find({ courseId, sectionNo: parsedSectionNo });
        const newTotalTime = sectionVideos.reduce((sum, vid) => sum + (vid.video_time || 0), 0);

        await CourseSection.updateMany(
            { courseId, sectionNo: parsedSectionNo },
            { $set: { total_time: newTotalTime } }
        );

        const updatedSavedSection = await CourseSection.findById(section._id);

        res.status(201).json({
            status: true,
            message: "Section video created successfully",
            data: {
                section: updatedSavedSection,
                fileInfo: {
                    video: {
                        url: video,
                        key: video_key,
                        type: uploadedVideo.mimetype,
                        size: uploadedVideo.size
                    }
                }
            }
        });
    } catch (error) {
        await cleanupUploadedIfAny(uploadedVideo);
        return ThrowError(res, 500, error.message);
    }
};

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

export const updateSection = async (req, res) => {
    let uploadedVideo = null;

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

        if (req.files && req.files.video && req.files.video[0]) {
            uploadedVideo = req.files.video[0];

            if (section.video_key) {
                try {
                    await s3.send(
                        new DeleteObjectCommand({
                            Bucket: process.env.S3_BUCKET_NAME,
                            Key: section.video_key,
                        })
                    );
                } catch (error) {
                    console.error('Error deleting old video from S3:', error.message);
                }
            }

            section.video = uploadedVideo.key ? publicUrlForKey(uploadedVideo.key) : "";
            section.video_key = uploadedVideo.key || null;
        }

        section.sectionNo = sectionNo !== undefined ? parseInt(sectionNo, 10) : section.sectionNo;
        section.section_title = section_title ?? section.section_title;
        section.total_time = total_time !== undefined ? parseInt(total_time) : section.total_time;
        section.videoNo = videoNo !== undefined ? parseInt(videoNo, 10) : section.videoNo;
        section.video_title = video_title ?? section.video_title;
        section.video_time = video_time !== undefined ? parseInt(video_time) : section.video_time;

        const savedSection = await section.save();
        const sectionVideos = await CourseSection.find({ courseId: section.courseId, sectionNo: section.sectionNo });
        const newTotalTime = sectionVideos.reduce((sum, vid) => sum + (vid.video_time || 0), 0);
        await CourseSection.updateMany(
            { courseId: section.courseId, sectionNo: section.sectionNo },
            { $set: { total_time: newTotalTime } }
        );
        
        const updatedSectionWithTotal = await CourseSection.findById(section._id);
        
        return sendSuccessResponse(res, "Section updated successfully", updatedSectionWithTotal);
    } catch (error) {
        await cleanupUploadedIfAny(uploadedVideo);
        return ThrowError(res, 500, error.message);
    }
};

export const deleteSection = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return ThrowError(res, 400, "Invalid section ID");
        }

        const existingSection = await CourseSection.findById(id);
        if (!existingSection) {
            return sendErrorResponse(res, 404, "Section not found");
        }

        if (existingSection.video_key) {
            try {
                await s3.send(
                    new DeleteObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: existingSection.video_key,
                    })
                );
            } catch (error) {
                console.error('Error deleting video from S3:', error.message);
            }
        }

        const deletedSection = await CourseSection.findByIdAndDelete(id);

        return sendSuccessResponse(res, "Section and associated files deleted successfully", deletedSection);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};