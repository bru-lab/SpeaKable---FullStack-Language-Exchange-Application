import axios from "axios";
import { Platform } from "react-native";
import { getToken } from "./token";

const baseURL =
    process.env.EXPO_PUBLIC_API_URL ||
    (Platform.OS === "web"
        ? "http://localhost:5000/api"
        : "http://192.168.15.8:5000/api");

const axiosInstance = axios.create({
    baseURL,
    withCredentials: true,
});

axiosInstance.interceptors.request.use(
    async (config) => {
        const token = await getToken();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

export default axiosInstance;