const mongoose = require("mongoose");

const { Schema, model } = mongoose;

const userSchema = new Schema({
  fname: { type: String, require: true },
  lname: { type: String },
  email: { type: String, require: true, unique: true },
  pass: { type: String, require: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
});

module.exports = model("users", userSchema);
