import { Server } from "socket.io";

const roomMessages = new Map();
const socketRooms = new Map();
const MAX_STORED_MESSAGES = 100;

export const connectToSocket = (httpServer) => {
  const allowedOrigins = process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim())
    : "*";

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join-call", async (rawRoom) => {
      const room = String(rawRoom || "")
        .trim()
        .slice(0, 200);

      if (!room) return;

      const previousRoom = socketRooms.get(socket.id);

      // Prevent duplicate joining of the same room.
      if (previousRoom === room) {
        return;
      }

      // Leave the previous room if necessary.
      if (previousRoom) {
        socket.to(previousRoom).emit("user-left", socket.id);

        await socket.leave(previousRoom);

        socketRooms.delete(socket.id);
      }

      // Reserve the room before asynchronous operations.
      socketRooms.set(socket.id, room);

      try {
        const existingSockets = await io.in(room).fetchSockets();

        const existingUsers = [
          ...new Set(
            existingSockets
              .map((client) => client.id)
              .filter((id) => id !== socket.id),
          ),
        ];

        await socket.join(room);

        console.log(
          `Socket ${socket.id} joined room ${room}. Participants: ${existingUsers.length + 1}`,
        );

        // Send existing participants to the joining user.
        socket.emit("all-users", existingUsers);

        // Notify existing participants about the new user.
        socket.to(room).emit("user-joined", socket.id);

        // Send recent chat history.
        const history = roomMessages.get(room) || [];

        history.forEach((entry) => {
          socket.emit("chat-message", entry.data, entry.sender, entry.socketId);
        });
      } catch (error) {
        socketRooms.delete(socket.id);
        console.error("Room join error:", error);
      }
    });

    socket.on("signal", (toId, payload) => {
      const room = socketRooms.get(socket.id);

      if (
        !room ||
        typeof toId !== "string" ||
        !payload ||
        socketRooms.get(toId) !== room
      ) {
        return;
      }

      if (typeof payload !== "object" && typeof payload !== "string") {
        return;
      }

      io.to(toId).emit("signal", socket.id, payload);
    });

    socket.on("chat-message", (rawData, rawSender) => {
      const room = socketRooms.get(socket.id);

      if (!room || typeof rawData !== "string") {
        return;
      }

      const data = rawData.trim().slice(0, 2000);

      const sender =
        String(rawSender || "Guest")
          .trim()
          .slice(0, 60) || "Guest";

      if (!data) return;

      const entry = {
        data,
        sender,
        socketId: socket.id,
      };

      const history = roomMessages.get(room) || [];

      history.push(entry);

      if (history.length > MAX_STORED_MESSAGES) {
        history.shift();
      }

      roomMessages.set(room, history);

      io.to(room).emit("chat-message", data, sender, socket.id);
    });

    socket.on("disconnect", () => {
      const room = socketRooms.get(socket.id);

      if (room) {
        // Notify remaining participants.
        io.to(room).emit("user-left", socket.id);

        socketRooms.delete(socket.id);

        console.log(`Socket ${socket.id} left room ${room}`);
      }

      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
};
