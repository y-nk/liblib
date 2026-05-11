import { useState } from 'react'
import { View, Text, Pressable, Modal, useColorScheme } from 'react-native'
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

  return (
    <View className="flex-row items-center">
      <Pressable onPress={onToggleFavorite} className="p-1" hitSlop={4}>
        <Star size={size} color="#facc15" fill={favorite ? '#facc15' : 'transparent'} />
      </Pressable>

      <Pressable onPress={() => setShowMenu(true)} className="p-1" hitSlop={4}>
        <EllipsisVertical size={size} color={dark ? '#aaa' : '#666'} />
      </Pressable>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          className="flex-1 justify-center items-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setShowMenu(false)}
        >
          <View
            className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden"
            style={{ width: 200 }}
          >
            <Pressable
              onPress={() => {
                setShowMenu(false)
                onDelete()
              }}
              className="px-4 py-3 flex-row items-center"
            >
              <Trash2 size={16} color="#ef4444" />
              <Text className="text-red-500 text-base ml-3">Delete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}
