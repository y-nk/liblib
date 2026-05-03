import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Settings, ProviderConfig } from '../types'
import { DEFAULT_PROVIDERS } from '../types'
import { settingsSchema, providerConfigSchema } from '../schemas'
import { z } from 'zod'

const SETTINGS_KEY = 'liblib:settings'

function mergeProviders(saved: ProviderConfig[]): ProviderConfig[] {
  const savedIds = new Set(saved.map((p) => p.id))
  const missing = DEFAULT_PROVIDERS.filter((p) => !savedIds.has(p.id))

  return [...saved, ...missing]
}

export async function getSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY)
  const defaults: Settings = { openaiKey: '', geminiKey: '', providers: DEFAULT_PROVIDERS }

  if (!raw) {
    return defaults
  }

  const parsed = JSON.parse(raw)

  const partialResult = settingsSchema
    .extend({ providers: z.array(providerConfigSchema).optional() })
    .safeParse(parsed)

  if (!partialResult.success) {
    return defaults
  }

  const providers = partialResult.data.providers
    ? mergeProviders(partialResult.data.providers)
    : defaults.providers

  return {
    openaiKey: partialResult.data.openaiKey,
    geminiKey: partialResult.data.geminiKey,
    providers,
  }
}

export async function saveSettings(settings: Settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
