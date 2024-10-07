import express from "express";
import http from "http";
import { Server as socketio } from "socket.io";
import connectDB from "./db.js";
import User from "./models/User.js";
import Message from "./models/Message.js";
import cors from "cors";
import jwt from "jsonwebtoken";

const app = express();
const server = http.createServer(app);
const io = new socketio(server, {
  cors: {
    origin: "http://localhost:5173", // Frontend Vite server URL
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

connectDB(); // Connect to MongoDB

// Store the socket ID and corresponding user names
const users = {};

// User Registration
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "All fields (name, email, password) are required" });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    const user = new User({ name, email, password });
    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// User Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user._id }, "your_jwt_secret", {
      expiresIn: "1h",
    });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Middleware to authenticate user
const authenticateJWT = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.sendStatus(403);

  jwt.verify(token, "your_jwt_secret", (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Fetch all users, authenticateJWT,
app.get("/api/users",async (req, res) => {
  try {
    const users = await User.find({}, { name: 1 }); // Fetch only user names
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Handle Socket.io connections
io.on("connection", (socket) => {
  console.log("New connection");

  // Handle new user joining
  socket.on("new-user-joined", (name) => {
    users[socket.id] = { name, socketId: socket.id };
    socket.broadcast.emit("user-list", users);
    console.log(`${name} has joined the chat.`);
  });

  // Handle private message
  socket.on("private-message", ({ to, message }) => {
    const senderName = users[socket.id].name;
    const recipientSocketId = users[to]?.socketId;

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receive", {
        name: senderName,
        message,
        from: socket.id,
      });
    }
  });

  // Handle group message
  socket.on("group-message", (message) => {
    const senderName = users[socket.id].name;
    socket.broadcast.emit("receive", {
      name: senderName,
      message,
    });
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    const userName = users[socket.id]?.name;
    socket.broadcast.emit("user-left", userName);
    delete users[socket.id];
    socket.broadcast.emit("user-list", users);
    console.log(`${userName} has left the chat.`);
  });
});

// Start the server
server.listen(8000, () => {
  console.log("Server is running on port 8000");
});
