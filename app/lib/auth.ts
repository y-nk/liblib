import { Platform } from 'react-native'
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin'
import * as AppleAuthentication from 'expo-apple-authentication'
import AsyncStorage from '@react-native-async-storage/async-storage'

const USER_KEY = 'auth_user'

export type AuthUser = {
  id: string
  name: string
  email: string
  provider: 'google' | 'apple'
}

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
})

export async function signInWithGoogle(): Promise<AuthUser | null> {
  await GoogleSignin.hasPlayServices()
  const result = await GoogleSignin.signIn()

  if (!isSuccessResponse(result)) {
    return null
  }

  const { user } = result.data

  const authUser: AuthUser = {
    id: user.id,
    name: user.name ?? '',
    email: user.email,
    provider: 'google',
  }

  await AsyncStorage.setItem(USER_KEY, JSON.stringify(authUser))

  return authUser
}

export async function signInWithApple(): Promise<AuthUser | null> {
  if (Platform.OS !== 'ios') {
    return null
  }

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  })

  const authUser: AuthUser = {
    id: credential.user,
    name: [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(' '),
    email: credential.email ?? '',
    provider: 'apple',
  }

  await AsyncStorage.setItem(USER_KEY, JSON.stringify(authUser))

  return authUser
}

export async function getUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY)

  return raw ? JSON.parse(raw) : null
}

export async function signOut() {
  const user = await getUser()

  if (user?.provider === 'google') {
    try {
      await GoogleSignin.signOut()
    } catch {}
  }

  await AsyncStorage.removeItem(USER_KEY)
}
