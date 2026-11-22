import "../global.css";

import {
    Stack,
    useRouter,
    useSegments,
} from "expo-router";

import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    View,
} from "react-native";

import { useAuthStore } from "../store/authStore";
import { getMyProfile } from "../lib/profile.api";

export default function RootLayout() {
    const router = useRouter();
    const segments = useSegments();

    const {
        authUser,
        isCheckingAuth,
        checkAuth,
    } = useAuthStore();

    const [checkingProfile, setCheckingProfile] =
        useState(false);

    const [profileComplete, setProfileComplete] =
        useState<boolean | null>(null);

    // 1. Check authentication when the app starts.
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // 2. Check the profile when authentication changes.
    // Do not repeat this request on every tab navigation.
    useEffect(() => {
        if (isCheckingAuth) {
            return;
        }

        if (!authUser) {
            setProfileComplete(null);
            setCheckingProfile(false);
            return;
        }

        let cancelled = false;

        const checkProfile = async () => {
            setCheckingProfile(true);
            setProfileComplete(null);

            try {
                const profile = await getMyProfile();

                if (cancelled) {
                    return;
                }

                const nativeLanguages =
                    profile.nativeLanguages || [];

                const learningLanguages =
                    profile.learningLanguages || [];

                const complete =
                    nativeLanguages.length > 0 &&
                    learningLanguages.length > 0;

                setProfileComplete(complete);
            } catch (error: any) {
                if (!cancelled) {
                    console.log(
                        "Error checking profile:",
                        error.response?.data ||
                            error.message
                    );
                }
            } finally {
                if (!cancelled) {
                    setCheckingProfile(false);
                }
            }
        };

        checkProfile();

        return () => {
            cancelled = true;
        };
    }, [
        authUser?._id,
        isCheckingAuth,
        authUser,
    ]);

    // 3. Handle profile-related redirects separately.
    // Route changes no longer trigger another profile request.
    useEffect(() => {
        if (
            isCheckingAuth ||
            checkingProfile ||
            !authUser ||
            profileComplete === null
        ) {
            return;
        }

        const inAuthGroup =
            segments[0] === "(auth)";

        if (!profileComplete) {
            if (segments[1] !== "profile-setup") {
                router.replace(
                    "/(auth)/profile-setup"
                );
            }

            return;
        }

        if (inAuthGroup) {
            router.replace("/(app)");
        }
    }, [
        authUser,
        isCheckingAuth,
        checkingProfile,
        profileComplete,
        segments,
        router,
    ]);

    // 4. Redirect unauthenticated users to login.
    useEffect(() => {
        if (isCheckingAuth || authUser) {
            return;
        }

        const inAuthGroup =
            segments[0] === "(auth)";

        if (!inAuthGroup) {
            router.replace("/(auth)/login");
        }
    }, [
        authUser,
        isCheckingAuth,
        segments,
        router,
    ]);

    // 5. Show the loading indicator only during
    // authentication and profile checks.
    if (isCheckingAuth || checkingProfile) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        />
    );
}