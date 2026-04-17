import { Modal, View, Pressable } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { ReactNode } from "react";

export default function BottomDrawer({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 bg-black/50 justify-end">
          <Pressable className="flex-1" onPress={onClose} />
          <View className="bg-white dark:bg-neutral-900 rounded-t-2xl">
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-gray-300 dark:bg-neutral-600" />
            </View>
            {children}
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
