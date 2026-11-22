import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
    try {
        let token;

        // 1. Check HTTP-only cookie
        if (req.cookies?.jwt) {
            token = req.cookies.jwt;
        }

        // 2. Check Authorization header
        if (
            !token &&
            req.headers.authorization?.startsWith("Bearer ")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        // 3. No token
        if (!token) {
            return res.status(401).json({
                message: "Unauthorized - No Token Provided",
            });
        }

        // 4. Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // 5. Find user
        const user = await User.findById(
            decoded.userId
        ).select("-password");

        if (!user) {
            return res.status(401).json({
                message: "User not found",
            });
        }

        // 6. Attach user to request
        req.user = user;

        next();
    } catch (error) {
        console.log(
            "Error in protectRoute:",
            error.message
        );

        return res.status(401).json({
            message: "Unauthorized - Invalid Token",
        });
    }
};