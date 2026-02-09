const courseModel = require("../models/course");
const queryModel = require("../models/query");
const nodemailer = require("nodemailer");
const imageKit = require("../config/imageKit");

const checkAdmin = (req, res) => res.json({ ok: true });

const addCourse = async (req, res) => {
  try {
    const { title, price, category, instructor, duration } = req.body;
    if (
      !title ||
      !price ||
      !category ||
      !req.file ||
      !instructor ||
      !duration
    ) {
      return res.json({ ok: false, message: "All fields are required!" });
    }
    const { buffer, originalname } = req.file;

    const uploadImage = await imageKit.upload({
      file: buffer,
      fileName: `${Date.now()}-${originalname}`,
      folder: "/courses",
    });

    const record = new courseModel({
      title: title,
      instructor: instructor,
      price: price,
      duration: duration,
      pimage: uploadImage.url,
      category: category,
    });
    await record.save();
    return res.json({ ok: true, message: "Course added successfully" });
  } catch (error) {
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
    const { title, price, category, instructor, duration } = req.body;
    if (!title || !price || !category || !instructor || !duration) {
      return res.json({ ok: false, message: "All fields are required" });
    }

    let isUpdated;
    if (req.file) {
      const { buffer, originalname } = req.file;
      const uploadImage = await imageKit.upload({
        file: buffer,
        fileName: `${Date.now()}-${originalname}`,
        folder: "/courses",
      });
      isUpdated = await courseModel.findByIdAndUpdate(id, {
        $set: {
          pimage: uploadImage.url,
          title: title,
          instructor: instructor,
          price: price,
          duration: duration,
          category: category,
        },
      });
    } else {
      isUpdated = await courseModel.findByIdAndUpdate(id, {
        $set: {
          title: title,
          instructor: instructor,
          price: price,
          duration: duration,
          category: category,
        },
      });
    }

    if (!isUpdated) {
      return res.json({ ok: false, message: "Cannot update this course" });
    }
    return res.json({ ok: true, message: "Updated Successfully" });
  } catch (error) {
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
