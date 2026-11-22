import mongoose from "mongoose";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";



export const getConversations = async (req, res) => {
    try {
        const userId = req.user._id;

        const conversations = await Conversation.find({
            participants: userId,
        })
            .populate(
                "participants",
                "fullName profilePic nativeLanguages learningLanguages"
            )
            .sort({ updatedAt: -1 });

        const conversationsWithDetails = await Promise.all(
            conversations.map(async (conversation) => {
                const lastMessage = await Message.findOne({
                    conversation: conversation._id,
                })
                    .sort({ createdAt: -1 })
                    .lean();

                const unreadCount = await Message.countDocuments({
                    conversation: conversation._id,
                    sender: { $ne: userId },
                    readAt: null,
                });

                return {
                    ...conversation.toObject(),
                    lastMessage,
                    unreadCount,
                };
            })
        );

        res.status(200).json(conversationsWithDetails);

    } catch (error) {
        console.log(
            "Error in getConversations controller:",
            error.message
        );

        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

export const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                message: "Conversation not found",
            });
        }

        const isParticipant = conversation.participants.some(
            (participant) =>
                participant.toString() === req.user._id.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                message: "You are not a participant in this conversation",
            });
        }

        const messages = await Message.find({
            conversation: conversationId,
        })
            .populate("sender", "fullName profilePic")
            .sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getMessages controller:", error.message);

        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { text } = req.body;
        const senderId = req.user._id.toString();

        if (!text || !text.trim()) {
            return res.status(400).json({
                message: "Message text is required",
            });
        }

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                message: "Conversation not found",
            });
        }

        const isParticipant = conversation.participants.some(
            (participant) =>
                participant.toString() === senderId
        );

        if (!isParticipant) {
            return res.status(403).json({
                message: "You are not a participant in this conversation",
            });
        }

        // Find the other participant.
        const recipient = conversation.participants.find(
            (participant) =>
                participant.toString() !== senderId
        );

        if (!recipient) {
            return res.status(400).json({
                message: "Conversation recipient not found",
            });
        }

        const recipientId = recipient.toString();

        // Create the message.
        const newMessage = await Message.create({
            conversation: conversationId,
            sender: req.user._id,
            text: text.trim(),
            deliveredAt: null,
        });

        await newMessage.populate(
            "sender",
            "fullName profilePic"
        );

        // Update conversation activity.
        await Conversation.findByIdAndUpdate(conversationId, {
            updatedAt: new Date(),
        });

        const io = req.app.get("io");

        // Broadcast to clients inside the conversation.
        io.to(`conversation:${conversationId}`).emit(
            "new-message",
            newMessage
        );

        // Notify all active connections belonging to the recipient.
        // The frontend should deduplicate messages by _id.
        io.to(`user:${recipientId}`).emit(
            "new-message",
            newMessage
        );

        // Calculate the recipient's unread message count.
        const unreadCount = await Message.countDocuments({
            conversation: conversationId,
            sender: { $ne: recipientId },
            readAt: null,
        });

        // Notify all recipient devices about the updated count.
        io.to(`user:${recipientId}`).emit(
            "unread-count-updated",
            {
                conversationId,
                unreadCount,
            }
        );

        return res.status(201).json(newMessage);

    } catch (error) {
        console.log(
            "Error in sendMessage controller:",
            error.message
        );

        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

export const editMessage = async (req, res) => {
    try {
        const { conversationId, messageId } = req.params;
        const { text } = req.body;
        const userId = req.user._id.toString();

        if (
            !mongoose.isValidObjectId(conversationId) ||
            !mongoose.isValidObjectId(messageId)
        ) {
            return res.status(400).json({
                message: "Invalid conversation or message ID",
            });
        }

        if (typeof text !== "string" || !text.trim()) {
            return res.status(400).json({
                message: "Message text is required",
            });
        }

        const conversation = await Conversation.findById(
            conversationId
        );

        if (!conversation) {
            return res.status(404).json({
                message: "Conversation not found",
            });
        }

        const isParticipant = conversation.participants.some(
            (participant) => participant.toString() === userId
        );

        if (!isParticipant) {
            return res.status(403).json({
                message: "You are not a participant in this conversation",
            });
        }

        const message = await Message.findOne({
            _id: messageId,
            conversation: conversationId,
        });

        if (!message) {
            return res.status(404).json({
                message: "Message not found",
            });
        }

        if (message.sender.toString() !== userId) {
            return res.status(403).json({
                message: "You can only edit your own messages",
            });
        }

        message.text = text.trim();
        message.isEdited = true;

        await message.save();

        await message.populate("sender", "fullName profilePic");

        const io = req.app.get("io");

        io.to(`conversation:${conversationId}`).emit(
            "message-edited",
            message
        );

        res.status(200).json(message);
    } catch (error) {
        console.error("Error in editMessage controller:", error.message);

        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const { conversationId, messageId } = req.params;
        const userId = req.user._id.toString();

        if (
            !mongoose.isValidObjectId(conversationId) ||
            !mongoose.isValidObjectId(messageId)
        ) {
            return res.status(400).json({
                message: "Invalid conversation or message ID",
            });
        }

        const conversation = await Conversation.findById(
            conversationId
        );

        if (!conversation) {
            return res.status(404).json({
                message: "Conversation not found",
            });
        }

        const isParticipant = conversation.participants.some(
            (participant) => participant.toString() === userId
        );

        if (!isParticipant) {
            return res.status(403).json({
                message: "You are not a participant in this conversation",
            });
        }

        const message = await Message.findOne({
            _id: messageId,
            conversation: conversationId,
        });

        if (!message) {
            return res.status(404).json({
                message: "Message not found",
            });
        }

        if (message.sender.toString() !== userId) {
            return res.status(403).json({
                message: "You can only delete your own messages",
            });
        }

        await Message.deleteOne({
            _id: messageId,
            conversation: conversationId,
        });

        const io = req.app.get("io");

        io.to(`conversation:${conversationId}`).emit(
            "message-deleted",
            {
                messageId: messageId.toString(),
                conversationId: conversationId.toString(),
            }
        );

        res.status(200).json({
            message: "Message deleted successfully",
            messageId: messageId.toString(),
        });
    } catch (error) {
        console.error(
            "Error in deleteMessage controller:",
            error.message
        );

        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

export const translateMessage = async(req, res) => {}