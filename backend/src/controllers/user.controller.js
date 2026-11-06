import httpStatus from "http-status";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";

const login = async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = req.body?.password;
  if (!username || typeof password !== "string" || !password) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: "Username and password are required." });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid username or password." });

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid username or password." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.token = token;
    await user.save();
    return res.status(httpStatus.OK).json({ token });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Unable to log in right now." });
  }
};

const register = async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const username = String(req.body?.username || "").trim();
  const password = req.body?.password;

  if (!name || !username || typeof password !== "string") {
    return res.status(httpStatus.BAD_REQUEST).json({ message: "Name, username and password are required." });
  }
  if (password.length < 6) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: "Password must contain at least 6 characters." });
  }
  if (name.length > 80 || username.length > 50) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: "Name or username is too long." });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(httpStatus.CONFLICT).json({ message: "Username already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({ name, username, password: hashedPassword });
    return res.status(httpStatus.CREATED).json({ message: "User registered successfully." });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(httpStatus.CONFLICT).json({ message: "Username already exists." });
    }
    console.error("Registration error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Unable to register right now." });
  }
};

const getUserHistory = async (req, res) => {
  const token = String(req.query?.token || "");
  if (!token) return res.status(httpStatus.UNAUTHORIZED).json({ message: "Authentication required." });

  try {
    const user = await User.findOne({ token }).select("username");
    if (!user) return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid session. Please log in again." });
    const meetings = await Meeting.find({ user_id: user.username }).sort({ date: -1 }).lean();
    return res.status(httpStatus.OK).json(meetings);
  } catch (error) {
    console.error("Get history error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Unable to fetch meeting history." });
  }
};

const addToHistory = async (req, res) => {
  const token = String(req.body?.token || "");
  const meetingCode = String(req.body?.meeting_code || "").trim();
  if (!token) return res.status(httpStatus.UNAUTHORIZED).json({ message: "Authentication required." });
  if (!meetingCode || meetingCode.length > 200) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: "A valid meeting code is required." });
  }

  try {
    const user = await User.findOne({ token }).select("username");
    if (!user) return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid session. Please log in again." });
    await Meeting.create({ user_id: user.username, meetingCode });
    return res.status(httpStatus.CREATED).json({ message: "Meeting added to history." });
  } catch (error) {
    console.error("Add history error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Unable to save meeting history." });
  }
};

export { login, register, getUserHistory, addToHistory };
