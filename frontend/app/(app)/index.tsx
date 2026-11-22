import { useOnlineUsersStore } from "../../store/onlineUsers.store";
import React, { useCallback, useEffect, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    Text,
    TextInput,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
    getLanguageMatches,
    getExchangeRequests,
    sendExchangeRequest,
} from "../../lib/user.api";

interface LanguageUser {
    _id: string;
    fullName: string;
    email?: string;
    bio?: string;
    profilePic?: string | { url?: string };
    nativeLanguages?: string[];
    learningLanguages?: string[];
    country?: string;
    city?: string;
}

interface ExchangeRequest {
    _id: string;
    sender?: LanguageUser | string;
    receiver?: LanguageUser | string;
    status: "pending" | "accepted" | "rejected";
}

interface RequestState {
    status: ExchangeRequest["status"];
    direction: "sent" | "received";
}

interface RequestsResponse {
    receivedRequests: ExchangeRequest[];
    sentRequests: ExchangeRequest[];
}

export default function DiscoverScreen() {
    const [users, setUsers] = useState<LanguageUser[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const onlineUserIds = useOnlineUsersStore(
        (state) => state.onlineUserIds
    );

    const [sendingRequests, setSendingRequests] = useState<string[]>([]);

    const [requestStates, setRequestStates] = useState<
        Record<string, RequestState>
    >({});



    const loadUsers = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");

            const [matchesResponse, requestsResponse] = await Promise.all([
                getLanguageMatches(),
                getExchangeRequests(),
            ]);

            // Support multiple possible match response formats.
            const matches = Array.isArray(matchesResponse)
                ? matchesResponse
                : matchesResponse?.matches ??
                matchesResponse?.users ??
                matchesResponse?.data ??
                [];

            if (!Array.isArray(matches)) {
                throw new Error(
                    "Unexpected response when loading language matches."
                );
            }

            const requests: RequestsResponse = requestsResponse;

            const states: Record<string, RequestState> = {};

            // Requests received from other users.
            for (const request of requests.receivedRequests ?? []) {
                const senderId =
                    typeof request.sender === "string"
                        ? request.sender
                        : request.sender?._id;

                if (senderId) {
                    states[senderId] = {
                        status: request.status,
                        direction: "received",
                    };
                }
            }

            // Requests sent to other users.
            for (const request of requests.sentRequests ?? []) {
                const receiverId =
                    typeof request.receiver === "string"
                        ? request.receiver
                        : request.receiver?._id;

                if (receiverId) {
                    states[receiverId] = {
                        status: request.status,
                        direction: "sent",
                    };
                }
            }

            setUsers(matches);
            setRequestStates(states);
        } catch (err: any) {
            console.error(
                "Error loading Discover data:",
                err.response?.data ?? err.message
            );

            setError(
                err.response?.data?.message ??
                "Couldn't load language partners. Please try again."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleSendRequest = async (receiverId: string) => {
        const existingRequest = requestStates[receiverId];

        // Prevent duplicate requests while one is pending or accepted.
        if (
            sendingRequests.includes(receiverId) ||
            existingRequest?.status === "pending" ||
            existingRequest?.status === "accepted"
        ) {
            return;
        }

        try {
            setSendingRequests((previous) => [
                ...previous,
                receiverId,
            ]);

            await sendExchangeRequest(receiverId);

            // Immediately update the button.
            setRequestStates((previous) => ({
                ...previous,
                [receiverId]: {
                    status: "pending",
                    direction: "sent",
                },
            }));

            Alert.alert(
                "Request sent",
                "Your language exchange request was sent successfully."
            );
        } catch (err: any) {
            const statusCode = err.response?.status;
            const message =
                err.response?.data?.message ??
                "Couldn't send your request. Please try again.";

            // Refresh the request states if the backend reports
            // that a request already exists.
            if (
                statusCode === 409 ||
                message.toLowerCase().includes("already")
            ) {
                await loadUsers(true);

                Alert.alert(
                    "Request already exists",
                    message
                );
            } else {
                console.error(
                    "Error sending exchange request:",
                    err.response?.data ?? err.message
                );

                Alert.alert("Request failed", message);
            }
        } finally {
            setSendingRequests((previous) =>
                previous.filter((id) => id !== receiverId)
            );
        }
    };

    const filteredUsers = users.filter((user) => {
        const query = search.trim().toLowerCase();

        if (!query) return true;

        const searchableText = [
            user.fullName,
            user.bio,
            user.country,
            user.city,
            ...(user.nativeLanguages ?? []),
            ...(user.learningLanguages ?? []),
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return searchableText.includes(query);
    });

    const getProfilePicture = (
        profilePic?: string | { url?: string }
    ): string | undefined => {
        if (typeof profilePic === "string") {
            return profilePic || undefined;
        }

        return profilePic?.url || undefined;
    };

    const renderLanguageTags = (
        languages: string[],
        backgroundColor: string,
        textColor: string
    ) => {
        if (!languages?.length) {
            return (
                <Text className="text-sm text-gray-400">
                    Not specified
                </Text>
            );
        }

        return (
            <View className="mt-2 flex-row flex-wrap gap-2">
                {languages.map((language, index) => (
                    <View
                        key={`${language}-${index}`}
                        style={{ backgroundColor }}
                        className="rounded-full px-3 py-1.5"
                    >
                        <Text
                            style={{ color: textColor }}
                            className="text-xs font-medium"
                        >
                            {language}
                        </Text>
                    </View>
                ))}
            </View>
        );
    };

    const renderUser = ({ item }: { item: LanguageUser }) => {
        const isSending = sendingRequests.includes(item._id);
        const request = requestStates[item._id];

        const isPending = request?.status === "pending";
        const isConnected = request?.status === "accepted";

        const requestSent = isPending && request?.direction === "sent";
        const requestReceived =
            isPending && request?.direction === "received";

        // A rejected request can be sent again.
        const isDisabled =
            isSending || isPending || isConnected;

        let buttonLabel = "Connect";
        let buttonIcon: React.ComponentProps<
            typeof Ionicons
        >["name"] = "person-add-outline";

        if (isSending) {
            buttonLabel = "Sending...";
        } else if (isConnected) {
            buttonLabel = "Connected";
            buttonIcon = "checkmark-circle";
        } else if (requestSent) {
            buttonLabel = "Request Sent";
            buttonIcon = "time-outline";
        } else if (requestReceived) {
            buttonLabel = "Respond to Request";
            buttonIcon = "mail-open-outline";
        }

        const picture = getProfilePicture(item.profilePic);

        return (
            <View className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                {/* User information */}
                <View className="flex-row items-center">
                    <View className="relative">
                        {picture ? (
                            <Image
                                source={{ uri: picture }}
                                className="h-16 w-16 rounded-full bg-gray-100"
                                resizeMode="cover"
                            />
                        ) : (
                            <View className="h-16 w-16 items-center justify-center rounded-full bg-teal-50">
                                <Ionicons
                                    name="person"
                                    size={32}
                                    color="#0D9488"
                                />
                            </View>
                        )}

                        {/* Online status indicator */}
                        <View
                            className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${onlineUserIds.includes(item._id)
                                    ? "bg-green-500"
                                    : "bg-gray-400"
                                }`}
                        />
                    </View>

                    <View className="ml-3 flex-1">
                        <Text className="text-lg font-bold text-gray-900">
                            {item.fullName}
                        </Text>

                        <View className="mt-1 flex-row items-center">
                            <View
                                className={`mr-1.5 h-2 w-2 rounded-full ${onlineUserIds.includes(item._id)
                                        ? "bg-green-500"
                                        : "bg-gray-400"
                                    }`}
                            />

                            <Text
                                className={`text-xs ${onlineUserIds.includes(item._id)
                                        ? "text-green-600"
                                        : "text-gray-500"
                                    }`}
                            >
                                {onlineUserIds.includes(item._id)
                                    ? "Online"
                                    : "Offline"}
                            </Text>
                        </View>

                        {(item.city || item.country) && (
                            <View className="mt-1 flex-row items-center">
                                <Ionicons
                                    name="location-outline"
                                    size={14}
                                    color="#6B7280"
                                />

                                <Text className="ml-1 text-sm text-gray-500">
                                    {[item.city, item.country]
                                        .filter(Boolean)
                                        .join(", ")}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Biography */}
                {item.bio ? (
                    <Text className="mt-4 leading-5 text-gray-600">
                        {item.bio}
                    </Text>
                ) : (
                    <Text className="mt-4 italic text-gray-400">
                        No biography yet.
                    </Text>
                )}

                {/* Native languages */}
                <View className="mt-4">
                    <Text className="font-semibold text-gray-800">
                        Native languages
                    </Text>

                    {renderLanguageTags(
                        item.nativeLanguages ?? [],
                        "#CCFBF1",
                        "#115E59"
                    )}
                </View>

                {/* Learning languages */}
                <View className="mt-4">
                    <Text className="font-semibold text-gray-800">
                        Learning
                    </Text>

                    {renderLanguageTags(
                        item.learningLanguages ?? [],
                        "#DBEAFE",
                        "#1D4ED8"
                    )}
                </View>

                {/* Exchange request button */}
                <Pressable
                    onPress={() => handleSendRequest(item._id)}
                    disabled={isDisabled}
                    className={`mt-5 flex-row items-center justify-center rounded-xl py-3 ${isConnected
                        ? "bg-green-100"
                        : isPending
                            ? "bg-gray-200"
                            : "bg-teal-600"
                        }`}
                    style={({ pressed }) => ({
                        opacity: pressed && !isDisabled ? 0.8 : 1,
                    })}
                >
                    {isSending ? (
                        <ActivityIndicator
                            size="small"
                            color="#0D9488"
                        />
                    ) : (
                        <>
                            <Ionicons
                                name={buttonIcon}
                                size={18}
                                color={
                                    isConnected
                                        ? "#15803D"
                                        : isPending
                                            ? "#6B7280"
                                            : "#FFFFFF"
                                }
                            />

                            <Text
                                className={`ml-2 font-semibold ${isConnected
                                    ? "text-green-700"
                                    : isPending
                                        ? "text-gray-600"
                                        : "text-white"
                                    }`}
                            >
                                {buttonLabel}
                            </Text>
                        </>
                    )}
                </Pressable>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-gray-50">
                <ActivityIndicator
                    size="large"
                    color="#0D9488"
                />

                <Text className="mt-3 text-gray-500">
                    Finding language partners...
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            className="flex-1 bg-gray-50"
            edges={["top"]}
        >
            {/* Header */}
            <View className="bg-white px-5 pb-5 pt-3">
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text className="text-sm font-medium text-teal-600">
                            SPEAKABLE
                        </Text>

                        <Text className="mt-1 text-2xl font-bold text-gray-900">
                            Discover
                        </Text>

                        <Text className="mt-1 text-sm text-gray-500">
                            Find your next language partner.
                        </Text>
                    </View>

                    <View className="h-12 w-12 items-center justify-center rounded-2xl bg-teal-50">
                        <Ionicons
                            name="earth-outline"
                            size={28}
                            color="#0D9488"
                        />
                    </View>
                </View>

                {/* Search */}
                <View className="mt-5 flex-row items-center rounded-xl bg-gray-100 px-4">
                    <Ionicons
                        name="search-outline"
                        size={20}
                        color="#6B7280"
                    />

                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search languages, names, cities..."
                        placeholderTextColor="#9CA3AF"
                        className="ml-3 flex-1 py-3 text-gray-900"
                        autoCapitalize="none"
                        returnKeyType="search"
                    />

                    {search.length > 0 && (
                        <Pressable onPress={() => setSearch("")}>
                            <Ionicons
                                name="close-circle"
                                size={20}
                                color="#9CA3AF"
                            />
                        </Pressable>
                    )}
                </View>
            </View>

            {/* User list */}
            {error ? (
                <View className="flex-1 items-center justify-center px-8">
                    <Ionicons
                        name="cloud-offline-outline"
                        size={48}
                        color="#9CA3AF"
                    />

                    <Text className="mt-4 text-center text-lg font-bold text-gray-800">
                        Something went wrong
                    </Text>

                    <Text className="mt-2 text-center text-gray-500">
                        {error}
                    </Text>

                    <Pressable
                        onPress={() => loadUsers()}
                        className="mt-5 rounded-xl bg-teal-600 px-6 py-3"
                    >
                        <Text className="font-semibold text-white">
                            Try again
                        </Text>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item._id}
                    renderItem={renderUser}
                    contentContainerStyle={{
                        paddingHorizontal: 16,
                        paddingTop: 20,
                        paddingBottom: 24,
                        flexGrow: 1,
                    }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadUsers(true)}
                            tintColor="#0D9488"
                        />
                    }
                    ListHeaderComponent={
                        <View className="mb-4">
                            <Text className="text-lg font-bold text-gray-900">
                                Language partners
                            </Text>

                            <Text className="mt-1 text-sm text-gray-500">
                                {filteredUsers.length}{" "}
                                {filteredUsers.length === 1
                                    ? "person"
                                    : "people"}{" "}
                                found
                            </Text>
                        </View>
                    }
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center py-16">
                            <Ionicons
                                name="people-outline"
                                size={48}
                                color="#9CA3AF"
                            />

                            <Text className="mt-4 text-center text-lg font-bold text-gray-800">
                                No language partners found
                            </Text>

                            <Text className="mt-2 text-center text-gray-500">
                                {search
                                    ? "Try another search term."
                                    : "Check back later to discover new people."}
                            </Text>
                        </View>
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}