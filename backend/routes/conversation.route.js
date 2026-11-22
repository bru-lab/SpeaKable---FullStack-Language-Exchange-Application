import express from "express";

import {
    getConversations,
} from "../controllers/conversation.controller.js";

import { protectRoute } from "../middlewares/auth.middleware.js";

const route = express.Router();

route.get("/", protectRoute, getConversations);

export default route;