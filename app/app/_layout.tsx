import '../global.css'
import { useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import Snackbar from '@/components/Snackbar'
import { startAutoSync } from '@/lib/cloud/autoSync'
import { installGlobalErrorLogging } from '@/lib/log'

// Install before any component renders so uncaught/fatal errors during the
// first render are captured in the on-disk log.
installGlobalErrorLogging()

export default function RootLayout() {
  const dark = useColorScheme() === 'dark'

  // Owns the foreground auto-sync timer for the lifetime of the app session.
  // The controller internally observes `cloud.provider` / `cloud.autoLocked`
  // and the React Native AppState, so we don't need to re-render anything
  // here to react to those flags.
  useEffect(() => {
    const dispose = startAutoSync()

    return dispose
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: true,
            headerStyle: { backgroundColor: dark ? '#0a0a0a' : '#ffffff' },
            headerTintColor: dark ? '#ffffff' : '#000000',
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Shelves' }} />
          <Stack.Screen
            name="books"
            options={{
              headerBackTitle: 'Shelves',
            }}
          />
          <Stack.Screen
            name="scan"
            options={{ headerShown: false, presentation: 'fullScreenModal' }}
          />
        </Stack>
        <Snackbar />
      </KeyboardProvider>
    </GestureHandlerRootView>
  )
}
