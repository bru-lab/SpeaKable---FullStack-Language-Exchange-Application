import { socket } from "../../../lib/socket";
import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    ActivityIndicator,
    Modal,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

import { getUserById } from "../../../lib/user.api";

import { SafeAreaView } from "react-native-safe-area-context";

import {
    Stack,
    useLocalSearchParams,
    useRouter,
} from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "../../../store/authStore";
import { useOnlineUsersStore } from "../../../store/onlineUsers.store";

import {
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    type Message,
    type MessageUser,
} from "../../../lib/message.api";

const PRIMARY_COLOR = "#0D9488";

export default function ChatScreen() {
    const router = useRouter();

    const {
        conversationId: conversationIdParam,
        userId: userIdParam,
        userName: userNameParam,
    } = useLocalSearchParams<{
        conversationId: string | string[];
        userId?: string | string[];
        userName?: string | string[];
    }>();

    const conversationId = Array.isArray(conversationIdParam)
        ? conversationIdParam[0]
        : conversationIdParam;

    const partnerId = Array.isArray(userIdParam)
        ? userIdParam[0]
        : userIdParam;

    const partnerName = Array.isArray(userNameParam)
        ? userNameParam[0]
        : userNameParam;

    const authUser = useAuthStore((state) => state.authUser);

    const onlineUserIds = useOnlineUsersStore(
        (state) => state.onlineUserIds
    );

    const isPartnerOnline = partnerId
        ? onlineUserIds.includes(partnerId)
        : false;

    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [partnerProfilePic, setPartnerProfilePic] = useState("");
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [isActionsModalVisible, setIsActionsModalVisible] = useState(false);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Keep the current editing ID available to stable Socket.IO handlers.
    const editingMessageIdRef = useRef<string | null>(null);

    const [isPartnerTyping, setIsPartnerTyping] = useState(false);

    const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null
    );

    const partnerTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null
    );

    const isTypingRef = useRef(false);

    const flatListRef = useRef<FlatList<Message>>(null);
    const inputRef = useRef<TextInput>(null);

    const title = partnerName || "Conversation";

    // Get the sender ID whether sender is populated or just an ID.
    const getSenderId = (sender: Message["sender"]): string => {
        return typeof sender === "string"
            ? sender
            : sender._id;
    };

    const markMessagesAsRead = useCallback(() => {
        if (!conversationId || !socket.connected) {
            return;
        }

        socket.emit("mark-messages-read", {
            conversationId,
        });
    }, [conversationId]);

    // Format message timestamps safely.
    const formatMessageTime = (dateString?: string): string => {
        if (!dateString) return "";

        const date = new Date(dateString);

        if (Number.isNaN(date.getTime())) return "";

        return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Load messages without replacing the list unnecessarily.
    const loadMessages = useCallback(
        async (showLoader = false) => {
            if (!conversationId) {
                setLoading(false);
                setErrorMessage("Conversation not found.");
                return;
            }

            if (showLoader) {
                setLoading(true);
            }

            try {
                const data = await getMessages(conversationId);

                setMessages((previousMessages) => {
                    const messageMap = new Map<string, Message>();

                    previousMessages.forEach((message) => {
                        messageMap.set(message._id, message);
                    });

                    data.forEach((message) => {
                        messageMap.set(message._id, message);
                    });

                    return Array.from(messageMap.values()).sort(
                        (a, b) =>
                            new Date(a.createdAt).getTime() -
                            new Date(b.createdAt).getTime()
                    );
                });

                setErrorMessage("");
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
                    "Unable to load messages. Please try again."
                );
            } finally {
                setLoading(false);
            }
        },
        [conversationId]
    );

    // Notify the other participant that we stopped typing.
    const stopTyping = useCallback(() => {
        if (typingStopTimerRef.current) {
            clearTimeout(typingStopTimerRef.current);
            typingStopTimerRef.current = null;
        }

        if (isTypingRef.current && conversationId) {
            socket.emit("typing-stop", {
                conversationId,
            });
        }

        isTypingRef.current = false;
    }, [conversationId]);

    // Handle changes in the message input.
    const handleTextChange = useCallback(
        (value: string) => {
            setText(value);

            if (!conversationId) return;

            // Stop typing when the input becomes empty.
            if (!value.trim()) {
                stopTyping();
                return;
            }

            // Notify the other participant only when typing begins.
            if (!isTypingRef.current) {
                socket.emit("typing-start", {
                    conversationId,
                });

                isTypingRef.current = true;
            }

            // Reset the inactivity timer after each keystroke.
            if (typingStopTimerRef.current) {
                clearTimeout(typingStopTimerRef.current);
            }

            typingStopTimerRef.current = setTimeout(() => {
                stopTyping();
            }, 1500);
        },
        [conversationId, stopTyping]
    );

    // Initial message loading.
    useEffect(() => {
        loadMessages(true);
    }, [loadMessages]);

    // Join the conversation room and listen for incoming messages.
    useEffect(() => {
        if (!conversationId) return;

        const handleUserTyping = (data: {
            conversationId: string;
            userId: string;
            isTyping: boolean;
        }) => {
            // Ignore typing events from other conversations.
            if (data.conversationId !== conversationId) {
                return;
            }

            // Ignore events from anyone other than our chat partner.
            if (partnerId && data.userId !== partnerId) {
                return;
            }

            // Ignore our own typing events.
            if (data.userId === authUser?._id) {
                return;
            }

            setIsPartnerTyping(data.isTyping);

            // Reset the fallback timer.
            if (partnerTypingTimerRef.current) {
                clearTimeout(partnerTypingTimerRef.current);
                partnerTypingTimerRef.current = null;
            }

            // Prevent the indicator from getting stuck if a stop event
            // is missed.
            if (data.isTyping) {
                partnerTypingTimerRef.current = setTimeout(() => {
                    setIsPartnerTyping(false);
                    partnerTypingTimerRef.current = null;
                }, 4000);
            }
        };

        const joinConversation = () => {
            socket.emit(
                "join-conversation",
                { conversationId },
                (response: {
                    success: boolean;
                    message?: string;
                }) => {
                    if (!response.success) {
                        console.error(
                            "Failed to join conversation:",
                            response.message
                        );

                        setErrorMessage(
                            response.message ??
                            "Unable to join the conversation."
                        );

                        return;
                    }

                    // Mark messages as read after successfully joining.
                    markMessagesAsRead();
                }
            );
        };

        const handleNewMessage = (message: Message) => {
            if (message.conversation !== conversationId) {
                return;
            }

            setMessages((previousMessages) => {
                const alreadyExists = previousMessages.some(
                    (existingMessage) =>
                        existingMessage._id === message._id
                );

                if (alreadyExists) {
                    return previousMessages;
                }

                return [...previousMessages, message].sort(
                    (a, b) =>
                        new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime()
                );
            });

            // Mark incoming messages as read.
            if (getSenderId(message.sender) !== authUser?._id) {
                markMessagesAsRead();
            }
        };

        const handleMessagesRead = (data: {
            conversationId: string;
            readerId: string;
            messageIds: string[];
            readAt: string;
        }) => {
            if (data.conversationId !== conversationId) {
                return;
            }

            // Only update messages when the other participant read them.
            if (data.readerId === authUser?._id) {
                return;
            }

            const readMessageIds = new Set(data.messageIds);

            setMessages((previousMessages) =>
                previousMessages.map((message) =>
                    readMessageIds.has(message._id)
                        ? {
                            ...message,
                            readAt: data.readAt,
                        }
                        : message
                )
            );
        };

        // Update the sender's message status when the recipient receives it.
        const handleMessagesDelivered = (data: {
            conversationId: string;
            messageIds: string[];
            deliveredAt: string;
        }) => {
            if (data.conversationId !== conversationId) {
                return;
            }

            const deliveredMessageIds = new Set(data.messageIds);

            setMessages((previousMessages) =>
                previousMessages.map((message) =>
                    deliveredMessageIds.has(message._id)
                        ? {
                            ...message,
                            deliveredAt: data.deliveredAt,
                        }
                        : message
                )
            );
        };

        const handleMessageEdited = (updatedMessage: Message) => {
            if (updatedMessage.conversation !== conversationId) {
                return;
            }

            setMessages((previousMessages) =>
                previousMessages.map((message) =>
                    message._id === updatedMessage._id
                        ? updatedMessage
                        : message
                )
            );
        };

        const handleMessageDeleted = (data: {
            messageId: string;
            conversationId: string;
        }) => {
            if (data.conversationId !== conversationId) {
                return;
            }

            setMessages((previousMessages) =>
                previousMessages.filter(
                    (message) => message._id !== data.messageId
                )
            );

            if (editingMessageIdRef.current === data.messageId) {
                editingMessageIdRef.current = null;
                setEditingMessageId(null);
                setText("");
            }
        };

        // Listen for new messages.
        socket.on("new-message", handleNewMessage);

        // Listen for typing events.
        socket.on("user-typing", handleUserTyping);

        socket.on("messages-read", handleMessagesRead);
        socket.on("messages-delivered", handleMessagesDelivered);
        socket.on("message-edited", handleMessageEdited);
        socket.on("message-deleted", handleMessageDeleted);

        // Join whenever the socket connects or reconnects.
        socket.on("connect", joinConversation);

        // The socket might already be connected.
        if (socket.connected) {
            joinConversation();
        }

        return () => {
            socket.off("new-message", handleNewMessage);
            socket.off("connect", joinConversation);
            socket.off("user-typing", handleUserTyping);
            socket.off("messages-read", handleMessagesRead);
            socket.off("messages-delivered", handleMessagesDelivered);
            socket.off("message-edited", handleMessageEdited);
            socket.off("message-deleted", handleMessageDeleted);

            if (typingStopTimerRef.current) {
                clearTimeout(typingStopTimerRef.current);
                typingStopTimerRef.current = null;
            }

            if (partnerTypingTimerRef.current) {
                clearTimeout(partnerTypingTimerRef.current);
                partnerTypingTimerRef.current = null;
            }

            // Clear any typing state when leaving the conversation.
            if (isTypingRef.current) {
                socket.emit("typing-stop", {
                    conversationId,
                });

                isTypingRef.current = false;
            }

            setIsPartnerTyping(false);
        };
    }, [conversationId, partnerId, authUser?._id, markMessagesAsRead]);


    // Start editing one of your own messages.
    const handleEditMessage = (message: Message) => {
        editingMessageIdRef.current = message._id;
        setEditingMessageId(message._id);
        setText(message.text);
        setErrorMessage("");

        inputRef.current?.focus();
    };

    // Open the cross-platform message actions modal.
    const handleMessageActions = (message: Message) => {
        if (getSenderId(message.sender) !== authUser?._id) {
            return;
        }

        setSelectedMessage(message);
        setIsActionsModalVisible(true);
    };

    // Start editing the selected message.
    const handleEditSelectedMessage = () => {
        if (!selectedMessage) return;

        const message = selectedMessage;
        setIsActionsModalVisible(false);
        setSelectedMessage(null);
        handleEditMessage(message);
    };

    // Open a separate confirmation modal before deleting.
    const handleRequestDelete = () => {
        setIsActionsModalVisible(false);
        setIsDeleteModalVisible(true);
    };

    // Delete the selected message after confirmation.
    const confirmDeleteMessage = async () => {
        if (!conversationId || !selectedMessage || deleting) return;

        const message = selectedMessage;
        setDeleting(true);
        setErrorMessage("");

        try {
            await deleteMessage(conversationId, message._id);

            // Update this screen immediately. Socket.IO updates the other participant.
            setMessages((previousMessages) =>
                previousMessages.filter((item) => item._id !== message._id)
            );

            if (editingMessageIdRef.current === message._id) {
                editingMessageIdRef.current = null;
                setEditingMessageId(null);
                setText("");
            }

            setIsDeleteModalVisible(false);
            setSelectedMessage(null);
        } catch (error) {
            const apiError = error as {
                response?: { data?: { message?: string } };
            };

            setErrorMessage(
                apiError.response?.data?.message ??
                    "Unable to delete the message. Please try again."
            );
            setIsDeleteModalVisible(false);
        } finally {
            setDeleting(false);
        }
    };

    const cancelEditing = () => {
        editingMessageIdRef.current = null;
        setEditingMessageId(null);
        setText("");
        setErrorMessage("");
    };

    // Send a new message or save an edit.
    const handleSendMessage = async () => {
        const trimmedText = text.trim();

        if (!trimmedText || sending || !conversationId) {
            return;
        }

        stopTyping();
        setSending(true);
        setErrorMessage("");

        try {
            if (editingMessageId) {
                const updatedMessage = await editMessage(
                    conversationId,
                    editingMessageId,
                    trimmedText
                );

                setMessages((previousMessages) =>
                    previousMessages.map((message) =>
                        message._id === updatedMessage._id
                            ? updatedMessage
                            : message
                    )
                );

                editingMessageIdRef.current = null;
                setEditingMessageId(null);
                setText("");
            } else {
                const newMessage = await sendMessage(
                    conversationId,
                    trimmedText
                );

                setMessages((previousMessages) => {
                    const alreadyExists = previousMessages.some(
                        (message) => message._id === newMessage._id
                    );

                    if (alreadyExists) {
                        return previousMessages;
                    }

                    return [...previousMessages, newMessage].sort(
                        (a, b) =>
                            new Date(a.createdAt).getTime() -
                            new Date(b.createdAt).getTime()
                    );
                });

                setText("");
            }
        } catch (error) {
            const apiError = error as {
                response?: { data?: { message?: string } };
            };

            setErrorMessage(
                apiError.response?.data?.message ??
                    "Unable to save your message. Please try again."
            );
        } finally {
            setSending(false);
        }
    };

    // Resolve the profile picture if sender data is populated.
    const getProfilePicture = (
        user: MessageUser
    ): string => {
        if (typeof user.profilePic === "string") {
            return user.profilePic;
        }

        if (
            user.profilePic &&
            typeof user.profilePic === "object"
        ) {
            return user.profilePic.url ?? "";
        }

        return "";
    };

    // Render individual message bubbles.
    const renderMessage = ({
        item,
    }: {
        item: Message;
    }) => {
        const isMine = getSenderId(item.sender) === authUser?._id;

        return (
            <View
                className={`mb-3 flex-row items-center ${
                    isMine ? "justify-end" : "justify-start"
                }`}
            >
                {/* A visible button makes message actions easy to discover. */}
                {isMine && (
                    <Pressable
                        onPress={() => handleMessageActions(item)}
                        hitSlop={8}
                        className="mr-2 h-9 w-7 items-center justify-center rounded-full"
                        accessibilityRole="button"
                        accessibilityLabel="Edit or delete message"
                    >
                        <Ionicons
                            name="ellipsis-vertical"
                            size={18}
                            color="#9CA3AF"
                        />
                    </Pressable>
                )}

                <Pressable
                    onLongPress={() => handleMessageActions(item)}
                    delayLongPress={350}
                    accessibilityRole="button"
                    accessibilityLabel={
                        isMine
                            ? `Your message: ${item.text}. Long press for options.`
                            : `Message from ${typeof item.sender === "string" ? "your conversation partner" : item.sender.fullName}`
                    }
                    className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                        isMine
                            ? "rounded-br-sm bg-teal-600"
                            : "rounded-bl-sm border border-gray-100 bg-white"
                    }`}
                >
                    <Text
                        className={`text-base leading-6 ${
                            isMine ? "text-white" : "text-gray-800"
                        }`}
                    >
                        {item.text}
                    </Text>

                    <View className="mt-2 flex-row items-center justify-end">
                        {item.isEdited && (
                            <Text
                                className={`mr-2 text-xs ${
                                    isMine ? "text-teal-100" : "text-gray-400"
                                }`}
                            >
                                Edited
                            </Text>
                        )}

                        <Text
                            className={`text-xs ${
                                isMine ? "text-teal-100" : "text-gray-400"
                            }`}
                        >
                            {formatMessageTime(item.createdAt)}
                        </Text>

                        {isMine && (
                            <Ionicons
                                name={
                                    item.readAt || item.deliveredAt
                                        ? "checkmark-done"
                                        : "checkmark"
                                }
                                size={15}
                                color={
                                    item.readAt
                                        ? "#5EEAD4"
                                        : item.deliveredAt
                                            ? "#D1D5DB"
                                            : "#99F6E4"
                                }
                                style={{ marginLeft: 4 }}
                            />
                        )}
                    </View>
                </Pressable>
            </View>
        );
    };

    useEffect(() => {
        let isMounted = true;

        const loadPartnerProfile = async () => {
            if (!partnerId) {
                setPartnerProfilePic("");
                return;
            }

            try {
                const user = await getUserById(partnerId);

                if (!isMounted) return;

                const profilePic = user.profilePic;

                const imageUrl =
                    typeof profilePic === "string"
                        ? profilePic
                        : profilePic?.url ?? "";

                setPartnerProfilePic(imageUrl);
            } catch (error) {
                console.error(
                    "Error loading chat partner profile:",
                    error
                );

                if (isMounted) {
                    setPartnerProfilePic("");
                }
            }
        };

        loadPartnerProfile();

        return () => {
            isMounted = false;
        };
    }, [partnerId]);

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />

            {/* Chat header */}
            <View className="flex-row items-center border-b border-gray-100 bg-white px-4 py-3">
                <Pressable
                    onPress={() => router.back()}
                    className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-50"
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons
                        name="arrow-back"
                        size={22}
                        color="#374151"
                    />
                </Pressable>

                {/* Avatar */}
                {/* Avatar */}
                <View className="mr-3 h-12 w-12 overflow-hidden rounded-full border-2 border-teal-100 bg-teal-50">
                    {partnerProfilePic ? (
                        <Image
                            source={{ uri: partnerProfilePic }}
                            className="h-full w-full"
                            resizeMode="cover"
                            onError={(error) => {
                                console.error(
                                    "Failed to display profile picture:",
                                    error.nativeEvent
                                );
                            }}
                        />
                    ) : (
                        <View className="flex-1 items-center justify-center">
                            <Text className="text-lg font-bold text-teal-700">
                                {title.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Partner information */}
                {/* Partner information */}
                <View className="flex-1">
                    <Text
                        className="text-base font-bold text-gray-900"
                        numberOfLines={1}
                    >
                        {title}
                    </Text>

                    <View className="mt-1 flex-row items-center">
                        <View
                            className={`mr-1.5 h-2 w-2 rounded-full ${isPartnerOnline
                                ? "bg-green-500"
                                : "bg-gray-400"
                                }`}
                        />

                        <Text
                            className={`text-xs ${isPartnerOnline
                                ? "text-green-600"
                                : "text-gray-500"
                                }`}
                        >
                            {isPartnerOnline ? "Online" : "Offline"}
                        </Text>
                    </View>
                </View>

                <Pressable
                    onPress={() => {
                        // Reserved for future conversation options.
                    }}
                    className="h-10 w-10 items-center justify-center rounded-full"
                    accessibilityLabel="Conversation options"
                >
                    <Ionicons
                        name="ellipsis-vertical"
                        size={21}
                        color="#6B7280"
                    />
                </Pressable>
            </View>

            <KeyboardAvoidingView
                className="flex-1"
                behavior={
                    Platform.OS === "ios" ? "padding" : undefined
                }
                keyboardVerticalOffset={
                    Platform.OS === "ios" ? 10 : 0
                }
            >
                {/* Messages */}
                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator
                            size="large"
                            color={PRIMARY_COLOR}
                        />

                        <Text className="mt-3 text-sm text-gray-500">
                            Loading your conversation...
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item._id}
                        renderItem={renderMessage}
                        contentContainerStyle={{
                            paddingHorizontal: 16,
                            paddingTop: 20,
                            paddingBottom: 20,
                            flexGrow: 1,
                        }}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode={
                            Platform.OS === "ios"
                                ? "interactive"
                                : "on-drag"
                        }
                        onContentSizeChange={() => {
                            flatListRef.current?.scrollToEnd({
                                animated: true,
                            });
                        }}
                        ListEmptyComponent={
                            <View className="flex-1 items-center justify-center px-8">
                                <View className="h-20 w-20 items-center justify-center rounded-full bg-teal-50">
                                    <Ionicons
                                        name="chatbubbles-outline"
                                        size={38}
                                        color={PRIMARY_COLOR}
                                    />
                                </View>

                                <Text className="mt-5 text-lg font-bold text-gray-900">
                                    Start a conversation
                                </Text>

                                <Text className="mt-2 text-center text-sm leading-6 text-gray-500">
                                    Every great language exchange
                                    starts with a hello. Introduce
                                    yourself and start practicing
                                    together!
                                </Text>
                            </View>
                        }
                    />
                )}

                {/* Error feedback */}
                {errorMessage ? (
                    <View className="mx-4 mb-2 rounded-xl border border-red-100 bg-red-50 p-3">
                        <View className="flex-row items-start">
                            <Ionicons
                                name="alert-circle-outline"
                                size={19}
                                color="#DC2626"
                            />

                            <View className="ml-2 flex-1">
                                <Text className="text-sm leading-5 text-red-600">
                                    {errorMessage}
                                </Text>

                                <Pressable
                                    onPress={() => loadMessages(true)}
                                    className="mt-2 self-start"
                                >
                                    <Text className="font-semibold text-red-700">
                                        Try again
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                ) : null}

                {/* Message composer */}
                {/* Typing indicator */}
                {isPartnerTyping && (
                    <View className="flex-row items-center bg-gray-50 px-5 py-2">
                        <View className="mr-2 flex-row items-center">
                            <View className="mr-1 h-1.5 w-1.5 rounded-full bg-teal-500" />
                            <View className="mr-1 h-1.5 w-1.5 rounded-full bg-teal-500" />
                            <View className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                        </View>

                        <Text className="text-xs italic text-gray-500">
                            {title} is typing...
                        </Text>
                    </View>
                )}
                {editingMessageId && (
                    <View className="flex-row items-center justify-between border-t border-teal-100 bg-teal-50 px-5 py-2">
                        <View className="flex-row items-center">
                            <Ionicons
                                name="create-outline"
                                size={18}
                                color={PRIMARY_COLOR}
                            />
                            <Text className="ml-2 text-sm font-medium text-teal-700">
                                Editing message
                            </Text>
                        </View>
                        <Pressable
                            onPress={cancelEditing}
                            accessibilityRole="button"
                            accessibilityLabel="Cancel editing"
                            hitSlop={8}
                        >
                            <Ionicons
                                name="close-circle"
                                size={22}
                                color={PRIMARY_COLOR}
                            />
                        </Pressable>
                    </View>
                )}

                <View className="border-t border-gray-100 bg-white px-4 py-3">
                    <View className="flex-row items-end">
                        <View className="mr-3 min-h-12 flex-1 flex-row items-end rounded-3xl border border-gray-200 bg-gray-50 px-4">
                            <TextInput
                                ref={inputRef}
                                value={text}
                                onChangeText={handleTextChange}
                                placeholder={
                                    editingMessageId
                                        ? "Edit your message..."
                                        : "Write a message..."
                                }
                                placeholderTextColor="#9CA3AF"
                                multiline
                                maxLength={5000}
                                editable={!sending}
                                returnKeyType="default"
                                blurOnSubmit={false}
                                className="max-h-32 min-h-12 flex-1 py-3 text-base leading-6 text-gray-900"
                                accessibilityLabel="Message text"
                            />

                            <View className="mb-3 ml-2">
                                <Ionicons
                                    name="happy-outline"
                                    size={22}
                                    color="#9CA3AF"
                                />
                            </View>
                        </View>

                        <Pressable
                            onPress={handleSendMessage}
                            disabled={!text.trim() || sending}
                            className={`h-12 w-12 items-center justify-center rounded-full ${text.trim() && !sending
                                ? "bg-teal-600"
                                : "bg-teal-200"
                                }`}
                            accessibilityRole="button"
                            accessibilityLabel={
                                editingMessageId ? "Save edited message" : "Send message"
                            }
                        >
                            {sending ? (
                                <ActivityIndicator
                                    size="small"
                                    color="#FFFFFF"
                                />
                            ) : (
                                <Ionicons
                                    name={editingMessageId ? "checkmark" : "send"}
                                    size={19}
                                    color="#FFFFFF"
                                />
                            )}
                        </Pressable>
                    </View>

                    <Text className="mt-2 text-center text-xs text-gray-400">
                        Practice a language. Make a connection.
                    </Text>
                </View>
                {/* Cross-platform message actions modal */}
                <Modal
                    visible={isActionsModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setIsActionsModalVisible(false)}
                >
                    <Pressable
                        className="flex-1 justify-end bg-black/40"
                        onPress={() => setIsActionsModalVisible(false)}
                    >
                        <Pressable
                            className="rounded-t-3xl bg-white px-5 pb-8 pt-5"
                            onPress={(event) => event.stopPropagation()}
                        >
                            <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-gray-200" />
                            <Text className="mb-4 text-lg font-bold text-gray-900">
                                Message options
                            </Text>

                            <Pressable
                                onPress={handleEditSelectedMessage}
                                className="flex-row items-center rounded-xl px-3 py-4 active:bg-gray-50"
                                accessibilityRole="button"
                            >
                                <Ionicons name="create-outline" size={22} color="#0D9488" />
                                <Text className="ml-3 text-base font-medium text-gray-800">
                                    Edit message
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={handleRequestDelete}
                                className="flex-row items-center rounded-xl px-3 py-4 active:bg-red-50"
                                accessibilityRole="button"
                            >
                                <Ionicons name="trash-outline" size={22} color="#DC2626" />
                                <Text className="ml-3 text-base font-medium text-red-600">
                                    Delete message
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() => {
                                    setIsActionsModalVisible(false);
                                    setSelectedMessage(null);
                                }}
                                className="mt-2 items-center rounded-xl bg-gray-100 py-3"
                                accessibilityRole="button"
                            >
                                <Text className="text-base font-semibold text-gray-700">
                                    Cancel
                                </Text>
                            </Pressable>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Delete confirmation modal */}
                <Modal
                    visible={isDeleteModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => {
                        if (!deleting) {
                            setIsDeleteModalVisible(false);
                            setSelectedMessage(null);
                        }
                    }}
                >
                    <View className="flex-1 items-center justify-center bg-black/40 px-6">
                        <View className="w-full max-w-md rounded-2xl bg-white p-6">
                            <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-red-50">
                                <Ionicons name="trash-outline" size={24} color="#DC2626" />
                            </View>
                            <Text className="text-lg font-bold text-gray-900">
                                Delete message?
                            </Text>
                            <Text className="mt-2 text-sm leading-6 text-gray-500">
                                Are you sure you want to permanently delete this message? This action cannot be undone.
                            </Text>

                            <View className="mt-6 flex-row justify-end">
                                <Pressable
                                    disabled={deleting}
                                    onPress={() => {
                                        setIsDeleteModalVisible(false);
                                        setSelectedMessage(null);
                                    }}
                                    className="mr-3 rounded-xl bg-gray-100 px-4 py-3"
                                    accessibilityRole="button"
                                >
                                    <Text className="font-semibold text-gray-700">Cancel</Text>
                                </Pressable>
                                <Pressable
                                    disabled={deleting}
                                    onPress={confirmDeleteMessage}
                                    className="min-w-24 items-center rounded-xl bg-red-600 px-4 py-3"
                                    accessibilityRole="button"
                                >
                                    {deleting ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <Text className="font-semibold text-white">Delete</Text>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}