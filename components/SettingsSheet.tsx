import { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, Pressable, ActivityIndicator, Switch, useColorScheme,
} from "react-native";
import BottomDrawer from "./BottomDrawer";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import { GripVertical, ChevronDown, ChevronRight, TriangleAlert } from "lucide-react-native";
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

export default function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [settings, setSettings] = useState<Settings>({ openaiKey: "", geminiKey: "", providers: DEFAULT_PROVIDERS });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, "idle" | "loading" | "success" | "error">>({});
  const [testMsg, setTestMsg] = useState<Record<string, string>>({});
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const dark = useColorScheme() === "dark";

  useEffect(() => {
    if (visible) getSettings().then(setSettings);
  }, [visible]);

  const update = (next: Settings) => {
    setSettings(next);
    saveSettings(next);
  };

  const save = () => saveSettings(settingsRef.current);

  const toggleProvider = (id: string) => {
    const s = settingsRef.current;
    const providers = s.providers.map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    update({ ...s, providers });
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const testProvider = async (id: ProviderId) => {
    setTesting((prev) => ({ ...prev, [id]: "loading" }));
    setTestMsg((prev) => ({ ...prev, [id]: "" }));
    try {
      await saveSettings(settingsRef.current);
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

  const renderItem = ({ item, drag, isActive }: RenderItemParams<ProviderConfig>) => {
    const keyField = PROVIDER_KEY_FIELD[item.id];
    const hasExpander = !!keyField;
    const isExpanded_ = !!expanded[item.id];
    const missingKey = needsKey(item);
    const status = testing[item.id] || "idle";
    const msg = testMsg[item.id] || "";
    const iconColor = dark ? "#666" : "#9ca3af";

    return (
      <ScaleDecorator>
        <View className={`bg-gray-100 dark:bg-neutral-800 rounded-lg mb-2 ${isActive ? "opacity-80" : ""}`}>
          <View className="flex-row items-center px-3 py-3">
            <Pressable onLongPress={drag} delayLongPress={100} className="mr-2 p-2">
              <GripVertical size={18} color={iconColor} />
            </Pressable>
            <Pressable
              onPress={hasExpander ? () => toggleExpanded(item.id) : undefined}
              className="flex-1 flex-row items-center"
            >
              {hasExpander && (
                <View className="mr-2">
                  {isExpanded_
                    ? <ChevronDown size={16} color={iconColor} />
                    : <ChevronRight size={16} color={iconColor} />
                  }
                </View>
              )}
              <Text className={`text-base font-medium dark:text-white ${!item.enabled ? "opacity-50" : ""}`}>
                {PROVIDER_LABELS[item.id]}
              </Text>
              {item.enabled && missingKey && (
                <View className="ml-2">
                  <TriangleAlert size={14} color="#f59e0b" />
                </View>
              )}
            </Pressable>
            <Switch
              value={item.enabled}
              onValueChange={() => toggleProvider(item.id)}
              trackColor={{ false: dark ? "#333" : "#e5e5e5", true: dark ? "#fff" : "#000" }}
              thumbColor={dark ? "#000" : "#fff"}
              // @ts-ignore — web override
              activeThumbColor={dark ? "#000" : "#fff"}
            />
          </View>

          {hasExpander && isExpanded_ && keyField && (
            <View className="pb-3 pl-12 pr-3">
              <Text className="text-xs font-medium text-gray-500 mb-1 uppercase">API Key</Text>
              <TextInput
                className="bg-white dark:bg-neutral-700 rounded-lg px-4 py-3 text-base dark:text-white mb-3 border border-gray-200 dark:border-neutral-600"
                placeholder={PROVIDER_KEY_PLACEHOLDER[keyField] || "API key..."}
                placeholderTextColor={dark ? "#666" : "#999"}
                value={settings[keyField] as string}
                onChangeText={(t) => setSettings({ ...settings, [keyField]: t })}
                onBlur={save}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={() => testProvider(item.id)}
                disabled={status === "loading" || !settings[keyField]}
                className={`border rounded-lg py-2 ${!settings[keyField] ? "border-gray-200 dark:border-neutral-700" : "border-gray-300 dark:border-neutral-500"}`}
              >
                {status === "loading" ? (
                  <ActivityIndicator color={dark ? "#fff" : "#000"} size="small" />
                ) : (
                  <Text className={`text-center text-sm font-medium ${!settings[keyField] ? "text-gray-300 dark:text-neutral-600" : "text-black dark:text-white"}`}>
                    Test
                  </Text>
                )}
              </Pressable>
              {msg ? (
                <Text className={`text-xs text-center mt-2 ${status === "error" ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
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
    <BottomDrawer visible={visible} onClose={onClose}>
      <DraggableFlatList
            data={settings.providers}
            keyExtractor={(item) => item.id}
            onDragEnd={({ data }) => update({ ...settingsRef.current, providers: data })}
            renderItem={renderItem}
            containerStyle={{ flexGrow: 0 }}
            ListHeaderComponent={
              <View className="px-4 pt-2">
                <Text className="text-2xl font-bold mb-6 dark:text-white">Settings</Text>
                <Text className="text-sm font-medium text-gray-500 mb-2 uppercase">Providers</Text>
              </View>
            }
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            ListFooterComponent={
              <View className="mt-6">
                <Text className="text-xs text-gray-400 text-center">
                  Version: {process.env.EXPO_PUBLIC_COMMIT_SHA?.slice(0, 7) || "dev"}
                </Text>
              </View>
            }
          />
    </BottomDrawer>
  );
}
