import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getSettings, saveSettings } from "@/lib/storage";
import type { Settings } from "@/lib/types";

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>({ aiProvider: "openai", apiKey: "" });
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getSettings().then(setSettings);
    }, [])
  );

  const save = async () => {
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 pt-2">
        <Text className="text-2xl font-bold mb-6">Settings</Text>

        <Text className="text-sm font-medium text-gray-500 mb-2 uppercase">AI Provider</Text>
        <View className="flex-row gap-2 mb-6">
          {(["openai", "anthropic"] as const).map((p) => (
            <Pressable
              key={p}
              onPress={() => setSettings({ ...settings, aiProvider: p })}
              className={`flex-1 py-3 rounded-lg border ${
                settings.aiProvider === p ? "bg-black border-black" : "bg-white border-gray-200"
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  settings.aiProvider === p ? "text-white" : "text-black"
                }`}
              >
                {p === "openai" ? "OpenAI" : "Anthropic"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text className="text-sm font-medium text-gray-500 mb-2 uppercase">API Key</Text>
        <TextInput
          className="bg-gray-100 rounded-lg px-4 py-3 text-base mb-6"
          placeholder={
            settings.aiProvider === "openai" ? "sk-..." : "sk-ant-..."
          }
          placeholderTextColor="#999"
          value={settings.apiKey}
          onChangeText={(t) => setSettings({ ...settings, apiKey: t })}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Pressable onPress={save} className="bg-black rounded-lg py-3">
          <Text className="text-white text-center font-semibold text-base">
            {saved ? "Saved ✓" : "Save"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
