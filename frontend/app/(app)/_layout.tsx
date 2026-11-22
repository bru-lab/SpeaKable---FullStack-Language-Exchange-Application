import { Tabs } from "expo-router";
import { useUnreadMessagesStore } from "../../store/unreadMessages.store";
import { Ionicons } from "@expo/vector-icons";
import { useSocket } from "@/hooks/socket";

export default function AppLayout() {

    useSocket();

    const unreadCounts = useUnreadMessagesStore(
        (state) => state.unreadCounts
    );

    const totalUnreadCount = Object.values(
        unreadCounts
    ).reduce((total, count) => total + count, 0);

    const messagesBadge =
        totalUnreadCount > 99
            ? "99+"
            : totalUnreadCount;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#0D9488",
                tabBarInactiveTintColor: "#9CA3AF",
            }}
            screenListeners={{
                tabPress: (event) => {
                    console.log(
                        "Tab pressed:",
                        event.target
                    );
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Discover",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons
                            name="search-outline"
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="messages"
                options={{
                    title: "Messages",

                    tabBarBadge:
                        totalUnreadCount > 0
                            ? messagesBadge
                            : undefined,

                    tabBarBadgeStyle: {
                        backgroundColor: "#0D9488",
                        color: "#FFFFFF",
                    },

                    tabBarIcon: ({ color, size }) => (
                        <Ionicons
                            name="chatbubbles-outline"
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="requests"
                options={{
                    title: "Requests",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons
                            name="people-outline"
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="favorites"
                options={{
                    title: "Favorites",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons
                            name="heart-outline"
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons
                            name="person-outline"
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="chat/[conversationId]"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}