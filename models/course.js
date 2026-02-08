const mongoose = require("mongoose");

const { Schema, model } = mongoose;

const courseSchema = new Schema({
  title: { type: String, require: true },
  instructor: { type: String, require: true },
  rating: { type: Number, default: 0 },
  students: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  duration: { type: String, default: "0h 0m" },
  pimage: { type: String },
  category: { type: String, require: true, default: "other" },
});

module.exports = model("courses", courseSchema);
