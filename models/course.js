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
  description: String,
  modules: [
    {
      title: String,
      lessons: [
        {
          title: String,
          videoType: {
            type: String,
            enum: ["youtube", "cloudinary"],
            required: true,
          },
          videoUrl: String,
          duration: { type: String, default: "00:00" },
        },
      ],
    },
  ],
});

module.exports = model("courses", courseSchema);
