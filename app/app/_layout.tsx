import '../global.css'
import { useColorScheme } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import Snackbar from '@/components/Snackbar'
import { SyncProvider } from '@/lib/cloud/SyncProvider'
import { installGlobalErrorLogging } from '@/lib/log'

// Install before any component renders so uncaught/fatal errors during the
// first render are captured in the on-disk log.
installGlobalErrorLogging()

export default function RootLayout() {
  const dark = useColorScheme() === 'dark'

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SyncProvider>
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
        </SyncProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  )
}
