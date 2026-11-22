import { io, Socket } from "socket.io-client";
import { Platform } from "react-native";
import { useOnlineUsersStore } from "../store/onlineUsers.store";

const SOCKET_URL =
    process.env.EXPO_PUBLIC_SOCKET_URL ||
    (Platform.OS === "web"
        ? "http://localhost:5000"
        : "http://192.168.15.8:5000");

export const socket: Socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ["websocket"],
});

let onlineListenersRegistered = false;

export const setupOnlineStatusListeners = () => {
    if (onlineListenersRegistered) return;

    onlineListenersRegistered = true;

    const setOnlineUsers =
        useOnlineUsersStore.getState().setOnlineUsers;

    const addOnlineUser =
        useOnlineUsersStore.getState().addOnlineUser;

    const removeOnlineUser =
        useOnlineUsersStore.getState().removeOnlineUser;

    socket.on("online-users", (userIds: string[]) => {
        setOnlineUsers(userIds);
    });

    socket.on(
        "user-online",
        ({ userId }: { userId: string }) => {
            addOnlineUser(userId);
        }
    );

    socket.on(
        "user-offline",
        ({ userId }: { userId: string }) => {
            removeOnlineUser(userId);
        }
    );
};

export const connectSocket = (token?: string) => {
    setupOnlineStatusListeners();

    if (token) {
        socket.auth = { token };
    } else {
        socket.auth = {};
    }

    if (!socket.connected) {
        socket.connect();
    }
};

export const disconnectSocket = () => {
    if (socket.connected) {
        socket.disconnect();
    }
};

socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
});

socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error.message);
});

socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);

    useOnlineUsersStore.getState().setOnlineUsers([]);
});