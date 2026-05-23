import { useCallback, useState } from 'react'
import { View, Text, Pressable, useColorScheme } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { getBookCount } from '@/lib/data/books'

export default function ShelfRow({ shelfId, name }: { shelfId: string | undefined; name: string }) {
  const [count, setCount] = useState(0)
  const dark = useColorScheme() === 'dark'
  const router = useRouter()

  useFocusEffect(
    useCallback(() => {
      getBookCount(shelfId).then(setCount)
    }, [shelfId]),
  )

  return (
    <Pressable
      onPress={() => router.push(shelfId ? `/books?shelfId=${shelfId}` : '/books')}
      className="flex-row items-center py-4 px-2"
    >
      <View className="flex-1">
        <Text className="text-base font-bold dark:text-white">{name}</Text>
        <Text className="text-sm text-gray-400 mt-0.5">
          {count} {count === 1 ? 'book' : 'books'}
        </Text>
      </View>
      <ChevronRight size={20} color={dark ? '#666' : '#999'} />
    </Pressable>
  )
}
