import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    acceptExchangeRequest,
    getExchangeRequests,
    rejectExchangeRequest,
    type ExchangeRequest,
    type ExchangeUser,
} from "../../lib/exchangeRequest.api";

type RequestTab = "received" | "sent";

export default function RequestsScreen() {
    const [activeTab, setActiveTab] =
        useState<RequestTab>("received");

    const [receivedRequests, setReceivedRequests] =
        useState<ExchangeRequest[]>([]);

    const [sentRequests, setSentRequests] =
        useState<ExchangeRequest[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(
        null
    );
    const [errorMessage, setErrorMessage] = useState("");

    const loadRequests = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setErrorMessage("");

        try {
            const data = await getExchangeRequests();

            setReceivedRequests(data.receivedRequests ?? []);
            setSentRequests(data.sentRequests ?? []);
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
                    "Unable to load exchange requests. Please try again."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    const handleAccept = async (request: ExchangeRequest) => {
        setProcessingId(request._id);

        try {
            await acceptExchangeRequest(request._id);

            setReceivedRequests((previous) =>
                previous.map((item) =>
                    item._id === request._id
                        ? { ...item, status: "accepted" }
                        : item
                )
            );

            Alert.alert(
                "Request accepted",
                "You are now connected! You can start exchanging languages."
            );
        } catch (error) {
            const apiError = error as {
                response?: {
                    data?: {
                        message?: string;
                    };
                };
            };

            Alert.alert(
                "Something went wrong",
                apiError.response?.data?.message ??
                    "Unable to accept this request. Please try again."
            );

            await loadRequests(true);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (request: ExchangeRequest) => {
        Alert.alert(
            "Reject request",
            "Are you sure you want to reject this exchange request?",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Reject",
                    style: "destructive",
                    onPress: async () => {
                        setProcessingId(request._id);

                        try {
                            await rejectExchangeRequest(request._id);

                            setReceivedRequests((previous) =>
                                previous.map((item) =>
                                    item._id === request._id
                                        ? {
                                              ...item,
                                              status: "rejected",
                                          }
                                        : item
                                )
                            );
                        } catch (error) {
                            const apiError = error as {
                                response?: {
                                    data?: {
                                        message?: string;
                                    };
                                };
                            };

                            Alert.alert(
                                "Something went wrong",
                                apiError.response?.data?.message ??
                                    "Unable to reject this request."
                            );

                            await loadRequests(true);
                        } finally {
                            setProcessingId(null);
                        }
                    },
                },
            ]
        );
    };

    const currentRequests =
        activeTab === "received"
            ? receivedRequests
            : sentRequests;

    const pendingReceivedCount = receivedRequests.filter(
        (request) => request.status === "pending"
    ).length;

    const getOtherUser = (
        request: ExchangeRequest
    ): ExchangeUser | null => {
        return activeTab === "received"
            ? request.sender
            : request.receiver;
    };

    const getProfilePicture = (user: ExchangeUser) => {
        if (typeof user.profilePic === "string") {
            return user.profilePic;
        }

        if (user.profilePic && typeof user.profilePic === "object") {
            return user.profilePic.url ?? "";
        }

        return "";
    };

    const getStatusStyle = (status: ExchangeRequest["status"]) => {
        switch (status) {
            case "accepted":
                return "bg-green-100 text-green-700";

            case "rejected":
                return "bg-red-100 text-red-700";

            default:
                return "bg-amber-100 text-amber-700";
        }
    };

    const getStatusLabel = (status: ExchangeRequest["status"]) => {
        switch (status) {
            case "accepted":
                return "Accepted";
            case "rejected":
                return "Rejected";
            default:
                return "Pending";
        }
    };

    const renderRequest = ({
        item,
    }: {
        item: ExchangeRequest;
    }) => {
        const user = getOtherUser(item);
        const isProcessing = processingId === item._id;

        if (!user) {
            return (
                <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
                    <Text className="text-gray-500">
                        This user's profile is no longer available.
                    </Text>
                </View>
            );
        }

        const nativeLanguages =
            user.nativeLanguages?.join(", ") || "Not specified";

        const learningLanguages =
            user.learningLanguages?.join(", ") || "Not specified";

        const profilePicture = getProfilePicture(user);

        return (
            <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
                <View className="flex-row items-start">
                    {profilePicture ? (
                        <Image
                            source={{ uri: profilePicture }}
                            className="h-16 w-16 rounded-full bg-gray-100"
                        />
                    ) : (
                        <View className="h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
                            <Text className="text-xl font-bold text-indigo-600">
                                {user.fullName?.charAt(0)?.toUpperCase() ??
                                    "?"}
                            </Text>
                        </View>
                    )}

                    <View className="ml-3 flex-1">
                        <Text className="text-base font-bold text-gray-900">
                            {user.fullName}
                        </Text>

                        <Text className="mt-2 text-xs font-semibold uppercase text-gray-500">
                            Native languages
                        </Text>

                        <Text className="mt-1 text-sm text-gray-700">
                            {nativeLanguages}
                        </Text>

                        <Text className="mt-2 text-xs font-semibold uppercase text-gray-500">
                            Learning
                        </Text>

                        <Text className="mt-1 text-sm text-gray-700">
                            {learningLanguages}
                        </Text>
                    </View>
                </View>

                {user.bio ? (
                    <Text className="mt-3 text-sm leading-5 text-gray-600">
                        {user.bio}
                    </Text>
                ) : null}

                <View className="mt-4 flex-row items-center justify-between">
                    <Text
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            item.status
                        )}`}
                    >
                        {getStatusLabel(item.status)}
                    </Text>

                    {item.createdAt ? (
                        <Text className="text-xs text-gray-400">
                            {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                    ) : null}
                </View>

                {activeTab === "received" &&
                    item.status === "pending" && (
                        <View className="mt-4 flex-row gap-3">
                            <Pressable
                                onPress={() => handleReject(item)}
                                disabled={isProcessing}
                                className="flex-1 items-center justify-center rounded-xl border border-gray-300 py-3"
                            >
                                <Text className="font-semibold text-gray-700">
                                    Reject
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() => handleAccept(item)}
                                disabled={isProcessing}
                                className="flex-1 items-center justify-center rounded-xl bg-indigo-600 py-3"
                            >
                                {isProcessing ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text className="font-semibold text-white">
                                        Accept
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    )}

                {activeTab === "sent" &&
                    item.status === "pending" && (
                        <Text className="mt-3 text-sm text-gray-500">
                            Waiting for a response...
                        </Text>
                    )}

                {item.status === "accepted" && (
                    <Text className="mt-3 text-sm text-green-700">
                        You're connected! Your conversation is ready.
                    </Text>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView
            className="flex-1 bg-gray-50"
            edges={["top", "left", "right"]}
        >
            <View className="px-5 pb-3 pt-4">
                <Text className="text-3xl font-bold text-gray-900">
                    Requests
                </Text>

                <Text className="mt-2 text-sm text-gray-500">
                    Connect with people and practice languages together.
                </Text>
            </View>

            {/* Received / Sent tabs */}
            <View className="mx-5 mb-4 flex-row rounded-xl bg-gray-200 p-1">
                <Pressable
                    onPress={() => setActiveTab("received")}
                    className={`flex-1 flex-row items-center justify-center rounded-lg py-3 ${
                        activeTab === "received" ? "bg-white" : ""
                    }`}
                >
                    <Text
                        className={`font-semibold ${
                            activeTab === "received"
                                ? "text-indigo-600"
                                : "text-gray-600"
                        }`}
                    >
                        Received
                    </Text>

                    {pendingReceivedCount > 0 && (
                        <View className="ml-2 min-w-5 items-center rounded-full bg-indigo-600 px-1.5 py-0.5">
                            <Text className="text-xs font-bold text-white">
                                {pendingReceivedCount}
                            </Text>
                        </View>
                    )}
                </Pressable>

                <Pressable
                    onPress={() => setActiveTab("sent")}
                    className={`flex-1 items-center justify-center rounded-lg py-3 ${
                        activeTab === "sent" ? "bg-white" : ""
                    }`}
                >
                    <Text
                        className={`font-semibold ${
                            activeTab === "sent"
                                ? "text-indigo-600"
                                : "text-gray-600"
                        }`}
                    >
                        Sent
                    </Text>
                </Pressable>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator
                        size="large"
                        color="#4f46e5"
                    />
                    <Text className="mt-3 text-sm text-gray-500">
                        Loading requests...
                    </Text>
                </View>
            ) : errorMessage ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Text className="text-center text-base text-red-600">
                        {errorMessage}
                    </Text>

                    <Pressable
                        onPress={() => loadRequests()}
                        className="mt-4 rounded-xl bg-indigo-600 px-6 py-3"
                    >
                        <Text className="font-semibold text-white">
                            Try again
                        </Text>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={currentRequests}
                    keyExtractor={(item) => item._id}
                    renderItem={renderRequest}
                    contentContainerStyle={{
                        paddingHorizontal: 20,
                        paddingTop: 4,
                        paddingBottom: 32,
                        flexGrow: 1,
                    }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadRequests(true)}
                        />
                    }
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center px-6 py-16">
                            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-indigo-100">
                                <Text className="text-3xl">
                                    {activeTab === "received" ? "📩" : "🌍"}
                                </Text>
                            </View>

                            <Text className="text-center text-lg font-bold text-gray-900">
                                {activeTab === "received"
                                    ? "No requests yet"
                                    : "No sent requests yet"}
                            </Text>

                            <Text className="mt-2 text-center text-sm leading-6 text-gray-500">
                                {activeTab === "received"
                                    ? "When someone wants to practice languages with you, their request will appear here."
                                    : "Explore language partners and send a request to start connecting."}
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}