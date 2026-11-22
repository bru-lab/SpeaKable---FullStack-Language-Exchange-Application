import { create } from "zustand";

interface OnlineUsersState {
    onlineUserIds: string[];

    setOnlineUsers: (userIds: string[]) => void;
    addOnlineUser: (userId: string) => void;
    removeOnlineUser: (userId: string) => void;
    isUserOnline: (userId: string) => boolean;
}

export const useOnlineUsersStore = create<OnlineUsersState>((set, get) => ({
    onlineUserIds: [],

    setOnlineUsers: (userIds) =>
        set({
            onlineUserIds: [...new Set(userIds)],
        }),

    addOnlineUser: (userId) =>
        set((state) => ({
            onlineUserIds: state.onlineUserIds.includes(userId)
                ? state.onlineUserIds
                : [...state.onlineUserIds, userId],
        })),

    removeOnlineUser: (userId) =>
        set((state) => ({
            onlineUserIds: state.onlineUserIds.filter(
                (id) => id !== userId
            ),
        })),

    isUserOnline: (userId) => get().onlineUserIds.includes(userId),
}));