import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  username: { type: String, required: true, unique: true, trim: true, maxlength: 50 },
  password: { type: String, required: true },
  token: { type: String, default: null, index: true },
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export { User };
