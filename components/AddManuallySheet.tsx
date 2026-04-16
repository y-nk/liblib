import { useEffect, useState } from "react";
import {
  View, Text, TextInput, Pressable, Modal, Image, ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
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
      <View className="flex-1 bg-black/50 justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-2xl">
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-gray-300" />
          </View>

          {showCamera ? (
            <View style={{ height: 400 }}>
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
                  ref={(ref) => {
                    if (ref) (globalThis as any).__cameraRef = ref;
                  }}
                >
                  <View className="flex-1 justify-end items-center pb-6">
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
            <View className="px-4 pt-4 pb-10">
              <Text className="text-xl font-bold mb-5">Add Book</Text>

              <View className="flex-row mb-5">
                <Pressable
                  onPress={() => setShowCamera(true)}
                  className="border border-dashed border-gray-300 rounded-xl overflow-hidden items-center justify-center bg-gray-50"
                  style={{ width: 80, aspectRatio: 210 / 297 }}
                >
                  {cover ? (
                    <Image source={{ uri: cover }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <Camera size={24} color="#9ca3af" />
                  )}
                </Pressable>

                <View className="flex-1 ml-4 justify-center">
                  <TextInput
                    className="bg-gray-100 rounded-lg px-3 py-2.5 text-base mb-3"
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
          )}
        </View>
      </View>
    </Modal>
  );
}
