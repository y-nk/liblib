import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { GoogleDriveAdapter, type GoogleTokenProvider } from '@y_nk/react-native-cloud-sync'
import { CLOUD_KEYS, useCloudStore } from './state'

/**
 * The OAuth scope that lets us read/write the per-app `appDataFolder` on
 * Google Drive. The user sees this on the consent screen the first time
 * they enable Drive sync. The scope must also be registered on the OAuth
 * consent screen in Google Cloud Console (HITL prerequisite).
 */
const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'

let configured = false

/**
 * Idempotent `GoogleSignin.configure()`. We pass the `drive.appdata` scope
 * at configure time so it's automatically requested on the first `signIn()`
 * call — this matches the lib's recommended usage path on v16.
 */
function ensureConfigured() {
  if (configured) {
    return
  }

  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    scopes: [DRIVE_APPDATA_SCOPE],
    offlineAccess: false,
  })
  configured = true
}

type StoredTokens = {
  idToken: string | null
  accessToken: string
  /** ms since epoch we last refreshed the access token. Diagnostic only. */
  refreshedAt: number
}

async function persistTokens(tokens: { idToken: string | null; accessToken: string }) {
  const blob: StoredTokens = {
    idToken: tokens.idToken,
    accessToken: tokens.accessToken,
    refreshedAt: Date.now(),
  }
  await AsyncStorage.setItem(CLOUD_KEYS.googleToken, JSON.stringify(blob))
}

async function readPersistedTokens() {
  const raw = await AsyncStorage.getItem(CLOUD_KEYS.googleToken)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as StoredTokens
  } catch {
    return null
  }
}

/**
 * Drives the "Sync with Google Drive" button:
 *
 *   1. Prompts Google sign-in with the `drive.appdata` scope.
 *   2. On success persists `cloud.provider = 'google'`, the access token
 *      blob, and the signed-in email.
 *
 * Returns the AuthUser-shaped subset the caller needs, or `null` if the user
 * cancelled. Throws on any non-cancel error so the UI can surface it.
 */
export async function signInWithGoogleDrive() {
  ensureConfigured()
  await GoogleSignin.hasPlayServices()
  const response = await GoogleSignin.signIn()

  if (!isSuccessResponse(response)) {
    return null
  }

  const { user, idToken } = response.data
  // signIn alone doesn't surface the access token in v16; pull it out
  // explicitly so we can stash it in AsyncStorage for the adapter to use.
  const tokens = await GoogleSignin.getTokens()
  await persistTokens({ idToken: idToken ?? null, accessToken: tokens.accessToken })
  useCloudStore.getState().setAccountEmail(user.email)
  useCloudStore.getState().setProvider('google')

  return { email: user.email }
}

/**
 * Token provider passed to `GoogleDriveAdapter`. When `forceRefresh` is
 * true (the adapter caught a 401), we call `getTokens()` which refreshes
 * via the SDK's stored refresh credential, then persists the new access
 * token blob into `cloud.tokens` for the next process restart.
 */
const tokenProvider: GoogleTokenProvider = async (forceRefresh) => {
  ensureConfigured()

  if (!forceRefresh) {
    const persisted = await readPersistedTokens()

    if (persisted?.accessToken) {
      return persisted.accessToken
    }
  }

  const tokens = await GoogleSignin.getTokens()
  await persistTokens({ idToken: null, accessToken: tokens.accessToken })

  return tokens.accessToken
}

/**
 * Builds the configured `GoogleDriveAdapter` for the engine. Safe to call
 * from any sync entry point; the underlying token cache survives multiple
 * adapter instances within a process.
 */
export function createGoogleDriveAdapter() {
  ensureConfigured()

  return new GoogleDriveAdapter({ getAccessToken: tokenProvider })
}

/**
 * Best-effort `revokeAccess()`. Errors (no signed-in user, network failure,
 * etc.) are swallowed so the caller's "Disable sync" UX never blocks on
 * Google's servers being reachable.
 */
export async function revokeGoogleAccess() {
  ensureConfigured()

  try {
    await GoogleSignin.revokeAccess()
  } catch {
    // intentionally empty — best-effort revocation
  }
}
