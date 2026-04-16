import { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, Pressable, Modal, Image, ScrollView, ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { addBook } from "@/lib/storage";
import { fetchCoverAsBase64 } from "@/lib/providers/cover";
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
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setIsbn("");
      setTitle("");
      setCover("");
      setShowCamera(false);
      setSaving(false);
      setError("");
    }
  }, [visible]);

  const handleTakePhoto = async (uri: string) => {
    try {
      const res = await fetch(uri);
      const blob = await res.blob();
      const b64: string = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve("");
        reader.readAsDataURL(blob);
      });
      setCover(b64);
    } catch {
      setCover(uri);
    }
    setShowCamera(false);
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
      <View className="flex-1 bg-black/50">
        <Pressable className="h-[5%]" onPress={onClose} />
        <View className="flex-1 bg-white rounded-t-2xl">
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-gray-300" />
          </View>

          {showCamera ? (
            <View className="flex-1">
              <View className="flex-row justify-between items-center px-4 py-3">
                <Pressable onPress={() => setShowCamera(false)}>
                  <Text className="text-base text-blue-500">Cancel</Text>
                </Pressable>
                <Text className="text-lg font-semibold">Take Photo</Text>
                <View className="w-16" />
              </View>
              {!permission?.granted ? (
                <View className="flex-1 justify-center items-center px-6">
                  <Text className="text-gray-400 text-center mb-4">Camera access needed</Text>
                  <Pressable onPress={requestPermission} className="bg-black rounded-lg px-6 py-3">
                    <Text className="text-white font-semibold">Grant Permission</Text>
                  </Pressable>
                </View>
              ) : (
                <CameraView
                  className="flex-1"
                  facing="back"
                  onCameraReady={() => {}}
                  ref={(ref) => {
                    if (ref) {
                      (globalThis as any).__cameraRef = ref;
                    }
                  }}
                >
                  <View className="flex-1 justify-end items-center pb-10">
                    <Pressable
                      onPress={async () => {
                        const cam = (globalThis as any).__cameraRef;
                        if (cam) {
                          const photo = await cam.takePictureAsync({ quality: 0.5 });
                          if (photo?.uri) handleTakePhoto(photo.uri);
                        }
                      }}
                      className="w-16 h-16 rounded-full bg-white border-4 border-gray-300"
                    />
                  </View>
                </CameraView>
              )}
            </View>
          ) : (
            <ScrollView className="flex-1 px-4 pt-4">
              <Text className="text-2xl font-bold mb-6">Add Book</Text>

              <Text className="text-xs font-medium text-gray-500 mb-1 uppercase">ISBN</Text>
              <TextInput
                className="bg-gray-100 rounded-lg px-4 py-3 text-base mb-4"
                placeholder="9780..."
                placeholderTextColor="#999"
                value={isbn}
                onChangeText={setIsbn}
                keyboardType="number-pad"
                autoFocus
              />

              <Text className="text-xs font-medium text-gray-500 mb-1 uppercase">Title</Text>
              <TextInput
                className="bg-gray-100 rounded-lg px-4 py-3 text-base mb-4"
                placeholder="Book title..."
                placeholderTextColor="#999"
                value={title}
                onChangeText={setTitle}
              />

              <Text className="text-xs font-medium text-gray-500 mb-1 uppercase">Cover</Text>
              <Pressable
                onPress={() => setShowCamera(true)}
                className="border border-gray-200 rounded-lg mb-6 overflow-hidden"
              >
                {cover ? (
                  <Image source={{ uri: cover }} className="w-full h-48" resizeMode="cover" />
                ) : (
                  <View className="h-32 items-center justify-center">
                    <Text className="text-gray-400 text-base">Tap to take a photo</Text>
                  </View>
                )}
              </Pressable>

              {error ? (
                <Text className="text-red-500 text-sm text-center mb-3">{error}</Text>
              ) : null}

              <Pressable
                onPress={handleSave}
                disabled={saving}
                className="bg-black rounded-lg py-3 mb-10"
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-center font-semibold text-base">Add to Library</Text>
                )}
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
