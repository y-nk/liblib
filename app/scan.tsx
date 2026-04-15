import { useState, useRef } from "react";
import { View, Text, Pressable, TextInput, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { addBook } from "@/lib/storage";
import { getSettings } from "@/lib/storage";
import { lookupISBN } from "@/lib/ai";

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCode, setScannedCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [manualISBN, setManualISBN] = useState("");
  const lockRef = useRef(false);

  const handleBarcode = ({ data }: { data: string }) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setScannedCode(data);
    processISBN(data);
  };

  const processISBN = async (isbn: string) => {
    setStatus("loading");
    setMessage("Looking up book...");
    try {
      const settings = await getSettings();
      const result = await lookupISBN(isbn, settings);
      if (!result) {
        setStatus("error");
        setMessage("Could not find book info for this ISBN.");
        lockRef.current = false;
        return;
      }
      const added = await addBook({
        isbn,
        title: result.title,
        cover: result.cover,
        addedAt: Date.now(),
      });
      if (added) {
        setStatus("success");
        setMessage(`Added: ${result.title}`);
        setTimeout(() => router.back(), 1500);
      } else {
        setStatus("error");
        setMessage("This book is already in your library.");
        lockRef.current = false;
      }
    } catch (e: any) {
      setStatus("error");
      setMessage(e.message || "Lookup failed");
      lockRef.current = false;
    }
  };

  const handleManualSubmit = () => {
    const isbn = manualISBN.trim();
    if (!isbn) return;
    lockRef.current = true;
    setScannedCode(isbn);
    processISBN(isbn);
  };

  const isWeb = Platform.OS === "web";

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-row justify-between items-center px-4 py-3">
        <Pressable onPress={() => router.back()}>
          <Text className="text-white text-base">Cancel</Text>
        </Pressable>
        <Text className="text-white text-lg font-semibold">Scan Barcode</Text>
        <View className="w-16" />
      </View>

      {isWeb ? (
        <View className="flex-1 justify-center px-6">
          <Text className="text-gray-400 text-center mb-6">
            Camera scanning is not available on web. Enter ISBN manually.
          </Text>
          <TextInput
            className="bg-gray-800 rounded-lg px-4 py-3 text-white text-base mb-4"
            placeholder="Enter ISBN..."
            placeholderTextColor="#666"
            value={manualISBN}
            onChangeText={setManualISBN}
            keyboardType="number-pad"
            autoFocus
          />
          <Pressable
            onPress={handleManualSubmit}
            className="bg-white rounded-lg py-3"
            disabled={status === "loading"}
          >
            <Text className="text-black text-center font-semibold text-base">
              {status === "loading" ? "Looking up..." : "Look Up"}
            </Text>
          </Pressable>
        </View>
      ) : !permission?.granted ? (
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-gray-400 text-center mb-4">
            Camera access is needed to scan barcodes.
          </Text>
          <Pressable onPress={requestPermission} className="bg-white rounded-lg px-6 py-3">
            <Text className="text-black font-semibold">Grant Permission</Text>
          </Pressable>
          <View className="mt-8 w-full">
            <Text className="text-gray-400 text-center mb-3">Or enter ISBN manually:</Text>
            <TextInput
              className="bg-gray-800 rounded-lg px-4 py-3 text-white text-base mb-4"
              placeholder="Enter ISBN..."
              placeholderTextColor="#666"
              value={manualISBN}
              onChangeText={setManualISBN}
              keyboardType="number-pad"
            />
            <Pressable
              onPress={handleManualSubmit}
              className="bg-white rounded-lg py-3"
              disabled={status === "loading"}
            >
              <Text className="text-black text-center font-semibold text-base">Look Up</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View className="flex-1">
          <CameraView
            className="flex-1"
            barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
            onBarcodeScanned={status === "loading" || status === "success" ? undefined : handleBarcode}
          />
          <View className="absolute bottom-0 left-0 right-0 bg-black/70 px-4 py-4">
            <TextInput
              className="bg-gray-800 rounded-lg px-4 py-3 text-white text-base mb-3"
              placeholder="Or type ISBN manually..."
              placeholderTextColor="#666"
              value={manualISBN}
              onChangeText={setManualISBN}
              keyboardType="number-pad"
            />
            <Pressable
              onPress={handleManualSubmit}
              className="bg-white rounded-lg py-3"
              disabled={status === "loading"}
            >
              <Text className="text-black text-center font-semibold text-base">Look Up</Text>
            </Pressable>
          </View>
        </View>
      )}

      {status !== "idle" && (
        <View className="absolute bottom-32 left-4 right-4 bg-gray-900 rounded-xl p-4">
          {status === "loading" && <ActivityIndicator color="#fff" />}
          <Text
            className={`text-center mt-1 ${
              status === "error" ? "text-red-400" : status === "success" ? "text-green-400" : "text-white"
            }`}
          >
            {message}
          </Text>
          {scannedCode ? (
            <Text className="text-gray-500 text-center text-xs mt-1">ISBN: {scannedCode}</Text>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}
