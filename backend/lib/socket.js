import jwt from "jsonwebtoken";
import Conversation from "../models/conversation.model.js";
import Message from '../models/message.model.js';

// Track connected users and their socket connections.
// Map structure:
// userId -> Set of socket IDs
export const onlineUsers = new Map();

const getTokenFromCookie = (cookieHeader) => {
    if (!cookieHeader) return null;

    const jwtCookie = cookieHeader
        .split(";")
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith("jwt="));

    return jwtCookie
        ? decodeURIComponent(jwtCookie.slice(4))
        : null;
};

export const configureSocket = (io) => {
    // Authenticate socket connections
    io.use((socket, next) => {
        try {
            const token =
                socket.handshake.auth?.token ||
                getTokenFromCookie(
                    socket.handshake.headers.cookie
                );

            if (!token) {
                return next(
                    new Error("Authentication required")
                );
            }

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            if (!decoded.userId) {
                return next(
                    new Error("Invalid authentication token")
                );
            }

            socket.userId = decoded.userId.toString();

            next();
        } catch (error) {
            next(new Error("Invalid or expired token"));
        }
    });

    io.on("connection", (socket) => {
        const userId = socket.userId;

        console.log(
            `Authenticated socket connected: ${socket.id}`
        );

        // Register this socket for the authenticated user.
        let userSockets = onlineUsers.get(userId);

        if (!userSockets) {
            userSockets = new Set();
            onlineUsers.set(userId, userSockets);
        }

        const wasOffline = userSockets.size === 0;

        userSockets.add(socket.id);

        // Join a private room for this user's connections.
        socket.join(`user:${userId}`);

        // Notify other clients when the user first comes online.
        if (wasOffline) {
            socket.broadcast.emit("user-online", {
                userId,
            });
        }

        // Send the current online-user list to this client.
        socket.emit(
            "online-users",
            Array.from(onlineUsers.keys())
        );

        // Join a conversation only after verifying membership.
        socket.on(
            "join-conversation",
            async ({ conversationId } = {}, callback) => {
                try {
                    if (
                        typeof conversationId !== "string" ||
                        !/^[a-f\d]{24}$/i.test(conversationId)
                    ) {
                        return callback?.({
                            success: false,
                            message: "Invalid conversation ID",
                        });
                    }

                    const conversation = await Conversation.findById(
                        conversationId
                    );

                    if (!conversation) {
                        return callback?.({
                            success: false,
                            message: "Conversation not found",
                        });
                    }

                    const isParticipant = conversation.participants.some(
                        (participant) =>
                            participant.toString() === userId
                    );

                    if (!isParticipant) {
                        return callback?.({
                            success: false,
                            message: "Access denied",
                        });
                    }

                    // Join the conversation room.
                    socket.join(`conversation:${conversationId}`);

                    // Find messages that haven't been delivered yet.
                    const pendingMessages = await Message.find({
                        conversation: conversationId,
                        sender: { $ne: userId },
                        $or: [
                            { deliveredAt: null },
                            { deliveredAt: { $exists: false } },
                        ],
                    }).select("_id sender");

                    if (pendingMessages.length > 0) {
                        const deliveredAt = new Date();

                        const messageIds = pendingMessages.map(
                            (message) => message._id
                        );

                        // Update delivery status in MongoDB.
                        await Message.updateMany(
                            {
                                _id: { $in: messageIds },
                                conversation: conversationId,
                                $or: [
                                    { deliveredAt: null },
                                    { deliveredAt: { $exists: false } },
                                ],
                            },
                            {
                                $set: { deliveredAt },
                            }
                        );

                        // Group messages by their original sender.
                        const messagesBySender = new Map();

                        pendingMessages.forEach((message) => {
                            const senderId = message.sender.toString();

                            if (!messagesBySender.has(senderId)) {
                                messagesBySender.set(senderId, []);
                            }

                            messagesBySender
                                .get(senderId)
                                .push(message._id.toString());
                        });

                        // Notify each sender that their messages were delivered.
                        messagesBySender.forEach(
                            (ids, senderId) => {
                                io.to(`user:${senderId}`).emit(
                                    "messages-delivered",
                                    {
                                        conversationId,
                                        messageIds: ids,
                                        deliveredAt: deliveredAt.toISOString(),
                                    }
                                );
                            }
                        );

                        console.log(
                            `Marked ${messageIds.length} messages as delivered`
                        );
                    }

                    callback?.({
                        success: true,
                        conversationId,
                    });
                } catch (error) {
                    console.error(
                        "Error joining conversation:",
                        error.message
                    );

                    callback?.({
                        success: false,
                        message: "Unable to join conversation",
                    });
                }
            }
        );

        // Notify other participants that this user is typing.
        socket.on(
            "typing-start",
            async ({ conversationId } = {}) => {
                try {
                    if (
                        typeof conversationId !== "string" ||
                        !/^[a-f\d]{24}$/i.test(conversationId)
                    ) {
                        return;
                    }

                    const room = `conversation:${conversationId}`;

                    // Only allow events for conversations
                    // this socket has already joined.
                    if (!socket.rooms.has(room)) {
                        return;
                    }

                    socket
                        .to(room)
                        .emit("user-typing", {
                            conversationId,
                            userId,
                            isTyping: true,
                        });
                } catch (error) {
                    console.error(
                        "Error handling typing-start:",
                        error.message
                    );
                }
            }
        );

        // Notify other participants that this user stopped typing.
        socket.on(
            "typing-stop",
            async ({ conversationId } = {}) => {
                try {
                    if (
                        typeof conversationId !== "string" ||
                        !/^[a-f\d]{24}$/i.test(conversationId)
                    ) {
                        return;
                    }

                    const room = `conversation:${conversationId}`;

                    if (!socket.rooms.has(room)) {
                        return;
                    }

                    socket
                        .to(room)
                        .emit("user-typing", {
                            conversationId,
                            userId,
                            isTyping: false,
                        });
                } catch (error) {
                    console.error(
                        "Error handling typing-stop:",
                        error.message
                    );
                }
            }
        );

        // Mark incoming messages as read.
        socket.on(
            "mark-messages-read",
            async ({ conversationId } = {}) => {
                try {
                    if (
                        typeof conversationId !== "string" ||
                        !/^[a-f\d]{24}$/i.test(conversationId)
                    ) {
                        return;
                    }

                    const room = `conversation:${conversationId}`;

                    // Only allow read receipts for conversations
                    // this socket has already joined.
                    if (!socket.rooms.has(room)) {
                        return;
                    }

                    // Find unread messages sent by the other participant.
                    const unreadMessages = await Message.find({
                        conversation: conversationId,
                        sender: { $ne: userId },
                        $or: [
                            { readAt: null },
                            { readAt: { $exists: false } },
                        ],
                    }).select("_id");

                    if (unreadMessages.length === 0) {
                        return;
                    }

                    const messageIds = unreadMessages.map(
                        (message) => message._id
                    );

                    const readAt = new Date();

                    // Persist the read status in MongoDB.
                    await Message.updateMany(
                        {
                            _id: { $in: messageIds },
                            conversation: conversationId,
                            sender: { $ne: userId },
                            $or: [
                                { readAt: null },
                                { readAt: { $exists: false } },
                            ],
                        },
                        {
                            $set: { readAt },
                        }
                    );

                    // Notify the conversation that these messages
                    // have been read.
                    io.to(room).emit("messages-read", {
                        conversationId,
                        readerId: userId,
                        messageIds: messageIds.map((id) =>
                            id.toString()
                        ),
                        readAt: readAt.toISOString(),
                    });

                    // Recalculate unread messages for this user.
                    const unreadCount = await Message.countDocuments({
                        conversation: conversationId,
                        sender: { $ne: userId },
                        readAt: null,
                    });

                    // Update every connected device belonging to this user.
                    io.to(`user:${userId}`).emit(
                        "unread-count-updated",
                        {
                            conversationId,
                            unreadCount,
                        }
                    );

                    console.log(
                        `Marked ${messageIds.length} messages as read`
                    );
                } catch (error) {
                    console.error(
                        "Error marking messages as read:",
                        error.message
                    );
                }
            }
        );

        socket.on("disconnect", () => {
            const sockets = onlineUsers.get(userId);

            if (sockets) {
                sockets.delete(socket.id);

                // Mark the user offline only after their
                // final active socket disconnects.
                if (sockets.size === 0) {
                    onlineUsers.delete(userId);

                    socket.broadcast.emit("user-offline", {
                        userId,
                    });
                }
            }

            console.log(
                `Authenticated socket disconnected: ${socket.id}`
            );
        });
    });
};