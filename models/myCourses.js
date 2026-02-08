const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const myCoursesSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "users" },
  myCourses: [],
});

module.exports = model("myCourses", myCoursesSchema);
