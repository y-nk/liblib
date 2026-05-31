import { useState } from 'react'
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import BottomDrawer from './BottomDrawer'
import { ICloudNotAvailableError } from '@y_nk/react-native-cloud-sync'
import { signInWithGoogleDrive } from '@/lib/cloud/googleSync'
import { enableICloudSync } from '@/lib/cloud/icloudSync'
import { showSnackbar } from '@/lib/snackbar'

/**
 * Provider chooser. iOS shows Drive + iCloud + Sign in with Apple; Android
 * shows Drive only. Drive runs the Google sign-in flow (with the
 * `drive.appdata` scope) and persists `cloud.provider = 'google'`; iCloud
 * pre-flights `ubiquityIdentityToken` via the LiblibICloud native module
 * and persists `cloud.provider = 'apple'` on success.
 *
 * Sign in with Apple is rendered on iOS solely to satisfy App Store
 * guideline 4.8 for apps offering Google sign-in; it does NOT select a
 * sync provider in this MVP and may be removed if the App Store review
 * determines it doesn't apply.
 */
export default function EnableSyncSheet({
  visible,
  onClose,
  onEnabled,
}: {
  visible: boolean
  onClose: () => void
  onEnabled?: () => void
}) {
  const { bottom } = useSafeAreaInsets()
  const [signingIn, setSigningIn] = useState(false)

  const enableGoogleDrive = async () => {
    if (signingIn) {
      return
    }

    setSigningIn(true)

    try {
      const result = await signInWithGoogleDrive()

      if (!result) {
        // User cancelled the consent screen — leave provider unset.
        return
      }

      onEnabled?.()
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      showSnackbar(`Sign-in failed: ${msg}`, 'error')
    } finally {
      setSigningIn(false)
    }
  }

  const enableICloud = async () => {
    if (signingIn) {
      return
    }

    setSigningIn(true)

    try {
      await enableICloudSync()
      onEnabled?.()
      onClose()
    } catch (e) {
      if (e instanceof ICloudNotAvailableError) {
        showSnackbar('iCloud not available — sign into iCloud in iOS Settings', 'error')
      } else {
        const msg = e instanceof Error ? e.message : String(e)
        showSnackbar(`iCloud sync failed: ${msg}`, 'error')
      }
    } finally {
      setSigningIn(false)
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
            onPress={enableGoogleDrive}
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
              onPress={enableICloud}
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
