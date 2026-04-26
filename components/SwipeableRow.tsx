import { useRef } from 'react'
import { Text, Pressable } from 'react-native'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import { Trash2 } from 'lucide-react-native'
import type { ReactNode } from 'react'

type SwipeableRef = { close: () => void }

export default function SwipeableRow({
  children,
  onDelete,
}: {
  children: ReactNode
  onDelete: () => void
}) {
  const swipeableRef = useRef<SwipeableRef>(null)

  const handleDelete = () => {
    swipeableRef.current?.close()
    onDelete()
  }

  return (
    <ReanimatedSwipeable
      ref={swipeableRef as any}
      renderRightActions={() => (
        <Pressable onPress={handleDelete} className="bg-red-500 justify-center items-center px-5">
          <Trash2 size={20} color="#fff" />
          <Text className="text-white text-xs mt-1">Delete</Text>
        </Pressable>
      )}
      rightThreshold={40}
      overshootRight={false}
    >
      {children}
    </ReanimatedSwipeable>
  )
}
