import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcrypt";

export const signup = async (req, res) => {
    const { email, fullName, password } = req.body;

    try {
        if (!email || !fullName || !password) {
            return res.status(400).json({
                message: "All the fields are required.",
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "The password must be at least 6 characters.",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail,
        });

        if (existingUser) {
            return res.status(409).json({
                message: "The user already exists. Please, log in.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            email: normalizedEmail,
            fullName: fullName.trim(),
            password: hashedPassword,
        });

        const token = generateToken(newUser._id, res);

        return res.status(201).json({
            user: {
                _id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email,
                profilePic: newUser.profilePic,
            },
            token,
        });

    } catch (error) {
        console.error("Error in signup controller:", error.message);

        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required.",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail,
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid Credentials.",
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Invalid Credentials.",
            });
        }

        const token = generateToken(user._id, res);

        return res.status(200).json({
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                profilePic: user.profilePic,
            },
            token,
        });

    } catch (error) {
        console.error("Error in login controller:", error.message);

        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

export const logout = (req, res) => {
    res.cookie("jwt", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        maxAge: 0,
    });

    return res.status(200).json({
        message: "Logged out successfully",
    });
};

export const checkAuth = async (req, res) => {
    try {
        return res.status(200).json(req.user);
    } catch (error) {
        console.error("Error in checkAuth controller:", error.message);

        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};