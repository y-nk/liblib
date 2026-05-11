import { useState } from 'react'
import { View, Text, Pressable, Modal, useColorScheme } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Star, EllipsisVertical, Trash2 } from 'lucide-react-native'

export default function BookToolbar({
  favorite,
  onToggleFavorite,
  onDelete,
  size = 18,
}: {
  favorite?: boolean
  onToggleFavorite: () => void
  onDelete: () => void
  size?: number
}) {
  const [showMenu, setShowMenu] = useState(false)
  const dark = useColorScheme() === 'dark'
  const { bottom } = useSafeAreaInsets()

  return (
    <View className="flex-row items-center rounded-bl-lg bg-white dark:bg-neutral-950 p-1">
      <Pressable onPress={onToggleFavorite} className="p-1" hitSlop={4}>
        <Star size={size} color="#facc15" fill={favorite ? '#facc15' : 'transparent'} />
      </Pressable>

      <Pressable onPress={() => setShowMenu(true)} className="p-1" hitSlop={4}>
        <EllipsisVertical size={size} color={dark ? '#aaa' : '#666'} />
      </Pressable>

      <Modal
        visible={showMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMenu(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <Pressable className="flex-1" onPress={() => setShowMenu(false)} />

          <View
            className="bg-white dark:bg-neutral-900 rounded-t-2xl"
            style={{ paddingBottom: bottom }}
          >
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-gray-300 dark:bg-neutral-600" />
            </View>

            <Pressable
              onPress={() => {
                setShowMenu(false)
                onDelete()
              }}
              className="flex-row items-center px-5 py-4"
            >
              <Trash2 size={18} color="#ef4444" />
              <Text className="text-red-500 text-base font-medium ml-3">Delete</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}
