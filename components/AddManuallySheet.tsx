import { useEffect, useState } from "react";
import {
  View, Text, TextInput, Pressable, Modal, Image, ActivityIndicator, Platform, useColorScheme,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Camera } from "lucide-react-native";
import { addBook } from "@/lib/storage";
import type { Book } from "@/lib/types";

const isWeb = Platform.OS === "web";

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
  const [showWebCam, setShowWebCam] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dark = useColorScheme() === "dark";

  useEffect(() => {
    if (visible) {
      setIsbn("");
      setTitle("");
      setCover("");
      setShowWebCam(false);
      setSaving(false);
      setError("");
    }
  }, [visible]);

  const setCoverFromAsset = (a: ImagePicker.ImagePickerAsset) => {
    setCover(a.base64 ? `data:${a.mimeType || "image/jpeg"};base64,${a.base64}` : a.uri);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) setCoverFromAsset(result.assets[0]);
  };

  const takePhoto = async () => {
    if (isWeb) {
      setShowWebCam(true);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) setCoverFromAsset(result.assets[0]);
  };

  const handleWebCapture = async (uri: string) => {
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
    setShowWebCam(false);
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
    <>
      {showWebCam && (
        <Modal visible animationType="slide" onRequestClose={() => setShowWebCam(false)}>
          <View className="flex-1 bg-black">
            <View className="flex-row justify-between items-center px-4 py-3">
              <Pressable onPress={() => setShowWebCam(false)}>
                <Text className="text-base text-white">Cancel</Text>
              </Pressable>
              <Text className="text-lg font-semibold text-white">Take Photo</Text>
              <View className="w-16" />
            </View>
            {!permission?.granted ? (
              <View className="flex-1 justify-center items-center px-6">
                <Text className="text-gray-400 text-center mb-4">Camera access needed</Text>
                <Pressable onPress={requestPermission} className="bg-white rounded-lg px-6 py-3">
                  <Text className="text-black font-semibold">Grant Permission</Text>
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
                <View className="flex-1 justify-end items-center pb-10">
                  <Pressable
                    onPress={async () => {
                      const cam = (globalThis as any).__cameraRef;
                      if (cam) {
                        const photo = await cam.takePictureAsync({ quality: 0.5 });
                        if (photo?.uri) handleWebCapture(photo.uri);
                      }
                    }}
                    className="w-16 h-16 rounded-full bg-white border-4 border-gray-300"
                  />
                </View>
              </CameraView>
            )}
          </View>
        </Modal>
      )}

      <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
        <View className="flex-1 bg-black/50 justify-end">
          <Pressable className="flex-1" onPress={onClose} />
          <View className="bg-white dark:bg-neutral-900 rounded-t-2xl">
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-gray-300 dark:bg-neutral-600" />
            </View>

            <View className="px-4 pt-4 pb-10">
              <Text className="text-xl font-bold mb-5 dark:text-white">Add Book</Text>

              <View className="flex-row mb-5">
                <View style={{ aspectRatio: 210 / 297 }}>
                  <Pressable
                    onPress={takePhoto}
                    onLongPress={pickImage}
                    className="flex-1 border border-dashed border-gray-300 dark:border-neutral-600 rounded-xl overflow-hidden items-center justify-center bg-gray-50 dark:bg-neutral-800"
                  >
                    {cover ? (
                      <Image source={{ uri: cover }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <>
                        <Camera size={24} color={dark ? "#666" : "#9ca3af"} />
                        <Text className="text-gray-400 text-xs mt-1">Hold: gallery</Text>
                      </>
                    )}
                  </Pressable>
                </View>

                <View className="flex-1 flex-col gap-4 ml-4 justify-center">
                  <TextInput
                    className="bg-gray-100 dark:bg-neutral-800 rounded-lg px-3 py-2.5 text-base dark:text-white"
                    placeholder="ISBN"
                    placeholderTextColor={dark ? "#666" : "#999"}
                    value={isbn}
                    onChangeText={setIsbn}
                    keyboardType="number-pad"
                    autoFocus
                  />
                  <TextInput
                    className="bg-gray-100 dark:bg-neutral-800 rounded-lg px-3 py-2.5 text-base dark:text-white"
                    placeholder="Title"
                    placeholderTextColor={dark ? "#666" : "#999"}
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
                className="bg-black dark:bg-white rounded-lg py-3"
              >
                {saving ? (
                  <ActivityIndicator color={dark ? "#000" : "#fff"} />
                ) : (
                  <Text className="text-white dark:text-black text-center font-semibold text-base">Add to Library</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
