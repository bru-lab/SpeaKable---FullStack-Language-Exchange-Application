import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

import { updateMyProfile } from "../../lib/profile.api";
import { useAuthStore } from "../../store/authStore";

const languages = [
    "Portuguese",
    "English",
    "French",
    "Spanish",
    "German",
    "Italian",
    "Irish",
    "Russian",
    "Swedish",
    "Japanese",
    "Chinese",
    "Korean",
];

export default function ProfileSetupScreen() {
    const router = useRouter();

    const { authUser } = useAuthStore();

    const [fullName, setFullName] = useState(
        authUser?.fullName || ""
    );

    const [bio, setBio] = useState("");

    const [nativeLanguages, setNativeLanguages] =
        useState<string[]>([]);

    const [learningLanguages, setLearningLanguages] =
        useState<string[]>([]);

    const [country, setCountry] = useState("");
    const [city, setCity] = useState("");
    const [interests, setInterests] = useState("");

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    const toggleLanguage = (
        language: string,
        type: "native" | "learning"
    ) => {
        if (type === "native") {
            setNativeLanguages((current) =>
                current.includes(language)
                    ? current.filter(
                          (item) => item !== language
                      )
                    : [...current, language]
            );
        } else {
            setLearningLanguages((current) =>
                current.includes(language)
                    ? current.filter(
                          (item) => item !== language
                      )
                    : [...current, language]
            );
        }
    };

    const handleSubmit = async () => {
        setError("");

        if (!fullName.trim()) {
            setError("Please enter your name.");
            return;
        }

        if (nativeLanguages.length === 0) {
            setError(
                "Please select at least one native language."
            );
            return;
        }

        if (learningLanguages.length === 0) {
            setError(
                "Please select at least one language you are learning."
            );
            return;
        }

        try {
            setIsSaving(true);

            const updatedUser =
                await updateMyProfile({
                    fullName: fullName.trim(),
                    bio: bio.trim(),
                    nativeLanguages,
                    learningLanguages,
                    country: country.trim(),
                    city: city.trim(),
                    interests: interests
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),
                });

            useAuthStore.setState({
                authUser:
                    updatedUser.user ||
                    updatedUser,
            });

            router.replace("/(app)");
        } catch (error: any) {
            console.log(
                "Profile setup error:",
                error.response?.data ||
                    error.message
            );

            setError(
                error.response?.data?.message ||
                    "Unable to save your profile."
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ScrollView
            className="flex-1 bg-white"
            contentContainerClassName="px-6 py-10"
        >
            <View className="mx-auto w-full max-w-xl">
                <Text className="mb-2 text-3xl font-bold text-gray-900">
                    Complete your profile
                </Text>

                <Text className="mb-8 text-base text-gray-500">
                    Tell us a little about yourself so we
                    can find the right language partners
                    for you.
                </Text>

                {/* Full name */}

                <Text className="mb-2 text-sm font-semibold text-gray-700">
                    Full name
                </Text>

                <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Your full name"
                    className="mb-6 rounded-xl border border-gray-300 px-4 py-3 text-base"
                />

                {/* Native languages */}

                <Text className="mb-2 text-sm font-semibold text-gray-700">
                    Native languages
                </Text>

                <Text className="mb-3 text-sm text-gray-500">
                    Select the languages you speak natively.
                </Text>

                <View className="mb-6 flex-row flex-wrap gap-2">
                    {languages.map((language) => {
                        const selected =
                            nativeLanguages.includes(
                                language
                            );

                        return (
                            <Pressable
                                key={language}
                                onPress={() =>
                                    toggleLanguage(
                                        language,
                                        "native"
                                    )
                                }
                                className={`rounded-full border px-4 py-2 ${
                                    selected
                                        ? "border-blue-600 bg-blue-600"
                                        : "border-gray-300 bg-white"
                                }`}
                            >
                                <Text
                                    className={
                                        selected
                                            ? "font-medium text-white"
                                            : "text-gray-700"
                                    }
                                >
                                    {language}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Learning languages */}

                <Text className="mb-2 text-sm font-semibold text-gray-700">
                    Languages you are learning
                </Text>

                <Text className="mb-3 text-sm text-gray-500">
                    Select the languages you want to practice.
                </Text>

                <View className="mb-6 flex-row flex-wrap gap-2">
                    {languages.map((language) => {
                        const selected =
                            learningLanguages.includes(
                                language
                            );

                        return (
                            <Pressable
                                key={language}
                                onPress={() =>
                                    toggleLanguage(
                                        language,
                                        "learning"
                                    )
                                }
                                className={`rounded-full border px-4 py-2 ${
                                    selected
                                        ? "border-green-600 bg-green-600"
                                        : "border-gray-300 bg-white"
                                }`}
                            >
                                <Text
                                    className={
                                        selected
                                            ? "font-medium text-white"
                                            : "text-gray-700"
                                    }
                                >
                                    {language}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Country */}

                <Text className="mb-2 text-sm font-semibold text-gray-700">
                    Country
                </Text>

                <TextInput
                    value={country}
                    onChangeText={setCountry}
                    placeholder="Brazil"
                    className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-base"
                />

                {/* City */}

                <Text className="mb-2 text-sm font-semibold text-gray-700">
                    City
                </Text>

                <TextInput
                    value={city}
                    onChangeText={setCity}
                    placeholder="Your city"
                    className="mb-6 rounded-xl border border-gray-300 px-4 py-3 text-base"
                />

                {/* Bio */}

                <Text className="mb-2 text-sm font-semibold text-gray-700">
                    About you
                </Text>

                <TextInput
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell language partners a little about yourself..."
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    className="mb-6 min-h-[120px] rounded-xl border border-gray-300 px-4 py-3 text-base"
                />

                {/* Interests */}

                <Text className="mb-2 text-sm font-semibold text-gray-700">
                    Interests
                </Text>

                <TextInput
                    value={interests}
                    onChangeText={setInterests}
                    placeholder="Music, movies, travel, football..."
                    className="mb-6 rounded-xl border border-gray-300 px-4 py-3 text-base"
                />

                {error ? (
                    <Text className="mb-4 text-center text-sm text-red-600">
                        {error}
                    </Text>
                ) : null}

                <Pressable
                    onPress={handleSubmit}
                    disabled={isSaving}
                    className="items-center rounded-xl bg-blue-600 py-4"
                >
                    {isSaving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-base font-bold text-white">
                            Save and continue
                        </Text>
                    )}
                </Pressable>
            </View>
        </ScrollView>
    );
}