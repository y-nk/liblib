import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, Easing, Pressable, View, useColorScheme } from 'react-native'
import { RefreshCw } from 'lucide-react-native'
import {
  getAutoLocked,
  getProvider,
  setAutoLocked,
  subscribeCloudState,
  type CloudProvider,
} from '@/lib/cloud/state'
import { runConfiguredSync } from '@/lib/cloud/syncRunner'
import { subscribeAutoSyncStatus } from '@/lib/cloud/autoSync'
import { showSnackbar } from '@/lib/snackbar'

type Status = 'idle' | 'syncing' | 'error'

/**
 * Header sync affordance. Three visual states:
 *   - idle: outline icon
 *   - syncing: same icon rotating in place
 *   - auto-locked: filled icon + small dot
 *
 * Tap with no provider configured opens the EnableSyncSheet. Tap with a
 * provider runs the engine. Long-press toggles `cloud.autoLocked`; the
 * actual timer that consumes the flag lives in the auto-sync-lock slice.
 *
 * On error the icon flashes red and a snackbar surfaces the reason.
 */
export default function SyncButton({ onRequestEnable }: { onRequestEnable: () => void }) {
  const dark = useColorScheme() === 'dark'
  const [provider, setProviderState] = useState<CloudProvider | undefined>(undefined)
  const [autoLocked, setAutoLockedState] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [backedOff, setBackedOff] = useState(false)
  const spin = useRef(new Animated.Value(0)).current
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null)

  const refreshState = useCallback(async () => {
    const [p, locked] = await Promise.all([getProvider(), getAutoLocked()])
    setProviderState(p)
    setAutoLockedState(locked)
  }, [])

  useEffect(() => {
    refreshState()
    const unsubscribe = subscribeCloudState(refreshState)

    return unsubscribe
  }, [refreshState])

  useEffect(() => {
    return subscribeAutoSyncStatus((s) => {
      setBackedOff(s.backedOff)
    })
  }, [])

  useEffect(() => {
    if (status === 'syncing') {
      spin.setValue(0)
      const animation = Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      )
      spinLoop.current = animation
      animation.start()

      return () => {
        animation.stop()
        spinLoop.current = null
      }
    }

    spin.stopAnimation()
    spin.setValue(0)
  }, [status, spin])

  const runSync = async () => {
    if (status === 'syncing') {
      return
    }

    setStatus('syncing')

    try {
      await runConfiguredSync()
      setStatus('idle')
      showSnackbar('Sync complete')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      showSnackbar(`Sync failed: ${msg}`, 'error')
      setStatus('error')
      setTimeout(() => setStatus('idle'), 1500)
    }
  }

  const handlePress = async () => {
    // Re-read provider in case state was changed elsewhere (e.g. settings).
    const p = await getProvider()
    setProviderState(p)

    if (!p) {
      onRequestEnable()

      return
    }

    runSync()
  }

  const handleLongPress = async () => {
    if (!provider) {
      return
    }

    const next = !autoLocked
    await setAutoLocked(next)
    setAutoLockedState(next)
  }

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const baseColor = dark ? '#aaa' : '#666'
  const iconColor = status === 'error' ? '#ef4444' : baseColor
  const iconFill = autoLocked && status !== 'syncing' ? iconColor : 'transparent'

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={400}
      hitSlop={8}
      accessibilityLabel="Sync"
      style={{ marginRight: 14 }}
    >
      <View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <RefreshCw size={22} color={iconColor} fill={iconFill} />
        </Animated.View>
        {autoLocked && !backedOff && (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: '#10b981',
            }}
          />
        )}
      </View>
    </Pressable>
  )
}
