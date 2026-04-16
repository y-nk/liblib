import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getSettings, saveSettings } from "@/lib/storage";
import { lookupISBN } from "@/lib/ai";
import type { Settings } from "@/lib/types";

const DEFAULTS = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  anthropic: { baseUrl: "https://api.anthropic.com", model: "claude-sonnet-4-20250514" },
};

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>({ aiProvider: "openai", apiKey: "", baseUrl: "", model: "" });
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
      // ISBN for "The Hitchhiker's Guide to the Galaxy"
      const result = await lookupISBN("9780345391803", settings);
      if (result?.title) {
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

  const defaults = DEFAULTS[settings.aiProvider];
  const set = (patch: Partial<Settings>) => setSettings({ ...settings, ...patch });

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4 pt-2">
        <Text className="text-2xl font-bold mb-6">Settings</Text>

        <Text className="text-sm font-medium text-gray-500 mb-2 uppercase">AI Provider</Text>
        <View className="flex-row gap-2 mb-6">
          {(["openai", "anthropic"] as const).map((p) => (
            <Pressable
              key={p}
              onPress={() => set({ aiProvider: p })}
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
          placeholder={settings.aiProvider === "openai" ? "sk-..." : "sk-ant-..."}
          placeholderTextColor="#999"
          value={settings.apiKey}
          onChangeText={(t) => set({ apiKey: t })}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text className="text-sm font-medium text-gray-500 mb-2 uppercase">Base URL (optional)</Text>
        <TextInput
          className="bg-gray-100 rounded-lg px-4 py-3 text-base mb-1"
          placeholder={defaults.baseUrl}
          placeholderTextColor="#999"
          value={settings.baseUrl}
          onChangeText={(t) => set({ baseUrl: t })}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text className="text-xs text-gray-400 mb-6">For LiteLLM, Ollama, or other proxies</Text>

        <Text className="text-sm font-medium text-gray-500 mb-2 uppercase">Model (optional)</Text>
        <TextInput
          className="bg-gray-100 rounded-lg px-4 py-3 text-base mb-1"
          placeholder={defaults.model}
          placeholderTextColor="#999"
          value={settings.model}
          onChangeText={(t) => set({ model: t })}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text className="text-xs text-gray-400 mb-6">Leave empty for default</Text>

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
