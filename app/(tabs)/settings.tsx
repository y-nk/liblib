import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Switch } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import { getSettings, saveSettings } from "@/lib/storage";
import { openai } from "@/lib/providers";
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
      const results = await openai.getBookFromISBN("9780345391803");
      if (results.length > 0) {
        setTestStatus("success");
        setTestMessage(`Found: ${results[0].title}`);
      } else {
        setTestStatus("error");
        setTestMessage("No results — check your API key");
      }
    } catch (e: any) {
      setTestStatus("error");
      setTestMessage(e.message || "Connection failed");
    }
  };

  const toggleProvider = (id: string) => {
    const providers = settings.providers.map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    setSettings({ ...settings, providers });
  };

  const isEnabled = (p: ProviderConfig) =>
    p.id === "openai" && !settings.apiKey ? false : p.enabled;

  const renderItem = ({ item, drag, isActive }: RenderItemParams<ProviderConfig>) => {
    const enabled = isEnabled(item);
    return (
      <ScaleDecorator>
        <View
          className={`flex-row items-center bg-gray-50 rounded-lg px-3 py-3 mb-2 ${isActive ? "opacity-80" : ""}`}
        >
          <Pressable onLongPress={drag} className="mr-3 px-1">
            <Text className="text-gray-400 text-base leading-none">☰</Text>
          </Pressable>
          <View className={`flex-1 ${!enabled ? "opacity-50" : ""}`}>
            <Text className="text-base font-medium">{PROVIDER_LABELS[item.id]}</Text>
            {item.id === "openai" && !settings.apiKey && (
              <Text className="text-xs text-gray-400">Requires API key</Text>
            )}
          </View>
          <Switch
            value={enabled}
            onValueChange={() => {
              if (item.id === "openai" && !settings.apiKey) return;
              toggleProvider(item.id);
            }}
            trackColor={{ false: "#e5e5e5", true: "#000" }}
            thumbColor="#fff"
          />
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <DraggableFlatList
        data={settings.providers}
        keyExtractor={(item) => item.id}
        onDragEnd={({ data }) => setSettings({ ...settings, providers: data })}
        renderItem={renderItem}
        containerStyle={{ flex: 1 }}
        ListHeaderComponent={
          <View className="px-4 pt-2">
            <Text className="text-2xl font-bold mb-6">Settings</Text>
            <Text className="text-sm font-medium text-gray-500 mb-2 uppercase">Providers</Text>
          </View>
        }
        ListFooterComponent={
          <View className="px-4">
            <View className="mb-6" />

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
                Tests OpenAI with a known ISBN
              </Text>
            )}
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </SafeAreaView>
  );
}
