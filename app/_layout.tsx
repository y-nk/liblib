import "../global.css";
import { useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { NavigationBar } from "@zoontek/react-native-navigation-bar";

export default function RootLayout() {
  const dark = useColorScheme() === "dark";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <NavigationBar barStyle={dark ? "light-content" : "dark-content"} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="scan" options={{ presentation: "fullScreenModal" }} />
        </Stack>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
