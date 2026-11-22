import { Router } from "express";

import {
    deleteMessage,
    editMessage,
    getConversations,
    getMessages,
    sendMessage,
    translateMessage,
} from "../controllers/message.controller.js";

import { protectRoute } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/conversations", protectRoute, getConversations);

router.get("/:conversationId", protectRoute, getMessages);

router.post("/:conversationId", protectRoute, sendMessage);

router.post(
    "/:conversationId/:messageId/translate",
    protectRoute,
    translateMessage
)

router.patch(
    "/:conversationId/:messageId",
    protectRoute,
    editMessage
);

router.delete(
    "/:conversationId/:messageId",
    protectRoute,
    deleteMessage
);

export default router;