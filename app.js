const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const apiRouter = require("./router/api");
const connectDB = require("./config/db");
connectDB();
const bcrypt = require("bcrypt");
const userModel = require("./models/user");

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/", apiRouter);
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

const createDefaultAdmin = async () => {
  const isAdminExists = await userModel.findOne({
    email: process.env.ADMIN_EMAIL,
    role: "admin",
  });
  if (isAdminExists) return;
  const adminName = process.env.ADMIN_NAME.split(" ");
  const hashedPass = await bcrypt.hash(process.env.ADMIN_PASS, 10);
  const rec = new userModel({
    fname: adminName[0] ? adminName[0] : "admin",
    lname: adminName[1] ? adminName[1] : "",
    email: process.env.ADMIN_EMAIL,
    pass: hashedPass,
    role: "admin",
  });
  await rec.save();
};
createDefaultAdmin();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is listening on ${PORT}`);
});
