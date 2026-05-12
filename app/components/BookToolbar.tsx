import { useState } from 'react'
import { View, Text, Pressable, useColorScheme } from 'react-native'
import { Star, EllipsisVertical, Trash2 } from 'lucide-react-native'
import BottomDrawer from './sheets/BottomDrawer'

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
    <View className="flex-row items-center rounded-bl-lg bg-white dark:bg-neutral-950 p-1">
      <Pressable onPress={onToggleFavorite} className="p-1" hitSlop={4}>
        <Star size={size} color="#facc15" fill={favorite ? '#facc15' : 'transparent'} />
      </Pressable>

      <Pressable onPress={() => setShowMenu(true)} className="p-1" hitSlop={4}>
        <EllipsisVertical size={size} color={dark ? '#aaa' : '#666'} />
      </Pressable>

      <BottomDrawer visible={showMenu} onClose={() => setShowMenu(false)}>
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
      </BottomDrawer>
    </View>
  )
}
