import axiosInstance from "./axios";

export interface ConversationUser {
    _id: string;
    fullName: string;
    profilePic?: string | { url?: string };
    nativeLanguages?: string[];
    learningLanguages?: string[];
}

export interface LastMessage {
    _id: string;
    text: string;
    sender: string;
    createdAt: string;
    deliveredAt?: string | null;
    readAt?: string | null;
    isEdited?: boolean;
}

export interface Conversation {
    _id: string;
    participants: ConversationUser[];
    updatedAt?: string;
    lastMessage: LastMessage | null;
    unreadCount: number;
}

export const getConversations = async (): Promise<Conversation[]> => {
    const response = await axiosInstance.get("/messages/conversations");

    return response.data;
};