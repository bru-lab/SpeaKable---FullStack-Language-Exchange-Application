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

export default function SignupScreen() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const { signup, isSigningUp } = useAuthStore();

    const handleSignup = async () => {
        if (!fullName || !email || !password || !confirmPassword) {
            Alert.alert(
                "Missing fields",
                "Please fill in all fields."
            );
            return;
        }

        if (password.length < 6) {
            Alert.alert(
                "Invalid password",
                "Password must be at least 6 characters."
            );
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert(
                "Passwords don't match",
                "Please make sure both passwords are the same."
            );
            return;
        }

        const result = await signup(fullName, email, password);

        if (!result.success) {
            Alert.alert(
                "Signup failed",
                result.message || "Unable to create your account."
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
                {/* Header */}
                <View className="mb-8">
                    <Text className="text-4xl font-bold text-gray-900">
                        Speakable
                    </Text>

                    <Text className="mt-2 text-base text-gray-500">
                        Create your account and start connecting.
                    </Text>
                </View>

                {/* Form */}
                <View>
                    {/* Full name */}
                    <Text className="mb-2 text-sm font-semibold text-gray-700">
                        Full name
                    </Text>

                    <TextInput
                        className="mb-5 rounded-xl border border-gray-300 bg-gray-50 px-4 py-4 text-base text-gray-900"
                        placeholder="Enter your full name"
                        placeholderTextColor="#9ca3af"
                        value={fullName}
                        onChangeText={setFullName}
                        autoCapitalize="words"
                        autoComplete="name"
                    />

                    {/* Email */}
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

                    {/* Password */}
                    <Text className="mb-2 text-sm font-semibold text-gray-700">
                        Password
                    </Text>

                    <TextInput
                        className="mb-5 rounded-xl border border-gray-300 bg-gray-50 px-4 py-4 text-base text-gray-900"
                        placeholder="Create a password"
                        placeholderTextColor="#9ca3af"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        autoComplete="new-password"
                    />

                    {/* Confirm password */}
                    <Text className="mb-2 text-sm font-semibold text-gray-700">
                        Confirm password
                    </Text>

                    <TextInput
                        className="mb-6 rounded-xl border border-gray-300 bg-gray-50 px-4 py-4 text-base text-gray-900"
                        placeholder="Confirm your password"
                        placeholderTextColor="#9ca3af"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        autoComplete="new-password"
                    />

                    {/* Signup button */}
                    <Pressable
                        className="items-center rounded-xl bg-blue-600 py-4"
                        onPress={handleSignup}
                        disabled={isSigningUp}
                    >
                        {isSigningUp ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text className="text-base font-bold text-white">
                                Create account
                            </Text>
                        )}
                    </Pressable>
                </View>

                {/* Login link */}
                <View className="mt-8 flex-row justify-center">
                    <Text className="text-gray-500">
                        Already have an account?{" "}
                    </Text>

                    <Pressable onPress={() => router.push("/login")}>
                        <Text className="font-bold text-blue-600">
                            Login
                        </Text>
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}