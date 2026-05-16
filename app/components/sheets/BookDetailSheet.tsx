import { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
  useColorScheme,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Camera, Search, Trash2 } from 'lucide-react-native'
import BottomDrawer from './BottomDrawer'
import EditableTitle from '../EditableTitle'
import { updateBookTitle, updateBookNote, updateBookCover, removeBook } from '@/lib/data/books'
import { saveCoverFromDataUri, saveCoverFromUrl } from '@/lib/covers'
import { lookupISBN } from '@/lib/providers'
import type { Book } from '@/lib/types'

function formatRelativeTime(date?: Date | null) {
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
  const [showCoverMenu, setShowCoverMenu] = useState(false)
  const [searchingCover, setSearchingCover] = useState(false)
  const [coverRatio, setCoverRatio] = useState(3 / 4)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dark = useColorScheme() === 'dark'

  useEffect(() => {
    if (book?.cover) {
      Image.getSize(book.cover, (w, h) => setCoverRatio(w / h))
    } else {
      setCoverRatio(3 / 4)
    }
  }, [book?.cover])

  useEffect(() => {
    if (visible && book) {
      setNote(book.note ?? '')
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

  const handleCoverChange = useCallback(
    async (dataUri: string) => {
      if (!book) {
        return
      }

      const coverPath = await saveCoverFromDataUri(book.isbn, dataUri)
      await updateBookCover(book.isbn, coverPath)
      onChanged()
    },
    [book?.isbn, onChanged],
  )

  const searchCover = useCallback(async () => {
    if (!book) {
      return
    }

    setShowCoverMenu(false)
    setSearchingCover(true)

    try {
      const results = await lookupISBN(book.isbn)
      const match = results.find((r) => r.coverUrl)

      if (match?.coverUrl) {
        const localPath = await saveCoverFromUrl(book.isbn, match.coverUrl)
        await updateBookCover(book.isbn, localPath)
        onChanged()
      }
    } finally {
      setSearchingCover(false)
    }
  }, [book?.isbn, onChanged])

  const takePhoto = useCallback(async () => {
    setShowCoverMenu(false)

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.3,
      base64: true,
      allowsEditing: true,
    })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      const dataUri = asset.base64
        ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
        : asset.uri || ''
      await handleCoverChange(dataUri)
    }
  }, [handleCoverChange])

  const confirmDelete = useCallback(() => {
    if (!book) {
      return
    }

    const doDelete = async () => {
      await removeBook(book.isbn)
      onClose()
      onChanged()
    }

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${book.title}"?`)) {
        doDelete()
      }
    } else {
      Alert.alert('Delete', `Delete "${book.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ])
    }
  }, [book?.isbn, onClose, onChanged])

  if (!book) {
    return null
  }

  return (
    <BottomDrawer visible={visible} onClose={onClose}>
      <ScrollView className="px-4 pt-2 pb-6" style={{ maxHeight: 600 }}>
        <View className="items-center mb-4">
          <View className="relative">
            <Pressable onPress={() => setShowCoverMenu(true)}>
              {book.cover ? (
                <Image
                  source={{ uri: book.cover }}
                  className="rounded-lg bg-gray-200 dark:bg-neutral-700"
                  style={{ height: 256, aspectRatio: coverRatio }}
                  resizeMode="contain"
                />
              ) : (
                <View
                  className="w-48 rounded-lg bg-gray-200 dark:bg-neutral-700 items-center justify-center"
                  style={{ height: 256 }}
                >
                  <Camera size={24} color={dark ? '#666' : '#9ca3af'} />
                </View>
              )}

              {searchingCover && (
                <View className="absolute inset-0 rounded-lg bg-black/40 items-center justify-center">
                  <ActivityIndicator color="white" />
                </View>
              )}
            </Pressable>
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

        <Pressable
          onPress={confirmDelete}
          className="flex-row items-center justify-center py-3 mb-2"
        >
          <Trash2 size={16} color="#ef4444" />
          <Text className="text-red-500 text-sm font-medium ml-2">Delete this book</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={showCoverMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCoverMenu(false)}
      >
        <Pressable
          className="flex-1 justify-center items-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setShowCoverMenu(false)}
        >
          <View
            className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden"
            style={{ width: 260 }}
          >
            <Pressable onPress={searchCover} className="px-5 py-4 flex-row items-center">
              <Search size={18} color={dark ? '#ccc' : '#333'} />
              <Text className="text-base dark:text-white ml-3">Search the web</Text>
            </Pressable>

            <View className="h-px bg-gray-100 dark:bg-neutral-700" />

            <Pressable onPress={takePhoto} className="px-5 py-4 flex-row items-center">
              <Camera size={18} color={dark ? '#ccc' : '#333'} />
              <Text className="text-base dark:text-white ml-3">Take a photo</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </BottomDrawer>
  )
}
