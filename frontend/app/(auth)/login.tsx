import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import { router } from "expo-router";

import { useAuthStore } from "../../store/authStore";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const { login, isLoggingIn } = useAuthStore();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert(
                "Missing fields",
                "Please enter your email and password."
            );
            return;
        }

        const result = await login(email, password);

        if (!result.success) {
            Alert.alert(
                "Login failed",
                result.message || "Unable to login."
            );
            return;
        }

        router.replace("/");
    };

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-white"
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <View className="flex-1 justify-center px-6">
                <View className="mb-10">
                    <Text className="text-4xl font-bold text-gray-900">
                        Speakable
                    </Text>

                    <Text className="mt-2 text-base text-gray-500">
                        Connect. Practice. Speak.
                    </Text>
                </View>

                <View>
                    <Text className="mb-2 text-sm font-semibold text-gray-700">
                        Email
                    </Text>

                    <TextInput
                        className="mb-5 rounded-xl border border-gray-300 bg-gray-50 px-4 py-4 text-base text-gray-900"
                        placeholder="Enter your email"
                        placeholderTextColor="#9ca3af"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoComplete="email"
                    />

                    <Text className="mb-2 text-sm font-semibold text-gray-700">
                        Password
                    </Text>

                    <TextInput
                        className="mb-6 rounded-xl border border-gray-300 bg-gray-50 px-4 py-4 text-base text-gray-900"
                        placeholder="Enter your password"
                        placeholderTextColor="#9ca3af"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        autoComplete="password"
                    />

                    <Pressable
                        className="items-center rounded-xl bg-blue-600 py-4"
                        onPress={handleLogin}
                        disabled={isLoggingIn}
                    >
                        {isLoggingIn ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text className="text-base font-bold text-white">
                                Login
                            </Text>
                        )}
                    </Pressable>
                </View>

                <View className="mt-8 flex-row justify-center">
                    <Text className="text-gray-500">
                        Don't have an account?{" "}
                    </Text>

                    <Pressable onPress={() => router.push("/signup")}>
                        <Text className="font-bold text-blue-600">
                            Sign up
                        </Text>
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}