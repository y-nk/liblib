import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, Image, ScrollView, useColorScheme } from 'react-native'
import BottomDrawer from './BottomDrawer'
import FavoriteButton from './FavoriteButton'
import EditableTitle from './EditableTitle'
import { toggleFavorite, updateBookTitle, updateBookNote } from '@/lib/data/books'
import type { Book } from '@/lib/types'

function formatRelativeTime(date?: Date) {
  if (!date) {
    return 'never'
  }

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) {
    return 'just now'
  }

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)

  return `${days}d ago`
}

export default function BookDetailSheet({
  book,
  visible,
  onClose,
  onChanged,
}: {
  book: Book | null
  visible: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const [note, setNote] = useState('')
  const [favorite, setFavorite] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dark = useColorScheme() === 'dark'

  useEffect(() => {
    if (visible && book) {
      setNote(book.note ?? '')
      setFavorite(!!book.favorite)
    }
  }, [visible, book?.isbn])

  const handleTitleSave = useCallback(
    async (title: string) => {
      if (!book) {
        return
      }

      await updateBookTitle(book.isbn, title)
      onChanged()
    },
    [book?.isbn, onChanged],
  )

  const handleNoteChange = useCallback(
    (text: string) => {
      setNote(text)

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(async () => {
        if (book) {
          await updateBookNote(book.isbn, text)
          onChanged()
        }
      }, 500)
    },
    [book?.isbn, onChanged],
  )

  const handleToggleFavorite = useCallback(async () => {
    if (!book) {
      return
    }

    setFavorite((prev) => !prev)
    await toggleFavorite(book.isbn)
    onChanged()
  }, [book?.isbn, onChanged])

  if (!book) {
    return null
  }

  return (
    <BottomDrawer visible={visible} onClose={onClose}>
      <ScrollView className="px-4 pt-2 pb-6" style={{ maxHeight: 600 }}>
        <View className="items-center mb-4">
          <View className="relative">
            {book.cover ? (
              <Image
                source={{ uri: book.cover }}
                className="w-48 h-64 rounded-lg bg-gray-200 dark:bg-neutral-700"
                resizeMode="cover"
              />
            ) : (
              <View className="w-48 h-64 rounded-lg bg-gray-200 dark:bg-neutral-700 items-center justify-center">
                <Text className="text-gray-400">No cover</Text>
              </View>
            )}

            <View className="absolute top-1 right-1">
              <FavoriteButton active={favorite} onToggle={handleToggleFavorite} size={24} />
            </View>
          </View>

          <View
            className="mt-1 bg-black/20 rounded-full"
            style={{ width: 120, height: 6, filter: 'blur(4px)' }}
          />
        </View>

        <Text className="text-xs text-gray-400 mb-1" style={{ fontFamily: 'monospace' }}>
          ISBN: {book.isbn}
        </Text>

        <View className="mb-4">
          <EditableTitle value={book.title} onSave={handleTitleSave} />
        </View>

        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Notes</Text>

        <TextInput
          className="bg-gray-100 dark:bg-neutral-800 rounded-lg px-4 py-3 text-base dark:text-white mb-6"
          placeholder="Add a personal note..."
          placeholderTextColor={dark ? '#666' : '#999'}
          value={note}
          onChangeText={handleNoteChange}
          multiline
          style={{ minHeight: 100, textAlignVertical: 'top' }}
        />

        <View className="mb-4">
          <Text className="text-xs text-gray-400 text-center">
            Last updated: {formatRelativeTime(book.updatedAt)}
          </Text>

          <Text className="text-xs text-gray-400 text-center mt-0.5">
            Last synced: {formatRelativeTime(book.syncedAt)}
          </Text>
        </View>
      </ScrollView>
    </BottomDrawer>
  )
}
