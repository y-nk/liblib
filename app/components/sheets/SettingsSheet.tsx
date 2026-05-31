import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Switch,
  useColorScheme,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TouchableOpacity } from 'react-native-gesture-handler'
import BottomDrawer from './BottomDrawer'
import EnableSyncSheet from './EnableSyncSheet'
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist'
import { GripVertical, ChevronDown, ChevronRight, TriangleAlert } from 'lucide-react-native'
import { getSettings, saveSettings } from '@/lib/data/settings'
import { getLogs, clearLogs } from '@/lib/log'
import * as Clipboard from 'expo-clipboard'
import { providers, AiProvider } from '@/lib/providers'
import type { Settings, ProviderConfig, ProviderId } from '@/lib/types'
import { DEFAULT_PROVIDERS } from '@/lib/types'
import {
  clearAll as clearCloudState,
  getAccountEmail,
  getLastSyncAt,
  getProvider,
  subscribeCloudState,
  type CloudProvider,
} from '@/lib/cloud/state'
import { runConfiguredSync } from '@/lib/cloud/syncRunner'
import { revokeGoogleAccess } from '@/lib/cloud/googleSync'
import { showSnackbar } from '@/lib/snackbar'

function findProvider(id: string) {
  return providers[id]
}

function findAiProvider(id: string) {
  const p = findProvider(id)

  return p instanceof AiProvider ? p : null
}

