import { useEffect, useState } from "react";
import {
  View, Text, TextInput, Pressable, Image, ScrollView,
  ActivityIndicator, useColorScheme,
} from "react-native";
import CenterModal from "./CenterModal";
import { useISBNLookup } from "@/lib/useISBNLookup";

export default function SearchSheet({
  visible,
  onClose,
  onAdded,
  onManualFallback,
}: {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
  onManualFallback: (isbn: string) => void;
}) {
  const [isbn, setIsbn] = useState("");
  const dark = useColorScheme() === "dark";
  const { status, message, candidates, isBusy, search, pick, reset } = useISBNLookup(() => {
    setTimeout(() => {
      onAdded();
      onClose();
    }, 1500);
  });

  useEffect(() => {
    if (visible) {
      setIsbn("");
      reset();
    }
  }, [visible]);

  const handleSubmit = () => {
    const trimmed = isbn.trim();
    if (!trimmed) return;
    search(trimmed);
  };

  const handleManualFallback = () => {
    const trimmed = isbn.trim();
    onClose();
    onManualFallback(trimmed);
  };

  return (
    <CenterModal visible={visible} onClose={onClose}>
      {status === "picking" ? (
        <ScrollView className="p-4" style={{ maxHeight: 400 }}>
          <Text className="text-gray-400 text-center mb-4">{message}</Text>
          {candidates.map((book, i) => (
            <Pressable
              key={i}
              onPress={() => pick(book)}
              className="flex-row items-center bg-gray-100 dark:bg-neutral-800 rounded-xl p-3 mb-3"
            >
              {(book.cover || book.coverUrl) ? (
                <Image
                  source={{ uri: book.cover || book.coverUrl }}
                  className="w-12 h-16 rounded bg-gray-200 dark:bg-neutral-700"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-12 h-16 rounded bg-gray-200 dark:bg-neutral-700" />
              )}
              <View className="flex-1 ml-3">
                <Text className="text-base font-medium dark:text-white" numberOfLines={2}>
                  {book.title}
                </Text>
                <Text className="text-gray-400 text-xs mt-1">{book.isbn}</Text>
              </View>
            </Pressable>
          ))}
          <Pressable onPress={reset} className="mt-1 mb-2">
            <Text className="text-gray-500 text-center text-sm">None of these</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <View className="p-5">
          <Text className="text-xl font-bold mb-4 dark:text-white">Search by ISBN</Text>
          <TextInput
            className="bg-gray-100 dark:bg-neutral-800 rounded-lg px-4 py-3 text-base dark:text-white mb-4"
            placeholder="Enter ISBN..."
            placeholderTextColor={dark ? "#666" : "#999"}
            value={isbn}
            onChangeText={(t) => { setIsbn(t); if (status === "error") reset(); }}
            keyboardType="number-pad"
            autoFocus
            editable={!isBusy}
          />

          {status === "error" ? (
            <Text className="text-red-500 text-center text-sm mb-4">{message}</Text>
          ) : status !== "idle" ? (
            <View className="mb-4">
              {(status === "loading" || status === "saving") && <ActivityIndicator color={dark ? "#fff" : "#000"} />}
              <Text
                className={`text-center text-sm mt-1 ${
                  status === "success" ? "text-green-600 dark:text-green-400" : "text-gray-400"
                }`}
              >
                {message}
              </Text>
            </View>
          ) : null}

          {status === "error" ? (
            <Pressable onPress={handleManualFallback} className="bg-black dark:bg-white rounded-lg py-3">
              <Text className="text-white dark:text-black text-center font-semibold text-base">
                Add manually instead
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSubmit}
              disabled={isBusy || !isbn.trim()}
              className={`rounded-lg py-3 ${isBusy || !isbn.trim() ? "bg-gray-300 dark:bg-neutral-700" : "bg-black dark:bg-white"}`}
            >
              <Text className={`text-center font-semibold text-base ${isBusy || !isbn.trim() ? "text-gray-500" : "text-white dark:text-black"}`}>
                Look Up
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </CenterModal>
  );
}
