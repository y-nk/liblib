import { useState, useRef, useCallback } from "react";
import {
  View, Text, Pressable, TextInput, Platform,
  ActivityIndicator, Image, ScrollView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { addBook, getSettings } from "@/lib/storage";
import { lookupISBN, lookupISBNCandidates } from "@/lib/ai";
import type { Book } from "@/lib/types";

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCode, setScannedCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "picking" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [manualISBN, setManualISBN] = useState("");
  const [useGPT, setUseGPT] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [candidates, setCandidates] = useState<Book[]>([]);
  const lockRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      getSettings().then((s) => setHasKey(!!s.apiKey));
    }, [])
  );

  const handleBarcode = ({ data }: { data: string }) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setScannedCode(data);
    processISBN(data);
  };

  const processISBN = async (isbn: string) => {
    setStatus("loading");
    setMessage("Looking up book...");
    setCandidates([]);
    try {
      if (useGPT && hasKey) {
        const results = await lookupISBNCandidates(isbn);
        if (!results || results.length === 0) {
          setStatus("error");
          setMessage("Could not find book info for this ISBN.");
          lockRef.current = false;
          return;
        }
        if (results.length === 1) {
          await handlePick(results[0]);
        } else {
          setCandidates(results);
          setStatus("picking");
          setMessage("Multiple matches — pick the correct one:");
        }
      } else {
        const result = await lookupISBN(isbn);
        if (!result) {
          setStatus("error");
          setMessage(
            hasKey
              ? "Not found in free databases. Enable GPT for AI lookup."
              : "Could not find book info for this ISBN."
          );
          lockRef.current = false;
          return;
        }
        await handlePick(result);
      }
    } catch (e: any) {
      setStatus("error");
      setMessage(e.message || "Lookup failed");
      lockRef.current = false;
    }
  };

  const handlePick = async (book: Book) => {
    const added = await addBook(book);
    if (added) {
      setStatus("success");
      setCandidates([]);
      setMessage(`Added: ${book.title}`);
      setTimeout(() => router.back(), 1500);
    } else {
      setStatus("error");
      setMessage("This book is already in your library.");
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
  const isBusy = status === "loading" || status === "success";

  const gptToggle = (
    <Pressable
      onPress={() => hasKey && setUseGPT(!useGPT)}
      className="flex-row items-center mt-3"
    >
      <View className={`w-5 h-5 rounded border mr-2 items-center justify-center ${
        !hasKey ? "border-gray-700 bg-gray-800" :
        useGPT ? "border-white bg-white" : "border-gray-500"
      }`}>
        {useGPT && hasKey && <Text className="text-black text-xs font-bold">✓</Text>}
      </View>
      <Text className={hasKey ? "text-gray-300 text-sm" : "text-gray-600 text-sm"}>
        Use GPT{!hasKey ? " (set API key in Settings)" : ""}
      </Text>
    </Pressable>
  );

  const inputBlock = (autoFocus?: boolean) => (
    <View>
      <TextInput
        className="bg-gray-800 rounded-lg px-4 py-3 text-white text-base mb-3"
        placeholder="Enter ISBN..."
        placeholderTextColor="#666"
        value={manualISBN}
        onChangeText={setManualISBN}
        keyboardType="number-pad"
        autoFocus={autoFocus}
      />
      <Pressable
        onPress={handleManualSubmit}
        className="bg-white rounded-lg py-3"
        disabled={isBusy}
      >
        <Text className="text-black text-center font-semibold text-base">
          {status === "loading" ? "Looking up..." : "Look Up"}
        </Text>
      </Pressable>
      {gptToggle}
    </View>
  );

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
              onPress={() => handlePick(book)}
              className="flex-row items-center bg-gray-900 rounded-xl p-3 mb-3"
            >
              <Image
                source={{ uri: book.cover }}
                className="w-16 h-22 rounded bg-gray-800"
                resizeMode="cover"
              />
              <View className="flex-1 ml-3">
                <Text className="text-white text-base font-medium" numberOfLines={3}>
                  {book.title}
                </Text>
                <Text className="text-gray-500 text-xs mt-1">{book.isbn}</Text>
              </View>
            </Pressable>
          ))}
          <Pressable
            onPress={() => {
              setStatus("idle");
              setCandidates([]);
              lockRef.current = false;
            }}
            className="mt-2"
          >
            <Text className="text-gray-500 text-center text-sm">None of these — cancel</Text>
          </Pressable>
        </ScrollView>
      ) : isWeb ? (
        <View className="flex-1 justify-center px-6">
          <Text className="text-gray-400 text-center mb-6">
            Camera scanning is not available on web. Enter ISBN manually.
          </Text>
          {inputBlock(true)}
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
            {inputBlock()}
          </View>
        </View>
      ) : (
        <View className="flex-1">
          <CameraView
            className="flex-1"
            barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
            onBarcodeScanned={isBusy ? undefined : handleBarcode}
          />
          <View className="absolute bottom-0 left-0 right-0 bg-black/70 px-4 py-4">
            {inputBlock()}
          </View>
        </View>
      )}

      {(status === "loading" || status === "success" || status === "error") && (
        <View className="absolute bottom-44 left-4 right-4 bg-gray-900 rounded-xl p-4">
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
