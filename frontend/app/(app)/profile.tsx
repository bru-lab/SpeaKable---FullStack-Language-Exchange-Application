import React, { useEffect, useState } from "react";
import * as ImageManipulator from "expo-image-manipulator";

import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

import * as ImagePicker from "expo-image-picker";

import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "../../store/authStore";

import { updateUserProfile } from "../../lib/user.api";

export default function ProfileScreen() {
    const {
        authUser,
        updateAuthUser,
        logout,
    } = useAuthStore();

    const [fullName, setFullName] = useState("");
    const [bio, setBio] = useState("");
    const [city, setCity] = useState("");
    const [country, setCountry] = useState("");

    const [nativeLanguages, setNativeLanguages] =
        useState("");

    const [learningLanguages, setLearningLanguages] =
        useState("");

    const [interests, setInterests] = useState("");

    const [profilePic, setProfilePic] = useState<
        string | undefined
    >();

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!authUser) return;

        setFullName(authUser.fullName || "");
        setBio(authUser.bio || "");
        setCity(authUser.city || "");
        setCountry(authUser.country || "");

        setNativeLanguages(
            authUser.nativeLanguages?.join(", ") || ""
        );

        setLearningLanguages(
            authUser.learningLanguages?.join(", ") || ""
        );

        setInterests(
            authUser.interests?.join(", ") || ""
        );

        setProfilePic(authUser.profilePic);
    }, [authUser]);

    const showMessage = (
        title: string,
        message: string
    ) => {
        if (Platform.OS === "web") {
            window.alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const pickImage = async () => {
    try {
        const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            showMessage(
                "Permission required",
                "Please allow access to your photo library."
            );
            return;
        }

        const result =
            await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });

        if (result.canceled || !result.assets?.length) {
            return;
        }

        const image = result.assets[0];

        // Resize and compress the selected image.
        const compressedImage =
            await ImageManipulator.manipulateAsync(
                image.uri,
                [{ resize: { width: 512, height: 512 } }],
                {
                    compress: 0.6,
                    format:
                        ImageManipulator.SaveFormat.JPEG,
                    base64: true,
                }
            );

        if (!compressedImage.base64) {
            showMessage(
                "Image error",
                "Could not process the selected image."
            );
            return;
        }

        setProfilePic(
            `data:image/jpeg;base64,${compressedImage.base64}`
        );
    } catch (error) {
        console.error("Image selection error:", error);

        showMessage(
            "Error",
            "Unable to select your profile picture."
        );
    }
};

    const handleSave = async () => {
        if (!fullName.trim()) {
            showMessage(
                "Missing information",
                "Please enter your full name."
            );

            return;
        }

        setIsSaving(true);

        try {
            const profileData: {
                fullName: string;
                bio: string;
                city: string;
                country: string;
                nativeLanguages: string[];
                learningLanguages: string[];
                interests: string[];
                profilePic?: string;
            } = {
                fullName: fullName.trim(),
                bio: bio.trim(),
                city: city.trim(),
                country: country.trim(),

                nativeLanguages:
                    nativeLanguages
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),

                learningLanguages:
                    learningLanguages
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),

                interests:
                    interests
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),
            };

            // Only upload a picture if the user selected
            // a new base64 image during this session.
            if (profilePic?.startsWith("data:")) {
                profileData.profilePic = profilePic;
            }

            const updatedUser =
                await updateUserProfile(profileData);

            updateAuthUser(updatedUser);

            // Replace the temporary base64 preview with
            // the permanent Cloudinary URL.
            setProfilePic(updatedUser.profilePic);

            showMessage(
                "Profile updated",
                "Your profile has been saved successfully."
            );
        } catch (error: any) {
            console.error("Profile update failed.");

            console.error(
                "Error message:",
                error?.message
            );

            console.error(
                "HTTP status:",
                error?.response?.status
            );

            console.error(
                "Backend response:",
                error?.response?.data
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        await logout();
    };

    const renderField = (
        label: string,
        value: string,
        onChangeText: (text: string) => void,
        placeholder: string,
        multiline = false
    ) => (
        <View className="mb-5">
            <Text className="mb-2 text-sm font-semibold text-gray-700">
                {label}
            </Text>

            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                multiline={multiline}
                textAlignVertical={
                    multiline ? "top" : "center"
                }
                className={`rounded-xl border border-gray-200 bg-gray-50 px-4 text-gray-900 ${multiline
                        ? "min-h-28 py-3"
                        : "h-12"
                    }`}
            />
        </View>
    );

    if (!authUser) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator
                    size="large"
                    color="#0D9488"
                />

                <Text className="mt-3 text-gray-500">
                    Loading profile...
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <KeyboardAvoidingView
                className="flex-1"
                behavior={
                    Platform.OS === "ios"
                        ? "padding"
                        : undefined
                }
            >
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{
                        padding: 20,
                        paddingBottom: 40,
                    }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Text className="text-3xl font-bold text-gray-900">
                        My Profile
                    </Text>

                    <Text className="mt-2 text-gray-500">
                        Tell the SpeakAble community about yourself.
                    </Text>

                    {/* Profile picture */}

                    <View className="mb-8 mt-8 items-center">
                        <View className="relative">
                            {profilePic ? (
                                <Image
                                    source={{
                                        uri: profilePic,
                                    }}
                                    className="h-32 w-32 rounded-full bg-gray-200"
                                />
                            ) : (
                                <View className="h-32 w-32 items-center justify-center rounded-full bg-teal-100">
                                    <Text className="text-4xl font-bold text-teal-700">
                                        {fullName
                                            .charAt(0)
                                            .toUpperCase()}
                                    </Text>
                                </View>
                            )}

                            <Pressable
                                onPress={pickImage}
                                className="absolute bottom-0 right-0 h-10 w-10 items-center justify-center rounded-full border-4 border-gray-50 bg-teal-600"
                            >
                                <Text className="text-lg text-white">
                                    +
                                </Text>
                            </Pressable>
                        </View>

                        <Text className="mt-3 text-lg font-bold text-gray-900">
                            {fullName}
                        </Text>

                        <Text className="mt-1 text-sm text-gray-500">
                            {authUser.email}
                        </Text>
                    </View>

                    {/* Personal information */}

                    <View className="mb-6 rounded-2xl bg-white p-5">
                        <Text className="mb-5 text-lg font-bold text-gray-900">
                            Personal Information
                        </Text>

                        {renderField(
                            "Full name",
                            fullName,
                            setFullName,
                            "Your full name"
                        )}

                        {renderField(
                            "City",
                            city,
                            setCity,
                            "e.g. São Paulo"
                        )}

                        {renderField(
                            "Country",
                            country,
                            setCountry,
                            "e.g. Brazil"
                        )}

                        {renderField(
                            "About me",
                            bio,
                            setBio,
                            "Tell people about yourself...",
                            true
                        )}
                    </View>

                    {/* Languages */}

                    <View className="mb-6 rounded-2xl bg-white p-5">
                        <Text className="mb-5 text-lg font-bold text-gray-900">
                            Languages
                        </Text>

                        {renderField(
                            "Native languages",
                            nativeLanguages,
                            setNativeLanguages,
                            "Portuguese, English"
                        )}

                        {renderField(
                            "Learning languages",
                            learningLanguages,
                            setLearningLanguages,
                            "French, Spanish"
                        )}

                        <Text className="-mt-2 mb-2 text-xs text-gray-400">
                            Separate languages with commas.
                        </Text>
                    </View>

                    {/* Interests */}

                    <View className="mb-6 rounded-2xl bg-white p-5">
                        <Text className="mb-5 text-lg font-bold text-gray-900">
                            Interests
                        </Text>

                        {renderField(
                            "Your interests",
                            interests,
                            setInterests,
                            "Travel, music, movies, technology"
                        )}

                        <Text className="-mt-2 text-xs text-gray-400">
                            Separate interests with commas.
                        </Text>
                    </View>

                    {/* Save */}

                    <Pressable
                        onPress={handleSave}
                        disabled={isSaving}
                        className={`mb-4 h-14 items-center justify-center rounded-xl ${isSaving
                                ? "bg-teal-400"
                                : "bg-teal-600"
                            }`}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text className="text-base font-bold text-white">
                                Save Changes
                            </Text>
                        )}
                    </Pressable>

                    {/* Logout */}

                    <Pressable
                        onPress={handleLogout}
                        className="h-14 items-center justify-center rounded-xl border border-red-200 bg-white"
                    >
                        <Text className="font-semibold text-red-600">
                            Log Out
                        </Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}