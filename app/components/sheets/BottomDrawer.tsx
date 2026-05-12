import { useEffect, useRef, useState } from 'react'
import { Modal, View, Pressable, Animated, Dimensions } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { ReactNode } from 'react'

const SCREEN_HEIGHT = Dimensions.get('window').height

export default function BottomDrawer({
  visible,
  onClose,
  children,
}: {
  visible: boolean
  onClose: () => void
  children: ReactNode
}) {
  const [modalVisible, setModalVisible] = useState(false)
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current
  const { bottom } = useSafeAreaInsets()

  useEffect(() => {
    if (visible) {
      setModalVisible(true)
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start()
    } else if (modalVisible) {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setModalVisible(false))
    }
  }, [visible])

  if (!modalVisible) {
    return null
  }

  return (
    <Modal
      visible
      animationType="fade"
      backdropColor="rgba(0,0,0,0.5)"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView className="flex-1" behavior="padding">
          <View className="flex-1 justify-end">
            <Pressable className="flex-1" onPress={onClose} />

            <Animated.View
              className="bg-white dark:bg-neutral-900 rounded-t-2xl"
              style={{ paddingBottom: bottom, transform: [{ translateY: slideAnim }] }}
            >
              <View className="items-center pt-3 pb-1">
                <View className="w-10 h-1 rounded-full bg-gray-300 dark:bg-neutral-600" />
              </View>
              {children}
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  )
}
