import { Modal, View, Pressable } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import type { ReactNode } from 'react'

export default function CenterModal({
  visible,
  onClose,
  children,
}: {
  visible: boolean
  onClose: () => void
  children: ReactNode
}) {
  if (!visible) {
    return null
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView className="flex-1" behavior="padding">
        <Pressable className="flex-1 bg-black/50 justify-center px-6" onPress={onClose}>
          <Pressable onPress={() => {}}>
            <View className="bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden">
              {children}
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}
