import { View, Text, Image, Pressable } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import type { Book } from '@/lib/types'

const COVER_ASPECT = 3 / 4

export default function BookCard({ book, onPress }: { book: Book; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => Clipboard.setStringAsync(book.isbn)}
      delayLongPress={150}
      className="flex-1 p-1.5"
    >
      {book.cover ? (
        <Image
          source={{ uri: book.cover }}
          className="w-full rounded-lg bg-gray-200 dark:bg-neutral-700"
          style={{ aspectRatio: COVER_ASPECT }}
          resizeMode="cover"
        />
      ) : (
        <View
          className="w-full rounded-lg bg-gray-200 dark:bg-neutral-700 items-center justify-center"
          style={{ aspectRatio: COVER_ASPECT }}
        >
          <Text className="text-gray-400 text-xs">No cover</Text>
        </View>
      )}

      <Text className="text-sm font-semibold dark:text-white mt-1.5" numberOfLines={2}>
        {book.title}
      </Text>

      <Text className="text-xs text-gray-400 mt-0.5">{book.isbn}</Text>
    </Pressable>
  )
}
