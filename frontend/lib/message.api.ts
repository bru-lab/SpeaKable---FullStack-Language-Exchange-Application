import axiosInstance from "./axios";

export interface MessageUser {
    _id: string;
    fullName: string;
    profilePic?: string | { url?: string };
}

export interface Message {
    _id: string;
    conversation: string;
    sender: MessageUser | string;
    text: string;
    createdAt: string;
    updatedAt?: string;
    deliveredAt?: string | null;
    readAt?: string | null;
    isEdited?: boolean;
}

export const getMessages = async (
    conversationId: string
): Promise<Message[]> => {
    const response = await axiosInstance.get(
        `/messages/${conversationId}`
    );

    return response.data;
};

export const sendMessage = async (
    conversationId: string,
    text: string
): Promise<Message> => {
    const response = await axiosInstance.post(
        `/messages/${conversationId}`,
        { text }
    );

    return response.data;
};

export const editMessage = async (
    conversationId: string,
    messageId: string,
    text: string
): Promise<Message> => {
    const response = await axiosInstance.patch(
        `/messages/${conversationId}/${messageId}`,
        { text }
    );

    return response.data;
};

export const deleteMessage = async (
    conversationId: string,
    messageId: string
): Promise<void> => {
    await axiosInstance.delete(
        `/messages/${conversationId}/${messageId}`
    );
};