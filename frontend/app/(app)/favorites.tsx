import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FavoritesScreen() {
    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 p-6">
                <Text className="text-2xl font-bold text-gray-900">
                    Favorites
                </Text>

                <Text className="mt-2 text-gray-500">
                    Your favorite language partners will appear here.
                </Text>
            </View>
        </SafeAreaView>
    );
}