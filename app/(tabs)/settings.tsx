import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Switch } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getSettings, saveSettings } from "@/lib/storage";
import { lookupISBN } from "@/lib/ai";
import type { Settings, ProviderConfig } from "@/lib/types";
import { DEFAULT_PROVIDERS, PROVIDER_LABELS } from "@/lib/types";

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>({ apiKey: "", providers: DEFAULT_PROVIDERS });
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
      const results = await lookupISBN("9780345391803");
      if (results.length > 0) {
        setTestStatus("success");
        setTestMessage(`Found: ${results[0].title}`);
      } else {
        setTestStatus("error");
        setTestMessage("No results from any enabled provider");
      }
    } catch (e: any) {
      setTestStatus("error");
      setTestMessage(e.message || "Connection failed");
    }
  };

  const toggleProvider = (index: number) => {
    const providers = [...settings.providers];
    providers[index] = { ...providers[index], enabled: !providers[index].enabled };
    setSettings({ ...settings, providers });
  };

  const moveProvider = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= settings.providers.length) return;
    const providers = [...settings.providers];
    [providers[index], providers[target]] = [providers[target], providers[index]];
    setSettings({ ...settings, providers });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4 pt-2">
        <Text className="text-2xl font-bold mb-6">Settings</Text>

        <Text className="text-sm font-medium text-gray-500 mb-2 uppercase">
          Providers (searched in order)
        </Text>
        <View className="mb-6">
          {settings.providers.map((p, i) => (
            <View
              key={p.id}
              className="flex-row items-center bg-gray-50 rounded-lg px-3 py-3 mb-2"
            >
              <View className="mr-2">
                <Pressable
                  onPress={() => moveProvider(i, -1)}
                  disabled={i === 0}
                  className="px-1 py-0.5"
                >
                  <Text className={i === 0 ? "text-gray-300 text-base" : "text-gray-500 text-base"}>▲</Text>
                </Pressable>
                <Pressable
                  onPress={() => moveProvider(i, 1)}
                  disabled={i === settings.providers.length - 1}
                  className="px-1 py-0.5"
                >
                  <Text className={i === settings.providers.length - 1 ? "text-gray-300 text-base" : "text-gray-500 text-base"}>▼</Text>
                </Pressable>
              </View>
              <View className="flex-1">
                <Text className="text-base font-medium">{PROVIDER_LABELS[p.id]}</Text>
                {p.id === "openai" && !settings.apiKey && (
                  <Text className="text-xs text-gray-400">Requires API key</Text>
                )}
              </View>
              <Switch
                value={p.id === "openai" && !settings.apiKey ? false : p.enabled}
                onValueChange={() => {
                  if (p.id === "openai" && !settings.apiKey) return;
                  toggleProvider(i);
                }}
                trackColor={{ false: "#e5e5e5", true: "#000" }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

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
        <Text className="text-xs text-gray-400 mb-6">Required for OpenAI provider</Text>

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
            <Text className="text-center font-medium text-base">Test Lookup</Text>
          )}
        </Pressable>
        {testMessage ? (
          <Text className={`text-sm text-center mb-10 ${testStatus === "error" ? "text-red-500" : "text-green-600"}`}>
            {testMessage}
          </Text>
        ) : (
          <Text className="text-xs text-gray-400 text-center mb-10">
            Looks up a known ISBN using your enabled providers
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
