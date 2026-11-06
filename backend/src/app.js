import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";

const app = express();
const server = createServer(app);
connectToSocket(server);

const port = Number(process.env.PORT) || 8000;
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim())
  : true;

app.use(cors({ origin: allowedOrigins, credentials: false }));
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.get("/", (_req, res) => res.status(200).json({ message: "TalkRoom API is running" }));
app.use("/api/v1/users", userRoutes);

const start = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing. Add it to backend/.env before starting the server.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);

  server.listen(port, () => {
    console.log(`TalkRoom backend listening on port ${port}`);
  });
};

start().catch((error) => {
  console.error("Failed to start TalkRoom backend:", error.message);
  process.exit(1);
});
