import {
    connectSocket,
    disconnectSocket,
} from "../lib/socket";

import { create } from "zustand";
import axiosInstance from "../lib/axios";

import {
    saveToken,
    getToken,
    removeToken,
} from "../lib/token";

interface User {
    _id: string;
    fullName: string;
    email: string;
    profilePic?: string;
    bio?: string;
    nativeLanguages?: string[];
    learningLanguages?: string[];
    country?: string;
    city?: string;
    interests?: string[];
}

interface AuthState {
    authUser: User | null;
    token: string | null;

    updateAuthUser: (user: Partial<User>) => void;

    isCheckingAuth: boolean;
    isLoggingIn: boolean;
    isSigningUp: boolean;

    checkAuth: () => Promise<void>;

    login: (
        email: string,
        password: string
    ) => Promise<{
        success: boolean;
        message?: string;
    }>;

    signup: (
        fullName: string,
        email: string,
        password: string
    ) => Promise<{
        success: boolean;
        message?: string;
    }>;

    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    authUser: null,
    token: null,

    updateAuthUser: (user) => {
        set((state) => ({
            authUser: state.authUser
                ? {
                    ...state.authUser,
                    ...user,
                }
                : null,
        }));
    },

    isCheckingAuth: true,
    isLoggingIn: false,
    isSigningUp: false,

    // =========================
    // SIGNUP
    // =========================

    signup: async (fullName, email, password) => {
        set({ isSigningUp: true });

        try {
            const response = await axiosInstance.post(
                "/auth/signup",
                {
                    fullName,
                    email,
                    password,
                }
            );

            const user = response.data.user;
            const token = response.data.token;

            if (!token) {
                throw new Error("No authentication token received.");
            }

            await saveToken(token);

            set({
                authUser: user,
                token,
            });

            connectSocket(token);

            return { success: true };

        } catch (error: any) {
            console.log(
                "Signup error:",
                error.response?.data || error.message
            );

            return {
                success: false,
                message:
                    error.response?.data?.message ||
                    error.message ||
                    "Something went wrong.",
            };

        } finally {
            set({ isSigningUp: false });
        }
    },

    // =========================
    // LOGIN
    // =========================

    login: async (email, password) => {
        set({ isLoggingIn: true });

        try {
            const response = await axiosInstance.post(
                "/auth/login",
                {
                    email,
                    password,
                }
            );

            const user = response.data.user;
            const token = response.data.token;

            if (!token) {
                throw new Error("No authentication token received.");
            }

            await saveToken(token);

            set({
                authUser: user,
                token,
            });

            connectSocket(token);

            return { success: true };

        } catch (error: any) {
            console.log(
                "Login error:",
                error.response?.data || error.message
            );

            return {
                success: false,
                message:
                    error.response?.data?.message ||
                    error.message ||
                    "Login failed.",
            };

        } finally {
            set({ isLoggingIn: false });
        }
    },

    // =========================
    // CHECK AUTH
    // =========================

    checkAuth: async () => {
        set({ isCheckingAuth: true });

        try {
            const token = await getToken();

            if (!token) {
                disconnectSocket();

                set({
                    authUser: null,
                    token: null,
                    isCheckingAuth: false,
                });

                return;
            }

            const response = await axiosInstance.get(
                "/auth/check"
            );

            set({
                authUser: response.data.user || response.data,
                token,
                isCheckingAuth: false,
            });

            connectSocket(token);

        } catch (error: any) {
            console.log(
                "Error checking authentication:",
                error.response?.data || error.message
            );

            if (error.response?.status === 401) {
                await removeToken();
                disconnectSocket();

                set({
                    authUser: null,
                    token: null,
                    isCheckingAuth: false,
                });

                return;
            }

            // Preserve the token if the server is temporarily unavailable.
            set({
                authUser: null,
                isCheckingAuth: false,
            });

        }
    },

    // =========================
    // LOGOUT
    // =========================

    logout: async () => {
        try {
            await axiosInstance.post("/auth/logout");

        } catch (error: any) {
            console.log(
                "Logout error:",
                error.response?.data || error.message
            );

        } finally {
            disconnectSocket();

            await removeToken();

            set({
                authUser: null,
                token: null,
            });
        }
    },
}));