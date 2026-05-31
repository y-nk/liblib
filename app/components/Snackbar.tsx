import { useEffect, useRef, useState } from 'react'
import { Animated, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { subscribe, type SnackbarMessage } from '@/lib/snackbar'

/**
 * Mounted once at the root layout. Listens for `showSnackbar()` calls from
 * anywhere in the app, fades in/out, and auto-dismisses after `durationMs`.
 */
export default function Snackbar() {
  const [msg, setMsg] = useState<SnackbarMessage | null>(null)
  const opacity = useRef(new Animated.Value(0)).current
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { bottom } = useSafeAreaInsets()

  useEffect(() => {
    return subscribe((next) => {
      setMsg(next)
    })
  }, [])

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (!msg) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start()

      return
    }

    Animated.timing(opacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start()

    timerRef.current = setTimeout(() => {
      setMsg(null)
    }, msg.durationMs)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [msg, opacity])

  if (!msg) {
    return null
  }

  const bg = msg.kind === 'error' ? 'bg-red-600' : 'bg-neutral-800'

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: bottom + 16,
        opacity,
      }}
    >
      <View className={`${bg} rounded-lg px-4 py-3`}>
        <Text className="text-white text-sm">{msg.text}</Text>
      </View>
    </Animated.View>
  )
}
