import { useEffect } from "react";
import {
    socket,
    connectSocket,
    disconnectSocket,
} from "../lib/socket";

import { useAuthStore } from "../store/authStore";
import { useUnreadMessagesStore } from "../store/unreadMessages.store";
import { getConversations } from "../lib/conversation.api";

export function useSocket() {
    const authUser = useAuthStore(
        (state) => state.authUser
    );

    const token = useAuthStore(
        (state) => state.token
    );

    useEffect(() => {
        const {
            setConversationUnreadCount,
            setConversationUnreadCounts,
            resetUnreadCounts,
        } = useUnreadMessagesStore.getState();

        if (!authUser?._id || !token) {
            disconnectSocket();
            resetUnreadCounts();
            return;
        }

        let active = true;

        const handleUnreadCountUpdated = (data: {
            conversationId: string;
            unreadCount: number;
        }) => {
            setConversationUnreadCount(
                data.conversationId,
                data.unreadCount
            );
        };

        socket.on(
            "unread-count-updated",
            handleUnreadCountUpdated
        );

        const loadUnreadCounts = async () => {
            try {
                const conversations = await getConversations();

                if (active) {
                    setConversationUnreadCounts(conversations);
                }
            } catch (error) {
                console.error(
                    "Error loading unread counts:",
                    error
                );
            }
        };

        loadUnreadCounts();

        // Always connect through the centralized socket function.
        connectSocket(token);

        return () => {
            active = false;

            socket.off(
                "unread-count-updated",
                handleUnreadCountUpdated
            );

            disconnectSocket();
        };
    }, [authUser?._id, token]);
}