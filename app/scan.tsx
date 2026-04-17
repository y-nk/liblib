import { useEffect, useState } from "react";
import {
  View, Text, Pressable,
  ActivityIndicator, Image, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useISBNLookup } from "@/lib/useISBNLookup";

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [permissionRequested, setPermissionRequested] = useState(false);

  useEffect(() => {
    if (!permissionRequested) {
      setPermissionRequested(true);
      requestPermission();
    }
  }, []);

  const { status, message, candidates, isBusy, pick, reset, search } = useISBNLookup(() => {
    setTimeout(() => router.back(), 1500);
  });

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-row justify-between items-center px-4 py-3">
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
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
          onBarcodeScanned={isBusy ? undefined : ({ data }) => search(data)}
        />
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
    </SafeAreaView>
  );
}
