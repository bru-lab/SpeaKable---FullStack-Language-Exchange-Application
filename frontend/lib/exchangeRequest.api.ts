import axiosInstance from "./axios";

export interface ExchangeUser {
    _id: string;
    fullName: string;
    profilePic?: string | { url?: string };
    nativeLanguages?: string[];
    learningLanguages?: string[];
    bio?: string;
}

export interface ExchangeRequest {
    _id: string;
    sender: ExchangeUser;
    receiver: ExchangeUser;
    status: "pending" | "accepted" | "rejected";
    createdAt?: string;
}

export interface ExchangeRequestsResponse {
    receivedRequests: ExchangeRequest[];
    sentRequests: ExchangeRequest[];
}

export const getExchangeRequests =
    async (): Promise<ExchangeRequestsResponse> => {
        const response = await axiosInstance.get(
            "/exchange-requests/"
        );

        return response.data;
    };

export const acceptExchangeRequest = async (
    requestId: string
) => {
    const response = await axiosInstance.put(
        `/exchange-requests/${requestId}/accept`
    );

    return response.data;
};

export const rejectExchangeRequest = async (
    requestId: string
) => {
    const response = await axiosInstance.put(
        `/exchange-requests/${requestId}/reject`
    );

    return response.data;
};

export const sendExchangeRequest = async (
    userId: string
) => {
    const response = await axiosInstance.post(
        `/exchange-requests/${userId}`
    );

    return response.data;
};