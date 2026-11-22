import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";

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
                // Get the latest message.
                const lastMessage = await Message.findOne({
                    conversation: conversation._id,
                })
                    .sort({ createdAt: -1 })
                    .lean();

                // Count unread messages received by the current user.
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