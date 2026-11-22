import { useOnlineUsersStore } from "../../store/onlineUsers.store";
import { socket } from "../../lib/socket";
import React, { useCallback, useEffect, useState } from "react";

import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    Text,
    View,
} from "react-native";

import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useUnreadMessagesStore } from "../../store/unreadMessages.store";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    getConversations,
    type Conversation,
    type ConversationUser,
} from "../../lib/conversation.api";

// Format conversation timestamp.
const formatMessageTime = (date?: string) => {
    if (!date) return "";

    const messageDate = new Date(date);

    if (Number.isNaN(messageDate.getTime())) return "";

    const now = new Date();

    const isToday =
        messageDate.toDateString() === now.toDateString();

    if (isToday) {
        return messageDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    return messageDate.toLocaleDateString([], {
        day: "2-digit",
        month: "short",
    });
};

export default function MessagesScreen() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const router = useRouter();

    const authUser = useAuthStore((state) => state.authUser);

    const onlineUserIds = useOnlineUsersStore(
        (state) => state.onlineUserIds
    );

    const setConversationUnreadCounts =
        useUnreadMessagesStore(
            (state) => state.setConversationUnreadCounts
        );

    const loadConversations = useCallback(async (refresh = false) => {
        if (refresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setErrorMessage("");

        try {
            const data = await getConversations();

            setConversations(data);
            setConversationUnreadCounts(data);
        } catch (error) {
            const apiError = error as {
                response?: {
                    data?: {
                        message?: string;
                    };
                };
            };

            setErrorMessage(
                apiError.response?.data?.message ??
                "Unable to load conversations."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    useEffect(() => {
        const handleNewMessage = (message: {
            _id: string;
            conversation: string;
            sender: string | { _id: string };
            text: string;
            createdAt: string;
            deliveredAt?: string | null;
            readAt?: string | null;
            isEdited?: boolean;
        }) => {
            const conversationId =
                typeof message.conversation === "string"
                    ? message.conversation
                    : String(message.conversation);

            setConversations((previous) => {
                const updated = previous.map((conversation) => {
                    if (conversation._id !== conversationId) {
                        return conversation;
                    }

                    return {
                        ...conversation,
                        updatedAt: message.createdAt,
                        lastMessage: {
                            ...message,
                            sender:
                                typeof message.sender === "string"
                                    ? message.sender
                                    : message.sender._id,
                        },
                    };
                });

                // Move the conversation with the newest message to the top.
                return updated.sort(
                    (a, b) =>
                        new Date(b.updatedAt ?? 0).getTime() -
                        new Date(a.updatedAt ?? 0).getTime()
                );
            });
        };

        const handleUnreadCountUpdated = (data: {
            conversationId: string;
            unreadCount: number;
        }) => {
            setConversations((previous) =>
                previous.map((conversation) =>
                    conversation._id === data.conversationId
                        ? {
                            ...conversation,
                            unreadCount: data.unreadCount,
                        }
                        : conversation
                )
            );
        };

        socket.on("new-message", handleNewMessage);
        socket.on("unread-count-updated", handleUnreadCountUpdated);

        return () => {
            socket.off("new-message", handleNewMessage);
            socket.off("unread-count-updated", handleUnreadCountUpdated);
        };
    }, []);

    const getOtherParticipant = (
        conversation: Conversation
    ): ConversationUser | undefined => {
        return conversation.participants.find(
            (participant) => participant._id !== authUser?._id
        );
    };

    const getProfilePicture = (user: ConversationUser) => {
        if (typeof user.profilePic === "string") {
            return user.profilePic;
        }

        if (user.profilePic && typeof user.profilePic === "object") {
            return user.profilePic.url ?? "";
        }

        return "";
    };

    const renderConversation = ({
        item,
    }: {
        item: Conversation;
    }) => {
        const user = getOtherParticipant(item);

        if (!user) return null;

        const profilePicture = getProfilePicture(user);

        const isOnline = onlineUserIds.includes(user._id);

        const unreadCount = item.unreadCount ?? 0;

        const lastMessage = item.lastMessage;

        const isOwnMessage =
            typeof lastMessage?.sender === "string" &&
            lastMessage.sender === authUser?._id;

        const messagePreview = lastMessage
            ? `${isOwnMessage ? "You: " : ""}${lastMessage.text}`
            : "Start a conversation";

        const messageTime = formatMessageTime(
            lastMessage?.createdAt
        );

        return (
            <Pressable
                onPress={() => {
                    router.push({
                        pathname: "/chat/[conversationId]",
                        params: {
                            conversationId: item._id,
                            userId: user._id,
                            userName: user.fullName,
                        },
                    });
                }}
                className="mb-3 flex-row items-center rounded-2xl border border-gray-100 bg-white p-4"
            >
                {/* Profile picture and online indicator */}
                <View className="relative">
                    {profilePicture ? (
                        <Image
                            source={{ uri: profilePicture }}
                            className="h-14 w-14 rounded-full bg-gray-100"
                        />
                    ) : (
                        <View className="h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
                            <Text className="text-xl font-bold text-indigo-600">
                                {user.fullName?.charAt(0)?.toUpperCase() ?? "?"}
                            </Text>
                        </View>
                    )}

                    <View
                        className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${isOnline ? "bg-green-500" : "bg-gray-400"
                            }`}
                    />
                </View>

                {/* Conversation information */}
                <View className="ml-3 flex-1">
                    {/* Name and timestamp */}
                    <View className="flex-row items-center justify-between">
                        <Text
                            numberOfLines={1}
                            className="flex-1 text-base font-bold text-gray-900"
                        >
                            {user.fullName}
                        </Text>

                        {messageTime ? (
                            <Text className="ml-2 text-xs text-gray-400">
                                {messageTime}
                            </Text>
                        ) : null}
                    </View>

                    {/* Online status */}
                    <View className="mt-1 flex-row items-center">
                        <View
                            className={`mr-1.5 h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-400"
                                }`}
                        />

                        <Text
                            className={`text-xs ${isOnline ? "text-green-600" : "text-gray-500"
                                }`}
                        >
                            {isOnline ? "Online" : "Offline"}
                        </Text>
                    </View>

                    {/* Languages */}
                    <Text className="mt-1 text-xs text-gray-500">
                        {user.nativeLanguages?.join(", ") ||
                            "Language exchange partner"}
                    </Text>

                    {/* Last message and unread badge */}
                    <View className="mt-2 flex-row items-center justify-between">
                        <Text
                            numberOfLines={1}
                            className={`flex-1 text-sm ${unreadCount > 0
                                ? "font-semibold text-gray-900"
                                : "text-gray-500"
                                }`}
                        >
                            {messagePreview}
                        </Text>

                        {unreadCount > 0 && (
                            <View className="ml-2 min-w-6 h-6 items-center justify-center rounded-full bg-teal-600 px-2">
                                <Text className="text-xs font-bold text-white">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </Pressable>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="px-5 pb-4 pt-4">
                <Text className="text-3xl font-bold text-gray-900">
                    Messages
                </Text>

                <Text className="mt-2 text-sm text-gray-500">
                    Keep in touch with your language exchange partners.
                </Text>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0D9488" />

                    <Text className="mt-3 text-sm text-gray-500">
                        Loading conversations...
                    </Text>
                </View>
            ) : errorMessage ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Text className="text-center text-red-600">
                        {errorMessage}
                    </Text>

                    <Pressable
                        onPress={() => loadConversations()}
                        className="mt-4 rounded-xl bg-teal-600 px-6 py-3"
                    >
                        <Text className="font-semibold text-white">
                            Try again
                        </Text>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item._id}
                    renderItem={renderConversation}
                    contentContainerStyle={{
                        paddingHorizontal: 20,
                        paddingBottom: 32,
                        flexGrow: 1,
                    }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadConversations(true)}
                        />
                    }
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center px-6 py-16">
                            <Text className="text-4xl">💬</Text>

                            <Text className="mt-4 text-lg font-bold text-gray-900">
                                No conversations yet
                            </Text>

                            <Text className="mt-2 text-center text-sm leading-6 text-gray-500">
                                Accept a language exchange request to connect
                                with another learner.
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}