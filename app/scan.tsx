import { useState, useRef } from "react";
import {
  View, Text, Pressable, TextInput,
  ActivityIndicator, Image, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { addBook } from "@/lib/storage";
import { lookupISBN } from "@/lib/providers";
import { fetchCoverAsBase64 } from "@/lib/providers/cover";
import type { Book } from "@/lib/types";

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCode, setScannedCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "picking" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [manualISBN, setManualISBN] = useState("");
  const [candidates, setCandidates] = useState<Book[]>([]);
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
    setCandidates([]);
    try {
      const results = await lookupISBN(isbn);
      if (results.length === 0) {
        setStatus("error");
        setMessage("Could not find book info for this ISBN.");
        lockRef.current = false;
      } else if (results.length === 1) {
        await handlePick(results[0]);
      } else {
        setCandidates(results);
        setStatus("picking");
        setMessage("Multiple matches — pick the correct one:");
      }
    } catch (e: any) {
      setStatus("error");
      setMessage(e.message || "Lookup failed");
      lockRef.current = false;
    }
  };

  const handlePick = async (book: Book) => {
    setStatus("saving");
    setMessage(`Saving: ${book.title}`);

    let cover = book.cover;
    if (!cover && book.coverUrl) {
      try {
        cover = await fetchCoverAsBase64(book.coverUrl);
      } catch {}
    }

    const toSave = { ...book, cover, coverUrl: undefined };
    const added = await addBook(toSave);
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

  const isBusy = status === "loading" || status === "saving" || status === "success";

  const inputBlock = () => (
    <View>
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
        disabled={isBusy}
      >
        <Text className="text-black text-center font-semibold text-base">
          {status === "loading" ? "Looking up..." : "Look Up"}
        </Text>
      </Pressable>
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
      ) : !permission?.granted ? (
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-gray-400 text-center mb-4">
            Camera access is needed to scan barcodes.
          </Text>
          <Pressable onPress={requestPermission} className="bg-white rounded-lg px-6 py-3">
            <Text className="text-black font-semibold">Grant Permission</Text>
          </Pressable>
          <View className="mt-8 w-full">
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

      {(status === "loading" || status === "saving" || status === "success" || status === "error") && (
        <View className="absolute bottom-44 left-4 right-4 bg-gray-900 rounded-xl p-4">
          {(status === "loading" || status === "saving") && <ActivityIndicator color="#fff" />}
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
