import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CameraView, useCameraPermissions } from 'expo-camera'
import type { BarcodeScanningResult } from 'expo-camera'
import { useISBNLookup } from '@/hooks/useISBNLookup'
import { providers } from '@/lib/providers'

export default function ScanScreen() {
  const router = useRouter()
  const { top } = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const [permissionRequested, setPermissionRequested] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [scannedIsbn, setScannedIsbn] = useState('')
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!permissionRequested) {
      setPermissionRequested(true)
      requestPermission()
    }
  }, [])

  const { status, message, providerName, candidates, isBusy, pick, reset, search } = useISBNLookup(
    () => {
      exitTimer.current = setTimeout(() => router.back(), 3000)
    },
  )

  const keepScanning = () => {
    if (exitTimer.current) {
      clearTimeout(exitTimer.current)
      exitTimer.current = null
    }

    setScannedIsbn('')
    reset()
  }

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    setScannedIsbn(result.data)
    search(result.data)
  }

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: top }} className="flex-row justify-between items-center px-4 py-3">
        <Pressable onPress={() => router.back()}>
          <Text className="text-white text-base">Cancel</Text>
        </Pressable>
        <Text className="text-white text-lg font-semibold">Scan Barcode</Text>
        <View className="w-16" />
      </View>

      {status === 'picking' ? (
        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
          <Text className="text-gray-400 text-center mb-4">{message}</Text>
          {candidates.map((book, i) => (
            <React.Fragment key={i}>
              <Pressable
                onPress={() => pick(book)}
                className="flex-row items-center bg-gray-900 rounded-xl p-3 mb-1"
              >
                {book.cover || book.coverUrl ? (
                  <Image
                    source={{ uri: book.cover || book.coverUrl || undefined }}
                    className="w-16 h-22 rounded bg-gray-800"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-16 h-22 rounded bg-gray-800" />
                )}
                <View className="flex-1 ml-3">
                  <Text className="text-white text-base font-medium" numberOfLines={3}>
                    {book.title}
                  </Text>
                  <Text className="text-gray-500 text-xs mt-1">{book.isbn}</Text>
                </View>
              </Pressable>
              {book.provider && (
                <Text className="text-gray-600 text-xs text-right mr-2 mb-2">
                  {providers[book.provider]?.name}
                </Text>
              )}
            </React.Fragment>
          ))}
          <Pressable onPress={reset} className="mt-2">
            <Text className="text-gray-500 text-center text-sm">None of these — cancel</Text>
          </Pressable>
        </ScrollView>
      ) : permission?.granted ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onCameraReady={() => setCameraReady(true)}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={!cameraReady || isBusy ? undefined : handleBarcodeScanned}
          />
        </View>
      ) : (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#fff" />
        </View>
      )}

      {(status === 'loading' ||
        status === 'saving' ||
        status === 'success' ||
        status === 'error') && (
        <View className="absolute bottom-20 left-4 right-4 bg-gray-900 rounded-xl p-4">
          {(status === 'loading' || status === 'saving') && <ActivityIndicator color="#fff" />}

          {scannedIsbn ? (
            <Text className="text-gray-500 text-center text-xs mb-1">ISBN: {scannedIsbn}</Text>
          ) : null}

          <Text
            className={`text-center ${
              status === 'error'
                ? 'text-red-400'
                : status === 'success'
                  ? 'text-green-400'
                  : 'text-white'
            }`}
          >
            {message}
          </Text>

          {status === 'success' && providerName ? (
            <Text className="text-gray-500 text-center text-xs mt-1">({providerName})</Text>
          ) : null}

          {status === 'success' && (
            <Pressable onPress={keepScanning} className="mt-4 bg-white rounded-lg py-3 px-6">
              <Text className="text-black text-center text-base font-semibold">Keep scanning</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraContainer: { flex: 1, position: 'relative' },
})
