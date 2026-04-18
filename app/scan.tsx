import { useEffect, useState, useRef } from "react";
import {
  View, Text, Pressable, StyleSheet,
  ActivityIndicator, Image, ScrollView, Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { BarcodeScanningResult } from "expo-camera";
import { useISBNLookup } from "@/lib/useISBNLookup";

type BarcodeOverlay = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function ScanScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [overlay, setOverlay] = useState<BarcodeOverlay | null>(null);
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!permissionRequested) {
      setPermissionRequested(true);
      requestPermission();
    }
  }, []);

  const { status, message, candidates, isBusy, pick, reset, search } = useISBNLookup(() => {
    setTimeout(() => router.back(), 1500);
  });

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    const { bounds } = result;
    if (bounds?.origin && bounds?.size) {
      setOverlay({
        x: bounds.origin.x,
        y: bounds.origin.y,
        width: bounds.size.width,
        height: bounds.size.height,
      });
      Animated.sequence([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }
    search(result.data);
  };

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: top }} className="flex-row justify-between items-center px-4 py-3">
        <Pressable onPress={() => router.back()}>
          <Text className="text-white text-base">Cancel</Text>
        </Pressable>
        <Text className="text-white text-lg font-semibold">Scan Barcode</Text>
        <View className="w-16" />
      </View>

      {status === "picking" ? (
        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
          <Text className="text-gray-400 text-center mb-4">{message}</Text>
          {candidates.map((book, i) => (
            <Pressable
              key={i}
              onPress={() => pick(book)}
              className="flex-row items-center bg-gray-900 rounded-xl p-3 mb-3"
            >
              {(book.cover || book.coverUrl) ? (
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
            barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
            onBarcodeScanned={!cameraReady || isBusy ? undefined : handleBarcodeScanned}
          />
          {overlay && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.overlay,
                {
                  left: overlay.x,
                  top: overlay.y,
                  width: overlay.width,
                  height: overlay.height,
                  opacity: overlayOpacity,
                },
              ]}
            />
          )}
        </View>
      ) : (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#fff" />
        </View>
      )}

      {(status === "loading" || status === "saving" || status === "success" || status === "error") && (
        <View className="absolute bottom-20 left-4 right-4 bg-gray-900 rounded-xl p-4">
          {(status === "loading" || status === "saving") && <ActivityIndicator color="#fff" />}
          <Text
            className={`text-center mt-1 ${
              status === "error" ? "text-red-400" : status === "success" ? "text-green-400" : "text-white"
            }`}
          >
            {message}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  cameraContainer: { flex: 1, position: "relative" },
  overlay: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#22c55e",
    borderRadius: 4,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
});
