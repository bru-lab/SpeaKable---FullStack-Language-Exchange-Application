import express from "express";

import {
    sendExchangeRequest,
    getExchangeRequests,
    acceptExchangeRequest,
    rejectExchangeRequest,
} from "../controllers/exchangeRequest.controller.js";

import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/:userId", protectRoute, sendExchangeRequest);

router.get("/", protectRoute, getExchangeRequests);

router.put("/:requestId/accept", protectRoute, acceptExchangeRequest);

router.put("/:requestId/reject", protectRoute, rejectExchangeRequest);

export default router;