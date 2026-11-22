import express from "express";

import {
    getProfile,
    updateProfile,
    getUsers,
    getLanguageMatches,
    getUserById,
} from "../controllers/user.controller.js";

import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protectRoute, getUsers);

router.get("/profile", protectRoute, getProfile);

router.put("/profile", protectRoute, updateProfile);

router.get("/matches", protectRoute, getLanguageMatches);

router.get("/:id", protectRoute, getUserById);

export default router;