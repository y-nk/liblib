import "../global.css";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="scan" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="settings" options={{ presentation: "formSheet" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
