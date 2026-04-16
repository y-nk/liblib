import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getSettings, saveSettings } from "@/lib/storage";
import { lookupISBN } from "@/lib/ai";
import type { Settings } from "@/lib/types";

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>({ apiKey: "" });
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

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

  const testConnection = async () => {
    setTestStatus("loading");
    setTestMessage("");
    try {
      await saveSettings(settings);
      const result = await lookupISBN("9780345391803");
      if (result) {
        setTestStatus("success");
        setTestMessage(`Found: ${result.title}`);
      } else {
        setTestStatus("error");
        setTestMessage("Connected but could not parse response");
      }
    } catch (e: any) {
      setTestStatus("error");
      setTestMessage(e.message || "Connection failed");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4 pt-2">
        <Text className="text-2xl font-bold mb-6">Settings</Text>

        <Text className="text-sm font-medium text-gray-500 mb-2 uppercase">OpenAI API Key</Text>
        <TextInput
          className="bg-gray-100 rounded-lg px-4 py-3 text-base mb-1"
          placeholder="sk-..."
          placeholderTextColor="#999"
          value={settings.apiKey}
          onChangeText={(t) => setSettings({ ...settings, apiKey: t })}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text className="text-xs text-gray-400 mb-6">Used as fallback when free lookups fail</Text>

        <Pressable onPress={save} className="bg-black rounded-lg py-3 mb-4">
          <Text className="text-white text-center font-semibold text-base">
            {saved ? "Saved ✓" : "Save"}
          </Text>
        </Pressable>

        <Pressable
          onPress={testConnection}
          disabled={testStatus === "loading"}
          className="border border-gray-300 rounded-lg py-3 mb-2"
        >
          {testStatus === "loading" ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text className="text-center font-medium text-base">Test Connection</Text>
          )}
        </Pressable>
        {testMessage ? (
          <Text className={`text-sm text-center mb-10 ${testStatus === "error" ? "text-red-500" : "text-green-600"}`}>
            {testMessage}
          </Text>
        ) : (
          <Text className="text-xs text-gray-400 text-center mb-10">
            Looks up a known ISBN to verify your config
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
