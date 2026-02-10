const model = require("../models/user");
const courseModel = require("../models/course");
const queryModel = require("../models/query");
const myCoursesModel = require("../models/myCourses");
const orderModel = require("../models/order");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const checkUser = (req, res) => res.json({ ok: true, user: req.user });

const reg = async (req, res) => {
  try {
    const { fname, lname, email, pass1 } = req.body;

    if (!fname || !email || !pass1) {
      return res.json({
        message: "first name, email or password is/are missing!",
      });
    }

    const isEmailExists = await model.findOne({ email: email });
    if (isEmailExists) {
      return res.json({ ok: false, message: "Email already Exists!" });
    }
    const hashedPassword = await bcrypt.hash(pass1, 10);
    const record = new model({
      fname: fname,
      lname: lname,
      email: email,
      pass: hashedPassword,
    });
    await record.save();

    const token = jwt.sign({ ...record["_doc"] }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    await res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.ENV === "prod",
      sameSite: process.env.ENV === "prod" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.json({ ok: true, message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, pass } = req.body;

    const emailExists = await model.findOne({ email: email });
    if (!emailExists) {
      return res.json({ ok: false, message: "Email does not exist!" });
    }

    const isPass = await bcrypt.compare(pass, emailExists.pass);
    if (!isPass) {
      return res.json({ ok: false, message: "Invalid Password!" });
    }

    const token = jwt.sign(
      { ...emailExists["_doc"] },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
      },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.ENV === "prod",
      sameSite: process.env.ENV === "prod" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      ok: true,
      message: `${
        emailExists.role == "admin" ? "Welcome Admin" : "Login Successfully"
      }`,
      userId: emailExists._id,
    });
  } catch (error) {
    res.status(500).json({ error });
  }
};

const query = async (req, res) => {
  try {
    const { username, email, query } = req.body;
    if (!username || !email || !query) {
      return res.json({ ok: false, message: "All fields are required" });
    }
    const record = new queryModel({
      username: username,
      email: email,
      query: query,
    });
    await record.save();
    return res.json({ ok: true, message: "Query Submitted Successfully" });
  } catch (error) {
    return res.json({ ok: false, message: "Internal server error" });
  }
};

const enroll = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseData } = req.body;
    const isCourseExists = await myCoursesModel.findOne({ userId });
    if (isCourseExists) {
      isCourseExists.userId = userId;
      isCourseExists.myCourses = courseData;
      await isCourseExists.save();
    } else {
      const record = new myCoursesModel({
        userId,
        myCourses: courseData,
      });
      await record.save();
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.json({ ok: false, message: "Internal server error" });
  }
};

const myCourses = async (req, res) => {
  try {
    const { id } = req.user;
    const rec = await myCoursesModel.findOne({ userId: id });
    return res.json({ ok: true, data: rec });
  } catch (error) {
    return res.json({ ok: false, message: "Internal server error" });
  }
};

const checkout = async (req, res) => {
  const instance = new Razorpay({
    key_id: process.env.RAZORPAY_ID,
    key_secret: process.env.RAZORPAY_SECRET_KEY,
  });

  try {
    const { amount, currency, receipt } = req.body;
    const userId = req.user.id || req.user._id;
    const user = await model.findById(userId);

    if (!user) {
      return res.json({ ok: false, message: "User not found" });
    }

    const { fname, lname, email } = user;

    const order = await instance.orders.create({
      amount: amount * 100,
      currency,
      receipt,
      notes: {
        name: fname.concat(" ", lname),
        userId: userId,
      },
    });
    if (!order) {
      return res.json({ ok: false, message: "Error creating order" });
    }
    return res.json({ ok: true, data: order, email });
  } catch (error) {
    console.log(error);
    res.json({ ok: false, message: "Internal server error" });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { amount, orderId, paymentId, signature, courseId } = req.body;
    const userId = req.user.id;

    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET_KEY);
    hmac.update(orderId + "|" + paymentId);
    const generateSignature = hmac.digest("hex");
    if (generateSignature === signature) {
      const rec = new orderModel({
        userId,
        orderId,
        paymentId,
        signature,
        amount,
        status: "paid",
      });
      await rec.save();

      const isCourseExists = await myCoursesModel.findOne({ userId });
      if (isCourseExists) {
        isCourseExists.userId = userId;
        isCourseExists.myCourses = courseId;
        await isCourseExists.save();
      } else {
        const record = new myCoursesModel({
          userId,
          myCourses: courseId,
        });
        await record.save();
      }

      const course = await courseModel.findById(courseId);
      if (course) {
        course.students += 1;
        await course.save();
      }

      return res.json({ ok: true, message: "Payment Success" });
    } else {
      return res.json({ ok: false, message: "Payment verification failed" });
    }
  } catch (error) {
    res.json({ ok: false, message: "Internal server error" });
  }
};

const logout = async (req, res) => {
  try {
    await res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.ENV === "prod",
      sameSite: process.env.ENV === "prod" ? "none" : "lax",
    });
    return res.json({ ok: true, message: "Successfully Logout" });
  } catch (error) {
    res.json({ ok: false, message: "Internal server error" });
  }
};

module.exports = {
  reg,
  login,
  query,
  enroll,
  myCourses,
  checkout,
  verifyPayment,
  checkUser,
  logout,
};
