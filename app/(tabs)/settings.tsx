import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Switch } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import { getSettings, saveSettings } from "@/lib/storage";
import type { Settings, ProviderConfig } from "@/lib/types";
import { DEFAULT_PROVIDERS, PROVIDER_LABELS, PROVIDER_KEY_FIELD } from "@/lib/types";

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>({ openaiKey: "", geminiKey: "", providers: DEFAULT_PROVIDERS });
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

  const toggleProvider = (id: string) => {
    const providers = settings.providers.map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    setSettings({ ...settings, providers });
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
    return (
      <ScaleDecorator>
        <View
          className={`flex-row items-center bg-gray-50 rounded-lg px-3 py-3 mb-2 ${isActive ? "opacity-80" : ""}`}
        >
          <Pressable onLongPress={drag} delayLongPress={150} className="mr-3 px-1">
            <Text className="text-gray-400 text-base leading-none">☰</Text>
          </Pressable>
          <View className={`flex-1 ${!enabled ? "opacity-50" : ""}`}>
            <Text className="text-base font-medium">{PROVIDER_LABELS[item.id]}</Text>
            {locked && (
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

            <Text className="text-sm font-medium text-gray-500 mb-2 uppercase">API Keys</Text>

            <Text className="text-sm text-gray-600 mb-1">OpenAI</Text>
            <TextInput
              className="bg-gray-100 rounded-lg px-4 py-3 text-base mb-4"
              placeholder="sk-..."
              placeholderTextColor="#999"
              value={settings.openaiKey}
              onChangeText={(t) => setSettings({ ...settings, openaiKey: t })}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text className="text-sm text-gray-600 mb-1">Gemini</Text>
            <TextInput
              className="bg-gray-100 rounded-lg px-4 py-3 text-base mb-6"
              placeholder="AIza..."
              placeholderTextColor="#999"
              value={settings.geminiKey}
              onChangeText={(t) => setSettings({ ...settings, geminiKey: t })}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

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
