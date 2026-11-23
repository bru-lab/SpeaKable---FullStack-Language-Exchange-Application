import { configureSocket } from "../lib/socket.js";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";

import authRoute from "../routes/auth.route.js";
import userRoute from "../routes/user.route.js";
import exchangeRequestRoute from "../routes/exchangeRequest.route.js";
import conversationRoute from "../routes/conversation.route.js";
import messageRoute from "../routes/message.route.js";

import connectDB from "../lib/db.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const normalizeOrigin = (origin) => {
    return origin?.trim().replace(/\/+$/, "");
};

const allowedOrigins = [
    "http://localhost:8081",
    "http://192.168.15.8:8081",
    process.env.FRONTEND_URL,
]
    .map(normalizeOrigin)
    .filter(Boolean);

console.log("Allowed CORS origins:", allowedOrigins);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
            return callback(null, true);
        }

        console.error("Blocked CORS origin:", origin);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json({ limit: "10mb" }));

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb",
    })
);

app.use(cookieParser());

// Socket.IO configuration
const io = new Server(httpServer, {
    cors: corsOptions,
});

// Make Socket.IO accessible inside Express controllers
app.set("io", io);

// Socket connection events
configureSocket(io);

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        message: "SpeakAble API is running",
    });
});

// Routes
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/exchange-requests", exchangeRequestRoute);
app.use("/api/conversations", conversationRoute);
app.use("/api/messages", messageRoute);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        httpServer.listen(PORT, "0.0.0.0", () => {
            console.log(`SpeakAble server running on PORT: ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();