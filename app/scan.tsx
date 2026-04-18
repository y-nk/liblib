import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutChangeEvent,
  ActivityIndicator,
  Image,
  ScrollView,
  Animated,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CameraView, useCameraPermissions } from 'expo-camera'
import type { BarcodeScanningResult } from 'expo-camera'
import { useISBNLookup } from '@/lib/useISBNLookup'
import { PROVIDER_LABELS } from '@/lib/types'

function computeOverlayRect(
  result: BarcodeScanningResult,
  viewSize: { width: number; height: number },
) {
  const { cornerPoints, bounds } = result
  const vw = viewSize.width
  const vh = viewSize.height

  // Prefer cornerPoints — compute bounding box from them
  if (cornerPoints && cornerPoints.length >= 4) {
    const xs = cornerPoints.map((p) => p.x)
    const ys = cornerPoints.map((p) => p.y)
    let minX = Math.min(...xs)
    let minY = Math.min(...ys)
    let maxX = Math.max(...xs)
    let maxY = Math.max(...ys)

    // On Android in portrait, cornerPoints are in sensor coords (landscape).
    // If the bounding box width > height but view is portrait, axes are swapped.
    const boxW = maxX - minX
    const boxH = maxY - minY
    const isAndroidSwapped = Platform.OS === 'android' && boxW > boxH * 2 && vw < vh

    if (isAndroidSwapped) {
      // Swap x↔y and mirror
      const swapped = cornerPoints.map((p) => ({ x: p.y, y: vw - p.x }))
      const sx = swapped.map((p) => p.x)
      const sy = swapped.map((p) => p.y)
      minX = Math.min(...sx)
      minY = Math.min(...sy)
      maxX = Math.max(...sx)
      maxY = Math.max(...sy)

      // Scale from sensor portrait to view
      const scaleX = vw / vh
      const scaleY = vh / vw

      return {
        x: minX * scaleX,
        y: minY * scaleY,
        w: (maxX - minX) * scaleX,
        h: (maxY - minY) * scaleY,
      }
    }

    // Check if normalized (iOS)
    if (maxX <= 1 && maxY <= 1) {
      return { x: minX * vw, y: minY * vh, w: (maxX - minX) * vw, h: (maxY - minY) * vh }
    }

    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  }

  // Fallback to bounds
  if (bounds?.origin && bounds?.size) {
    const isNormalized =
      bounds.origin.x <= 1 &&
      bounds.origin.y <= 1 &&
      bounds.size.width <= 1 &&
      bounds.size.height <= 1

    if (isNormalized) {
      return {
        x: bounds.origin.x * vw,
        y: bounds.origin.y * vh,
        w: bounds.size.width * vw,
        h: bounds.size.height * vh,
      }
    }

    return {
      x: bounds.origin.x,
      y: bounds.origin.y,
      w: bounds.size.width,
      h: bounds.size.height,
    }
  }

  return null
}

export default function ScanScreen() {
  const router = useRouter()
  const { top } = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const [permissionRequested, setPermissionRequested] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 })
  const overlayAnim = useRef({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    w: new Animated.Value(0),
    h: new Animated.Value(0),
    opacity: new Animated.Value(0),
  }).current

  useEffect(() => {
    if (!permissionRequested) {
      setPermissionRequested(true)
      requestPermission()
    }
  }, [])

  const { status, message, candidates, isBusy, pick, reset, search } = useISBNLookup(() => {
    setTimeout(() => router.back(), 1500)
  })

  const onCameraLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setViewSize({ width, height })
  }

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (viewSize.width > 0) {
      const rect = computeOverlayRect(result, viewSize)

      if (rect) {
        overlayAnim.x.setValue(rect.x)
        overlayAnim.y.setValue(rect.y)
        overlayAnim.w.setValue(rect.w)
        overlayAnim.h.setValue(rect.h)

        Animated.sequence([
          Animated.timing(overlayAnim.opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: false,
          }),
          Animated.timing(overlayAnim.opacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
        ]).start()
      }
    }

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
                    source={{ uri: book.cover || book.coverUrl }}
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
                  {PROVIDER_LABELS[book.provider]}
                </Text>
              )}
            </React.Fragment>
          ))}
          <Pressable onPress={reset} className="mt-2">
            <Text className="text-gray-500 text-center text-sm">None of these — cancel</Text>
          </Pressable>
        </ScrollView>
      ) : permission?.granted ? (
        <View style={styles.cameraContainer} onLayout={onCameraLayout}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onCameraReady={() => setCameraReady(true)}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={!cameraReady || isBusy ? undefined : handleBarcodeScanned}
          />
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: overlayAnim.x,
              top: overlayAnim.y,
              width: overlayAnim.w,
              height: overlayAnim.h,
              opacity: overlayAnim.opacity,
              borderWidth: 2,
              borderColor: '#fff',
              borderStyle: 'dashed',
              borderRadius: 8,
            }}
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
          <Text
            className={`text-center mt-1 ${
              status === 'error'
                ? 'text-red-400'
                : status === 'success'
                  ? 'text-green-400'
                  : 'text-white'
            }`}
          >
            {message}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraContainer: { flex: 1, position: 'relative' },
})