export default function SettingsSheet({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) {
  const [settings, setSettings] = useState<Settings>({
    openaiKey: '',
    geminiKey: '',
    providers: DEFAULT_PROVIDERS,
  })
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [testing, setTesting] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>(
    {},
  )
  const [testMsg, setTestMsg] = useState<Record<string, string>>({})
  const [cloudProvider, setCloudProvider] = useState<CloudProvider | undefined>(undefined)
  const [cloudEmail, setCloudEmail] = useState<string | undefined>(undefined)
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>(undefined)
  const [syncRunning, setSyncRunning] = useState(false)
  const [showEnableSheet, setShowEnableSheet] = useState(false)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const dark = useColorScheme() === 'dark'
  const { bottom } = useSafeAreaInsets()

  const refreshCloud = async () => {
    const [p, email, last] = await Promise.all([getProvider(), getAccountEmail(), getLastSyncAt()])
    setCloudProvider(p)
    setCloudEmail(email)
    setLastSyncAt(last)
  }

  useEffect(() => {
    if (visible) {
      getSettings().then(setSettings)
      refreshCloud()
    }
  }, [visible])

  useEffect(() => {
    return subscribeCloudState(() => {
      refreshCloud()
    })
  }, [])

  const handleSyncNow = async () => {
    if (syncRunning) {
      return
    }

    setSyncRunning(true)

    try {
      await runConfiguredSync()
      showSnackbar('Sync complete')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      showSnackbar(`Sync failed: ${msg}`, 'error')
    } finally {
      setSyncRunning(false)
    }
  }

  const handleDisableSync = async () => {
    // Revoke the Drive scope before wiping local state, but only for Google
    // — for `'fake'` (and future `'apple'`) there's nothing to revoke.
    // `revokeGoogleAccess()` is best-effort and swallows its own errors,
    // so a flaky network never blocks disabling sync locally.
    if (cloudProvider === 'google') {
      await revokeGoogleAccess()
    }

    await clearCloudState()
    showSnackbar('Sync disabled')
  }

  const update = (next: Settings) => {
    setSettings(next)
    saveSettings(next)
  }

  const save = () => saveSettings(settingsRef.current)

  const toggleProvider = (id: string) => {
    const s = settingsRef.current
    const provs = s.providers.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    update({ ...s, providers: provs })
  }

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const testProvider = async (id: ProviderId) => {
    setTesting((prev) => ({ ...prev, [id]: 'loading' }))
    setTestMsg((prev) => ({ ...prev, [id]: '' }))

    try {
      await saveSettings(settingsRef.current)
      const provider = findProvider(id)

      if (!provider) {
        return
      }

      const results = await provider.getBookFromISBN('9780345391803')

      if (results.length > 0) {
        setTesting((prev) => ({ ...prev, [id]: 'success' }))
        setTestMsg((prev) => ({ ...prev, [id]: `Found: ${results[0].title}` }))
      } else {
        setTesting((prev) => ({ ...prev, [id]: 'error' }))
        setTestMsg((prev) => ({ ...prev, [id]: 'No results — check your API key' }))
      }
    } catch (e: any) {
      setTesting((prev) => ({ ...prev, [id]: 'error' }))
      setTestMsg((prev) => ({ ...prev, [id]: e.message || 'Failed' }))
    }
  }

  const needsKey = (p: ProviderConfig) => {
    const ai = findAiProvider(p.id)

    return ai ? !settings[ai.keyField] : false
  }

  const renderItem = ({ item, drag, isActive }: RenderItemParams<ProviderConfig>) => {
    const ai = findAiProvider(item.id)
    const hasExpander = !!ai
    const isExpanded_ = !!expanded[item.id]
    const missingKey = needsKey(item)
    const status = testing[item.id] || 'idle'
    const msg = testMsg[item.id] || ''
    const iconColor = dark ? '#666' : '#9ca3af'

    return (
      <ScaleDecorator>
        <View
          className={`bg-gray-100 dark:bg-neutral-800 rounded-lg mb-2 ${isActive ? 'opacity-80' : ''}`}
        >
          <View className="flex-row items-center px-3 py-3">
            <TouchableOpacity
              onLongPress={drag}
              delayLongPress={100}
              style={{ marginRight: 8, padding: 8 }}
            >
              <GripVertical size={18} color={iconColor} />
            </TouchableOpacity>
            <Pressable
              onPress={hasExpander ? () => toggleExpanded(item.id) : undefined}
              className="flex-1 flex-row items-center"
            >
              {hasExpander && (
                <View className="mr-2">
                  {isExpanded_ ? (
                    <ChevronDown size={16} color={iconColor} />
                  ) : (
                    <ChevronRight size={16} color={iconColor} />
                  )}
                </View>
              )}
              <Text
                className={`text-base font-medium dark:text-white ${!item.enabled ? 'opacity-50' : ''}`}
              >
                {findProvider(item.id)?.name ?? item.id}
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
              trackColor={{ false: dark ? '#333' : '#e5e5e5', true: dark ? '#fff' : '#000' }}
              thumbColor={dark ? '#000' : '#fff'}
              // @ts-ignore — web override
              activeThumbColor={dark ? '#000' : '#fff'}
            />
          </View>

          {hasExpander && isExpanded_ && ai && (
            <View className="pb-3 pl-12 pr-3">
              <Text className="text-xs font-medium text-gray-500 mb-1 uppercase">API Key</Text>
              <TextInput
                className="bg-white dark:bg-neutral-700 rounded-lg px-4 py-3 text-base dark:text-white mb-3 border border-gray-200 dark:border-neutral-600"
                placeholder={ai.keyPlaceholder}
                placeholderTextColor={dark ? '#666' : '#999'}
                value={settings[ai.keyField] as string}
                onChangeText={(t) => setSettings({ ...settings, [ai.keyField]: t })}
                onBlur={save}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={() => testProvider(item.id)}
                disabled={status === 'loading' || !settings[ai.keyField]}
                className={`border rounded-lg py-2 ${!settings[ai.keyField] ? 'border-gray-200 dark:border-neutral-700' : 'border-gray-300 dark:border-neutral-500'}`}
              >
                {status === 'loading' ? (
                  <ActivityIndicator color={dark ? '#fff' : '#000'} size="small" />
                ) : (
                  <Text
                    className={`text-center text-sm font-medium ${!settings[ai.keyField] ? 'text-gray-300 dark:text-neutral-600' : 'text-black dark:text-white'}`}
                  >
                    Test
                  </Text>
                )}
              </Pressable>
              {msg ? (
                <Text
                  className={`text-xs text-center mt-2 ${status === 'error' ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}
                >
                  {msg}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </ScaleDecorator>
    )
  }

  return (
    <>
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottom + 16 }}
          ListFooterComponent={
            <View className="mt-6">
              <Text className="text-sm font-medium text-gray-500 mb-3 uppercase">Sync</Text>

              {cloudProvider === undefined ? (
                <Pressable
                  onPress={() => setShowEnableSheet(true)}
                  className="bg-gray-100 dark:bg-neutral-800 rounded-lg py-3 px-4 mb-4"
                >
                  <Text className="text-base text-center dark:text-white">Enable sync</Text>
                </Pressable>
              ) : (
                <View className="bg-gray-100 dark:bg-neutral-800 rounded-lg p-4 mb-4">
                  <Text className="text-base font-medium dark:text-white">
                    {providerLabel(cloudProvider)}
                  </Text>
                  {cloudEmail ? (
                    <Text className="text-sm text-gray-400 mt-0.5">{cloudEmail}</Text>
                  ) : null}
                  <Text className="text-xs text-gray-400 mt-1">
                    {lastSyncAt ? `Last synced: ${formatRelative(lastSyncAt)}` : 'Not synced yet'}
                  </Text>

                  <Pressable
                    onPress={handleSyncNow}
                    disabled={syncRunning}
                    className="mt-3 py-2 border-t border-gray-200 dark:border-neutral-700"
                  >
                    {syncRunning ? (
                      <ActivityIndicator color={dark ? '#fff' : '#000'} size="small" />
                    ) : (
                      <Text className="text-sm dark:text-white">Sync now</Text>
                    )}
                  </Pressable>

                  <Pressable onPress={handleDisableSync} className="mt-1 py-2">
                    <Text className="text-sm text-red-500">Disable sync</Text>
                  </Pressable>
                </View>
              )}

              <View className="flex-row justify-center gap-4 mb-3">
                <Pressable
                  onPress={async () => {
                    const logs = await getLogs()
                    await Clipboard.setStringAsync(logs || '(empty)')
                  }}
                >
                  <Text className="text-xs text-blue-500">Copy logs</Text>
                </Pressable>

                <Pressable onPress={clearLogs}>
                  <Text className="text-xs text-red-400">Clear logs</Text>
                </Pressable>
              </View>

              <Text className="text-xs text-gray-400 text-center">
                Version: {process.env.EXPO_PUBLIC_COMMIT_SHA?.slice(0, 7) || 'dev'}
              </Text>
            </View>
          }
        />
      </BottomDrawer>
      <EnableSyncSheet visible={showEnableSheet} onClose={() => setShowEnableSheet(false)} />
    </>
  )
}

function providerLabel(p: CloudProvider): string {
  if (p === 'google') {
    return 'Google Drive'
  }

  if (p === 'apple') {
    return 'iCloud'
  }

  return 'Fake (dev)'
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()

  if (Number.isNaN(then)) {
    return iso
  }

  const diffMs = Date.now() - then
  const diffSec = Math.max(0, Math.round(diffMs / 1000))

  if (diffSec < 60) {
    return 'just now'
  }

  const diffMin = Math.round(diffSec / 60)

  if (diffMin < 60) {
    return `${diffMin} min ago`
  }

  const diffHr = Math.round(diffMin / 60)

  if (diffHr < 24) {
    return `${diffHr} h ago`
  }

  const diffDay = Math.round(diffHr / 24)

  return `${diffDay} d ago`
}
