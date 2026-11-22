import ExchangeRequest from "../models/exchangeRequest.model.js";
import Conversation from "../models/conversation.model.js";
import User from "../models/user.model.js";

export const sendExchangeRequest = async (req, res) => {
    try {
        const senderId = req.user._id;
        const { userId } = req.params;

        // Cannot send a request to yourself
        if (senderId.toString() === userId) {
            return res.status(400).json({
                message: "You cannot send a request to yourself.",
            });
        }

        // Check if receiver exists
        const receiver = await User.findById(userId);

        if (!receiver) {
            return res.status(404).json({
                message: "User not found.",
            });
        }

        // Check for an existing request in either direction
        const existingRequest = await ExchangeRequest.findOne({
            $or: [
                {
                    sender: senderId,
                    receiver: userId,
                },
                {
                    sender: userId,
                    receiver: senderId,
                },
            ],
        });

        // If a request already exists
        if (existingRequest) {
            // Already accepted
            if (existingRequest.status === "accepted") {
                return res.status(409).json({
                    message: "You are already connected with this user.",
                });
            }

            // Pending request
            if (existingRequest.status === "pending") {
                return res.status(409).json({
                    message: "An exchange request is already pending.",
                });
            }

            // Rejected request
            if (existingRequest.status === "rejected") {
                existingRequest.sender = senderId;
                existingRequest.receiver = userId;
                existingRequest.status = "pending";

                const updatedRequest = await existingRequest.save();

                const populatedRequest = await updatedRequest.populate([
                    {
                        path: "sender",
                        select: "fullName profilePic nativeLanguages learningLanguages",
                    },
                    {
                        path: "receiver",
                        select: "fullName profilePic nativeLanguages learningLanguages",
                    },
                ]);

                return res.status(200).json(populatedRequest);
            }
        }

        // Create a new request
        const request = await ExchangeRequest.create({
            sender: senderId,
            receiver: userId,
        });

        const populatedRequest = await request.populate([
            {
                path: "sender",
                select: "fullName profilePic nativeLanguages learningLanguages",
            },
            {
                path: "receiver",
                select: "fullName profilePic nativeLanguages learningLanguages",
            },
        ]);

        res.status(201).json(populatedRequest);

    } catch (error) {
        console.log(
            "Error in sendExchangeRequest controller:",
            error.message
        );

        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

export const getExchangeRequests = async (req, res) => {
    try {
        const userId = req.user._id;

        const receivedRequests = await ExchangeRequest.find({
            receiver: userId,
        })
            .populate(
                "sender",
                "fullName profilePic nativeLanguages learningLanguages bio"
            )
            .sort({ createdAt: -1 });

        const sentRequests = await ExchangeRequest.find({
            sender: userId,
        })
            .populate(
                "receiver",
                "fullName profilePic nativeLanguages learningLanguages bio"
            )
            .sort({ createdAt: -1 });

        res.status(200).json({
            receivedRequests,
            sentRequests,
        });

    } catch (error) {
        console.log(
            "Error in getExchangeRequests controller:",
            error.message
        );

        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

export const acceptExchangeRequest = async (req, res) => {
    try {
        const { requestId } = req.params;

        const request = await ExchangeRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({
                message: "Exchange request not found.",
            });
        }

        // Only the receiver can accept
        if (
            request.receiver.toString() !==
            req.user._id.toString()
        ) {
            return res.status(403).json({
                message: "You are not allowed to accept this request.",
            });
        }

        // Make sure request is still pending
        if (request.status !== "pending") {
            return res.status(400).json({
                message: "This request has already been processed.",
            });
        }

        // Update request status
        request.status = "accepted";

        const updatedRequest = await request.save();

        // Check if conversation already exists
        let conversation = await Conversation.findOne({
            participants: {
                $all: [
                    request.sender,
                    request.receiver,
                ],
            },
        });

        // Create conversation if it doesn't exist
        if (!conversation) {
            conversation = await Conversation.create({
                participants: [
                    request.sender,
                    request.receiver,
                ],
            });
        }

        // Populate participants
        await conversation.populate(
            "participants",
            "fullName profilePic nativeLanguages learningLanguages"
        );

        res.status(200).json({
            message: "Exchange request accepted successfully.",
            request: updatedRequest,
            conversation,
        });

    } catch (error) {
        console.log(
            "Error in acceptExchangeRequest controller:",
            error.message
        );

        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

export const rejectExchangeRequest = async (req, res) => {
    try {
        const { requestId } = req.params;

        const request = await ExchangeRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({
                message: "Exchange request not found.",
            });
        }

        // Only the receiver can reject
        if (request.receiver.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: "You are not allowed to reject this request.",
            });
        }

        if (request.status !== "pending") {
            return res.status(400).json({
                message: "This request has already been processed.",
            });
        }

        request.status = "rejected";

        const updatedRequest = await request.save();

        res.status(200).json(updatedRequest);

    } catch (error) {
        console.log(
            "Error in rejectExchangeRequest controller:",
            error.message
        );

        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};