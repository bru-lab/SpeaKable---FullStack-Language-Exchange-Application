import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        conversation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
        },

        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        text: {
            type: String,
            trim: true,
            required: true,
        },

        // Timestamp indicating when the message was delivered.
        deliveredAt: {
            type: Date,
            default: null,
        },

        // Timestamp indicating when the message was read.
        readAt: {
            type: Date,
            default: null,
        },

        // Indicates whether the message has been edited.
        isEdited: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;