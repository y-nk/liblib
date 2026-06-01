import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import BottomDrawer from './BottomDrawer'
import { useEnableSync } from '@/lib/cloud/SyncProvider'

/**
 * Provider chooser. iOS shows Drive + iCloud + Sign in with Apple; Android
 * shows Drive only. The actual enable flow (sign-in, persisting the provider,
 * and the first sync) lives in `SyncProvider`; this sheet is presentation
 * only and closes itself once a provider was enabled.
 *
 * Sign in with Apple is rendered on iOS solely to satisfy App Store
 * guideline 4.8 for apps offering Google sign-in; it does NOT select a
 * sync provider in this MVP and may be removed if the App Store review
 * determines it doesn't apply.
 */
export default function EnableSyncSheet({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) {
  const { bottom } = useSafeAreaInsets()
  const { signingIn, enableGoogleDrive, enableICloud } = useEnableSync()

  const onGoogle = async () => {
    if (await enableGoogleDrive()) {
      onClose()
    }
  }

  const onICloud = async () => {
    if (await enableICloud()) {
      onClose()
    }
  }

  return (
    <BottomDrawer visible={visible} onClose={onClose}>
      <View className="px-4 pt-2" style={{ paddingBottom: bottom + 16 }}>
        <Text className="text-2xl font-bold mb-2 dark:text-white">Enable sync</Text>
        <Text className="text-sm text-gray-500 dark:text-neutral-400 mb-6">
          Pick where your library should be backed up. You can change this later.
        </Text>

        <View className="gap-2">
          <Pressable
            onPress={onGoogle}
            disabled={signingIn}
            className="bg-gray-100 dark:bg-neutral-800 rounded-lg py-3 px-4"
          >
            {signingIn ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text className="text-base text-center dark:text-white">Sync with Google Drive</Text>
            )}
          </Pressable>

          {Platform.OS === 'ios' && (
            <Pressable
              onPress={onICloud}
              disabled={signingIn}
              className="bg-gray-100 dark:bg-neutral-800 rounded-lg py-3 px-4"
            >
              {signingIn ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text className="text-base text-center dark:text-white">Sync with iCloud</Text>
              )}
            </Pressable>
          )}
        </View>

        {Platform.OS === 'ios' && (
          <View className="mt-6">
            <Text className="text-xs text-gray-500 dark:text-neutral-400 mb-2 uppercase">
              Identity
            </Text>
            <Pressable
              onPress={onClose}
              className="bg-black dark:bg-white rounded-lg py-3 px-4"
              accessibilityLabel="Sign in with Apple"
            >
              <Text className="text-base text-center text-white dark:text-black">
                Sign in with Apple
              </Text>
            </Pressable>
            <Text className="text-[11px] text-gray-400 dark:text-neutral-500 mt-2 text-center">
              Identity only — does not change your sync provider.
            </Text>
          </View>
        )}
      </View>
    </BottomDrawer>
  )
}
