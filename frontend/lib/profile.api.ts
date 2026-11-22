import axiosInstance from "./axios";

export const getMyProfile = async () => {
    const response = await axiosInstance.get(
        "/users/profile"
    );

    return response.data;
};

export const updateMyProfile = async (profileData: {
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