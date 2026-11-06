import mongoose, { Schema } from "mongoose";

const meetingSchema = new Schema({
  user_id: { type: String, required: true, index: true },
  meetingCode: { type: String, required: true, trim: true, maxlength: 200 },
  date: { type: Date, default: Date.now, required: true, index: true },
});

const Meeting = mongoose.model("Meeting", meetingSchema);
export { Meeting };
