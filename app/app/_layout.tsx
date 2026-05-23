import '../global.css'
import { useColorScheme } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'

export default function RootLayout() {
  const dark = useColorScheme() === 'dark'

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
              title: 'Books',
              headerBackTitle: 'Shelves',
            }}
          />
          <Stack.Screen
            name="scan"
            options={{ headerShown: false, presentation: 'fullScreenModal' }}
          />
        </Stack>
      </KeyboardProvider>
    </GestureHandlerRootView>
  )
}
