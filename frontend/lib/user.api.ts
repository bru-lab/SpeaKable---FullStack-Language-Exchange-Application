import axiosInstance from "./axios";

export const getLanguageMatches = async () => {
    const response = await axiosInstance.get(
        "/users/matches"
    );

    return response.data;
};

export const getUsers = async () => {
    const response = await axiosInstance.get(
        "/users"
    );

    return response.data;
};

export const getUserProfile = async (userId: string) => {
    const response = await axiosInstance.get(
        `/users/${userId}`
    );

    return response.data;
};

export const sendExchangeRequest = async (receiverId: string) => {
    const response = await axiosInstance.post(
        `/exchange-requests/${receiverId}`
    );

    return response.data;
};

export const getUserById = async (userId: string) => {
    const response = await axiosInstance.get(`/users/${userId}`);
    return response.data;
};

export const getExchangeRequests = async () => {
    const response = await axiosInstance.get("/exchange-requests");
    return response.data;
};

export const acceptExchangeRequest = async (requestId: string) => {
    const response = await axiosInstance.put(
        `/exchange-requests/${requestId}/accept`
    );
    return response.data;
};

export const rejectExchangeRequest = async (requestId: string) => {
    const response = await axiosInstance.put(
        `/exchange-requests/${requestId}/reject`
    );
    return response.data;
};

export const updateUserProfile = async (profileData: {
    fullName?: string;
    bio?: string;
    nativeLanguages?: string[];
    learningLanguages?: string[];
    country?: string;
    city?: string;
    interests?: string[];
    profilePic?: string;
}) => {
    const response = await axiosInstance.put(
        "/users/profile",
        profileData
    );

    return response.data;
};