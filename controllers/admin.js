const courseModel = require("../models/course");
const queryModel = require("../models/query");
const nodemailer = require("nodemailer");
const imageKit = require("../config/imageKit");
const cloudinary = require("../config/cloudinary");
const https = require("https");

const convertToEmbed = (url) => {
  if (!url) return "";
  let videoId = "";
  if (url.includes("v=")) {
    videoId = url.split("v=")[1]?.split("&")[0];
  } else if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1]?.split("?")[0];
  } else if (url.includes("embed/")) {
    videoId = url.split("embed/")[1]?.split("?")[0];
  }
  return `https://www.youtube.com/embed/${videoId}`;
};

const parseISO8601Duration = (duration) => {
  if (!duration) return 0;
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  return hours * 3600 + minutes * 60 + seconds;
};

const formatSeconds = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

const parseFormattedDuration = (durationStr) => {
  if (!durationStr) return 0;
  const parts = durationStr.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

const formatCourseDuration = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const getDurationFromYoutube = (url) => {
  return new Promise((resolve, reject) => {
    let videoId = "";
    if (url.includes("v=")) {
      videoId = url.split("v=")[1]?.split("&")[0];
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0];
    } else if (url.includes("embed/")) {
      videoId = url.split("embed/")[1]?.split("?")[0];
    }

    if (!videoId) return resolve("00:00");

    const apiKey = process.env.YT_API_KEY;
    if (!apiKey) {
      console.log("YT_API_KEY not found");
      return resolve("00:00");
    }

    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${apiKey}`;

    https
      .get(apiUrl, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            if (response.items && response.items.length > 0) {
              const duration = response.items[0].contentDetails.duration;
              const totalSeconds = parseISO8601Duration(duration);
              resolve(formatSeconds(totalSeconds));
            } else {
              resolve("00:00");
            }
          } catch (error) {
            console.error("Error parsing YouTube API response:", error);
            resolve("00:00");
          }
        });
      })
      .on("error", (err) => {
        console.error("Error fetching YouTube duration:", err);
        resolve("00:00");
      });
  });
};

const uploadVideoToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: "courses_videos",
        eager: [{ streaming_profile: "hd", format: "m3u8" }],
        eager_async: true,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
    uploadStream.end(buffer);
  });
};

const checkAdmin = (req, res) => res.json({ ok: true });

const addCourse = async (req, res) => {
  try {
    const { title, price, category, instructor } = req.body;
    let modules = [];
    if (req.body.modules) {
      modules = JSON.parse(req.body.modules);
    }

    if (!title || !price || !category || !req.files || !instructor) {
      return res.json({ ok: false, message: "All fields are required!" });
    }

    const courseImageFile = req.files.find((f) => f.fieldname === "pimage");
    if (!courseImageFile) {
      return res.json({ ok: false, message: "Course image is required!" });
    }

    const { buffer, originalname } = courseImageFile;

    const uploadImage = await imageKit.upload({
      file: buffer,
      fileName: `${Date.now()}-${originalname}`,
      folder: "/courses",
    });

    let totalDurationSeconds = 0;

    // Process modules and upload videos
    for (let i = 0; i < modules.length; i++) {
      for (let j = 0; j < modules[i].lessons.length; j++) {
        const lesson = modules[i].lessons[j];
        if (lesson.videoType === "youtube") {
          // Fetch duration before converting to embed URL
          lesson.duration = await getDurationFromYoutube(lesson.videoUrl);
          lesson.videoUrl = convertToEmbed(lesson.videoUrl);
        } else if (lesson.videoType === "cloudinary") {
          const videoFile = req.files.find(
            (f) => f.fieldname === `video_${i}_${j}`,
          );
          if (videoFile) {
            const videoUpload = await uploadVideoToCloudinary(videoFile.buffer);
            const m3u8Url = videoUpload.eager[0].secure_url;
            lesson.videoUrl = m3u8Url;
            // Cloudinary returns duration in seconds
            if (videoUpload.duration) {
              lesson.duration = formatSeconds(Math.round(videoUpload.duration));
            } else {
              lesson.duration = "00:00";
            }
          }
        }

        // Accumulate duration
        totalDurationSeconds += parseFormattedDuration(lesson.duration);
      }
    }

    const record = new courseModel({
      title: title,
      instructor: instructor,
      price: price,
      duration: formatCourseDuration(totalDurationSeconds),
      pimage: uploadImage.url,
      category: category,
      modules: modules,
      description: req.body.description || "",
    });
    await record.save();
    return res.json({ ok: true, message: "Course added successfully" });
  } catch (error) {
    console.log(error);
    return res.json({ ok: false, message: "Internal server error" });
  }
};

const getCourses = async (req, res) => {
  try {
    const data = await courseModel.find();
    if (!data) {
      return res.json({ ok: false, message: "Cannot find any course" });
    }
    return res.json({ ok: true, data: data });
  } catch (error) {
    console.log("Internal server error");
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    await courseModel.findByIdAndDelete(id);
    const data = await courseModel.find();
    return res.json({ ok: true, data: data });
  } catch (error) {
    res.json({ ok: false, message: "Internal server error" });
  }
};

const getOneCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await courseModel.findById(id);
    if (!record) {
      return res.json({ ok: false, message: "Cannot find course" });
    }
    return res.json({ ok: true, data: record });
  } catch (error) {
    res.json({ ok: false, message: "Internal server error" });
  }
};

const editCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, price, category, instructor, description } = req.body;
    let modules = [];
    if (req.body.modules) {
      modules = JSON.parse(req.body.modules);
    }

    if (!title || !price || !category || !instructor) {
      return res.json({ ok: false, message: "All fields are required" });
    }

    // Fetch existing course to compare lessons
    const existingCourse = await courseModel.findById(id);
    if (!existingCourse) {
      return res.json({ ok: false, message: "Cannot find course" });
    }

    // Create a map of existing lessons for quick lookup
    const existingLessonsMap = new Map();
    existingCourse.modules.forEach((mod) => {
      mod.lessons.forEach((less) => {
        if (less._id) {
          existingLessonsMap.set(less._id.toString(), less);
        }
      });
    });

    let updateData = {
      title,
      instructor,
      price,
      // duration will be set after calculation
      category,
      modules,
      description,
    };

    // Handle Image upload if present
    if (req.files) {
      const courseImageFile = req.files.find((f) => f.fieldname === "pimage");
      if (courseImageFile) {
        const { buffer, originalname } = courseImageFile;
        const uploadImage = await imageKit.upload({
          file: buffer,
          fileName: `${Date.now()}-${originalname}`,
          folder: "/courses",
        });
        updateData.pimage = uploadImage.url;
      }
    }

    let totalDurationSeconds = 0;

    // Handle Modules Video Uploads
    for (let i = 0; i < modules.length; i++) {
      for (let j = 0; j < modules[i].lessons.length; j++) {
        const lesson = modules[i].lessons[j];

        if (lesson.videoType === "youtube" && lesson.videoUrl) {
          // New YouTube URL or existing one - always fetch duration to ensure accuracy
          // This uses the endpoint: https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=VideoId&key=YT_API_KEY
          lesson.duration = await getDurationFromYoutube(lesson.videoUrl);
          lesson.videoUrl = convertToEmbed(lesson.videoUrl);
        } else if (lesson.videoType === "cloudinary") {
          // Check for new file upload
          if (req.files) {
            const videoFile = req.files.find(
              (f) => f.fieldname === `video_${i}_${j}`,
            );
            if (videoFile) {
              const videoUpload = await uploadVideoToCloudinary(
                videoFile.buffer,
              );
              const m3u8Url = videoUpload.eager[0].secure_url;
              lesson.videoUrl = m3u8Url;
              if (videoUpload.duration) {
                lesson.duration = formatSeconds(
                  Math.round(videoUpload.duration),
                );
              }
            } else if (
              lesson._id &&
              existingLessonsMap.has(lesson._id.toString())
            ) {
              // Preserve existing duration if no new file
              const existingLesson = existingLessonsMap.get(
                lesson._id.toString(),
              );
              if (!lesson.duration) lesson.duration = existingLesson.duration;
            }
          }
        }

        // Fail-safe logic: if duration is still missing (e.g. existing cloudinary video not re-uploaded), try to get from existing map
        if (
          !lesson.duration &&
          lesson._id &&
          existingLessonsMap.has(lesson._id.toString())
        ) {
          lesson.duration = existingLessonsMap.get(
            lesson._id.toString(),
          ).duration;
        }

        // Accumulate duration
        totalDurationSeconds += parseFormattedDuration(lesson.duration);
      }
    }

    updateData.duration = formatCourseDuration(totalDurationSeconds);

    const isUpdated = await courseModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    );

    if (!isUpdated) {
      return res.json({ ok: false, message: "Cannot update this course" });
    }
    return res.json({ ok: true, message: "Updated Successfully" });
  } catch (error) {
    console.log(error);
    return res.json({ ok: false, message: "Internal server error" });
  }
};

const getQueries = async (req, res) => {
  try {
    const record = await queryModel.find();
    if (!record) {
      return res.json({ ok: false, message: "No queries" });
    }
    return res.json({ ok: true, data: record });
  } catch (error) {
    return res.json({ ok: false, message: "Internal server error" });
  }
};

const deleteQuery = async (req, res) => {
  try {
    const { qid } = req.params;
    await queryModel.findByIdAndDelete(qid);
    const record = await queryModel.find();
    return res.json({ ok: true, data: record });
  } catch (error) {
    return res.json({ ok: false, message: "Internal server error" });
  }
};

const getOneQuery = async (req, res) => {
  try {
    const { qid } = req.params;
    const record = await queryModel.findById(qid);
    if (!record) {
      return res.json({ ok: false, message: "Cannot find query" });
    }
    return res.json({ ok: true, data: record, from: process.env.ADMIN_EMAIL });
  } catch (error) {
    return res.json({ ok: false, message: "Internal server error" });
  }
};

const updateQuery = async (req, res) => {
  try {
    const { qid } = req.params;
    await queryModel.findByIdAndUpdate(qid, { status: "Seen" });
    const record = await queryModel.find();
    return res.json({ ok: true, data: record });
  } catch (error) {
    return res.json({ ok: false, message: "Internal server error" });
  }
};

const queryReply = async (req, res) => {
  try {
    const { qid } = req.params;
    const { to, sub, reply } = req.body;
    if (!to || !sub || !reply) {
      return res.json({ ok: false, message: "All fields are required" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.ADMIN_EMAIL,
        pass: process.env.SMTP_PASS,
      },
    });
    const info = await transporter.sendMail({
      from: `"SkillNest" <${process.env.ADMIN_EMAIL}>`,
      to: to,
      subject: sub,
      text: reply,
      html: reply,
    });
    if (!info) {
      return res.json({ ok: false, message: "Cannot sent" });
    }
    await queryModel.findByIdAndUpdate(qid, { status: "Replied" });
    return res.json({ ok: true, message: "Successfully sent" });
  } catch (error) {
    console.log(error);
    res.json({ ok: false, message: "Internal server error" });
  }
};

module.exports = {
  checkAdmin,
  addCourse,
  getCourses,
  deleteCourse,
  getOneCourse,
  editCourse,
  getQueries,
  deleteQuery,
  getOneQuery,
  updateQuery,
  queryReply,
};
