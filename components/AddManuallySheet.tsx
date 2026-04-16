import { useEffect, useState } from "react";
import {
  View, Text, TextInput, Pressable, Modal, Image, ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "lucide-react-native";
import { addBook } from "@/lib/storage";
import type { Book } from "@/lib/types";

export default function AddManuallySheet({
  visible,
  onClose,
  onAdded,
}: {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [isbn, setIsbn] = useState("");
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setIsbn("");
      setTitle("");
      setCover("");
      setSaving(false);
      setError("");
    }
  }, [visible]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setCover(a.base64 ? `data:${a.mimeType || "image/jpeg"};base64,${a.base64}` : a.uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setCover(a.base64 ? `data:${a.mimeType || "image/jpeg"};base64,${a.base64}` : a.uri);
    }
  };

  const handleSave = async () => {
    if (!isbn.trim() || !title.trim()) {
      setError("ISBN and title are required");
      return;
    }
    setSaving(true);
    setError("");
    const book: Book = {
      isbn: isbn.trim(),
      title: title.trim(),
      cover,
      addedAt: Date.now(),
    };
    const added = await addBook(book);
    setSaving(false);
    if (added) {
      onAdded();
      onClose();
    } else {
      setError("This book is already in your library");
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-2xl">
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-gray-300" />
          </View>

          <View className="px-4 pt-4 pb-10">
            <Text className="text-xl font-bold mb-5">Add Book</Text>

            <View className="flex-row mb-5">
              <View style={{ aspectRatio: 210 / 297 }}>
                <Pressable
                  onPress={takePhoto}
                  onLongPress={pickImage}
                  className="flex-1 border border-dashed border-gray-300 rounded-xl overflow-hidden items-center justify-center bg-gray-50"
                >
                  {cover ? (
                    <Image source={{ uri: cover }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <>
                      <Camera size={24} color="#9ca3af" />
                      <Text className="text-gray-400 text-xs mt-1">Hold: gallery</Text>
                    </>
                  )}
                </Pressable>
              </View>

              <View className="flex-1 flex-col gap-4 ml-4 justify-center">
                <TextInput
                  className="bg-gray-100 rounded-lg px-3 py-2.5 text-base"
                  placeholder="ISBN"
                  placeholderTextColor="#999"
                  value={isbn}
                  onChangeText={setIsbn}
                  keyboardType="number-pad"
                  autoFocus
                />
                <TextInput
                  className="bg-gray-100 rounded-lg px-3 py-2.5 text-base"
                  placeholder="Title"
                  placeholderTextColor="#999"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>
            </View>

            {error ? (
              <Text className="text-red-500 text-sm text-center mb-3">{error}</Text>
            ) : null}

            <Pressable
              onPress={handleSave}
              disabled={saving}
              className="bg-black rounded-lg py-3"
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-center font-semibold text-base">Add to Library</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
