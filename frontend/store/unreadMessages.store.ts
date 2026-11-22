import { create } from "zustand";

interface UnreadMessagesState {
    unreadCounts: Record<string, number>;
    setConversationUnreadCount: (
        conversationId: string,
        count: number
    ) => void;
    setConversationUnreadCounts: (
        conversations: { _id: string; unreadCount: number }[]
    ) => void;
    resetUnreadCounts: () => void;
}

export const useUnreadMessagesStore =
    create<UnreadMessagesState>((set) => ({
        unreadCounts: {},

        setConversationUnreadCount: (conversationId, count) =>
            set((state) => ({
                unreadCounts: {
                    ...state.unreadCounts,
                    [conversationId]: count,
                },
            })),

        setConversationUnreadCounts: (conversations) =>
            set({
                unreadCounts: Object.fromEntries(
                    conversations.map((conversation) => [
                        conversation._id,
                        conversation.unreadCount ?? 0,
                    ])
                ),
            }),

        resetUnreadCounts: () =>
            set({ unreadCounts: {} }),
    }));