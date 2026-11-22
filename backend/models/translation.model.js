import mongoose from "mongoose";

const translationSchema = new mongoose.Schema(
    {
        message: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            required: true,
        },

        conversation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
        },

        sourceText: {
            type: String,
            required: true,
        },

        targetLanguage: {
            type: String,
            required: true,
        },

        translatedText: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

translationSchema.index(
    {
        message: 1,
        sourceText: 1,
        targetLanguage: 1,
    },
    {
        unique: true,
    }
);

const Translation = mongoose.model(
    "Translation",
    translationSchema
);

export default Translation;