import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Settings } from "../types";
import { DEFAULT_PROVIDERS } from "../types";

const SETTINGS_KEY = "liblib:settings";

export async function getSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  const defaults: Settings = { openaiKey: "", geminiKey: "", providers: DEFAULT_PROVIDERS };
  if (!raw) return defaults;
  const parsed = JSON.parse(raw);
  return { ...defaults, ...parsed, providers: parsed.providers ?? defaults.providers };
}

export async function saveSettings(settings: Settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
