import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Switch } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import { getSettings, saveSettings } from "@/lib/storage";
import { openai, gemini } from "@/lib/providers";
import type { Settings, ProviderConfig, ProviderId } from "@/lib/types";
import {
  DEFAULT_PROVIDERS, PROVIDER_LABELS, PROVIDER_KEY_FIELD, PROVIDER_KEY_PLACEHOLDER,
} from "@/lib/types";

const testableProviders: Record<string, { getBookFromISBN: (isbn: string) => Promise<any[]> }> = {
  openai,
  gemini,
};

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>({ openaiKey: "", geminiKey: "", providers: DEFAULT_PROVIDERS });
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, "idle" | "loading" | "success" | "error">>({});
  const [testMsg, setTestMsg] = useState<Record<string, string>>({});

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

  const toggleProvider = (id: string) => {
    const providers = settings.providers.map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    setSettings({ ...settings, providers });
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const testProvider = async (id: ProviderId) => {
    setTesting((prev) => ({ ...prev, [id]: "loading" }));
    setTestMsg((prev) => ({ ...prev, [id]: "" }));
    try {
      await saveSettings(settings);
      const provider = testableProviders[id];
      const results = await provider.getBookFromISBN("9780345391803");
      if (results.length > 0) {
        setTesting((prev) => ({ ...prev, [id]: "success" }));
        setTestMsg((prev) => ({ ...prev, [id]: `Found: ${results[0].title}` }));
      } else {
        setTesting((prev) => ({ ...prev, [id]: "error" }));
        setTestMsg((prev) => ({ ...prev, [id]: "No results — check your API key" }));
      }
    } catch (e: any) {
      setTesting((prev) => ({ ...prev, [id]: "error" }));
      setTestMsg((prev) => ({ ...prev, [id]: e.message || "Failed" }));
    }
  };

  const needsKey = (p: ProviderConfig) => {
    const keyField = PROVIDER_KEY_FIELD[p.id];
    return keyField ? !settings[keyField] : false;
  };

  const isEnabled = (p: ProviderConfig) =>
    needsKey(p) ? false : p.enabled;

  const renderItem = ({ item, drag, isActive }: RenderItemParams<ProviderConfig>) => {
    const enabled = isEnabled(item);
    const locked = needsKey(item);
    const keyField = PROVIDER_KEY_FIELD[item.id];
    const hasExpander = !!keyField;
    const isExpanded = !!expanded[item.id];
    const status = testing[item.id] || "idle";
    const msg = testMsg[item.id] || "";

    return (
      <ScaleDecorator>
        <View className={`bg-gray-50 rounded-lg mb-2 ${isActive ? "opacity-80" : ""}`}>
          <View className="flex-row items-center px-3 py-3">
            <Pressable onLongPress={drag} delayLongPress={150} className="mr-3 px-1">
              <Text className="text-gray-400 text-base leading-none">☰</Text>
            </Pressable>
            {hasExpander && (
              <Pressable onPress={() => toggleExpanded(item.id)} className="mr-2">
                <Text className="text-gray-400 text-sm">{isExpanded ? "▼" : "▶"}</Text>
              </Pressable>
            )}
            <View className={`flex-1 ${!enabled ? "opacity-50" : ""}`}>
              <Text className="text-base font-medium">{PROVIDER_LABELS[item.id]}</Text>
              {locked && !isExpanded && (
                <Text className="text-xs text-gray-400">Requires API key</Text>
              )}
            </View>
            <Switch
              value={enabled}
              onValueChange={() => {
                if (locked) return;
                toggleProvider(item.id);
              }}
              trackColor={{ false: "#e5e5e5", true: "#000" }}
              thumbColor="#fff"
              // @ts-ignore — web override, RNW ignores thumbColor
              activeThumbColor="#fff"
            />
          </View>

          {hasExpander && isExpanded && keyField && (
            <View className="px-4 pb-3">
              <TextInput
                className="bg-white rounded-lg px-4 py-3 text-base mb-3 border border-gray-200"
                placeholder={PROVIDER_KEY_PLACEHOLDER[keyField] || "API key..."}
                placeholderTextColor="#999"
                value={settings[keyField] as string}
                onChangeText={(t) => setSettings({ ...settings, [keyField]: t })}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={() => testProvider(item.id)}
                disabled={status === "loading" || !settings[keyField]}
                className={`border rounded-lg py-2 ${!settings[keyField] ? "border-gray-200" : "border-gray-300"}`}
              >
                {status === "loading" ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text className={`text-center text-sm font-medium ${!settings[keyField] ? "text-gray-300" : "text-black"}`}>
                    Test
                  </Text>
                )}
              </Pressable>
              {msg ? (
                <Text className={`text-xs text-center mt-2 ${status === "error" ? "text-red-500" : "text-green-600"}`}>
                  {msg}
                </Text>
              ) : null}
            </View>
          )}
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
          <View className="px-4 mt-4">
            <Pressable onPress={save} className="bg-black rounded-lg py-3 mb-10">
              <Text className="text-white text-center font-semibold text-base">
                {saved ? "Saved ✓" : "Save"}
              </Text>
            </Pressable>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </SafeAreaView>
  );
}
