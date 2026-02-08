const mongoose = require("mongoose");

const { Schema, model } = mongoose;

const orderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "users" },
  orderId: String,
  paymentId: String,
  signature: String,
  amount: Number,
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now() },
});

module.exports = model("orders", orderSchema);
