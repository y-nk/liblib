import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Settings, ProviderConfig } from '../types'
import { DEFAULT_PROVIDERS } from '../types'

/** Adds any providers introduced since the user's settings were last saved. */
function mergeProviders(saved: ProviderConfig[]): ProviderConfig[] {
  const savedIds = new Set(saved.map((p) => p.id))
  const missing = DEFAULT_PROVIDERS.filter((p) => !savedIds.has(p.id))

  return [...saved, ...missing]
}

type SettingsActions = {
  save: (settings: Settings) => void
}

const INITIAL: Settings = { openaiKey: '', geminiKey: '', providers: DEFAULT_PROVIDERS }

/**
 * App settings (provider API keys + the ISBN-provider list), persisted on
 * AsyncStorage via zustand. The async wrappers below preserve the original
 * facade for non-React callers (the providers) and await rehydration so a
 * value is never read before the persisted state has loaded.
 */
export const useSettingsStore = create<Settings & SettingsActions>()(
  persist(
    (set) => ({
      ...INITIAL,
      save: (settings) => set({ ...settings }),
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Backfill providers added since the persisted snapshot was written.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Settings>

        return {
          ...current,
          ...p,
          providers: mergeProviders(p.providers ?? current.providers),
        }
      },
    },
  ),
)

function whenHydrated(): Promise<void> {
  if (useSettingsStore.persist.hasHydrated()) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const unsub = useSettingsStore.persist.onFinishHydration(() => {
      unsub()
      resolve()
    })
  })
}

export async function getSettings(): Promise<Settings> {
  await whenHydrated()
  const { openaiKey, geminiKey, providers } = useSettingsStore.getState()

  return { openaiKey, geminiKey, providers }
}

export async function saveSettings(settings: Settings) {
  await whenHydrated()
  useSettingsStore.getState().save(settings)
}
