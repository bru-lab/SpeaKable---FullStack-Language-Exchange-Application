import React from "react";
import { View } from "react-native";

interface OnlineIndicatorProps {
    isOnline: boolean;
    size?: number;
}

export default function OnlineIndicator({
    isOnline,
    size = 10,
}: OnlineIndicatorProps) {
    return (
        <View
            className={`rounded-full border-2 border-white ${
                isOnline ? "bg-green-500" : "bg-gray-400"
            }`}
            style={{
                width: size,
                height: size,
            }}
        />
    );
}