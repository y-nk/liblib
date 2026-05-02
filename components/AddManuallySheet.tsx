import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from 'react-native'
import CenterModal from './CenterModal'
import CoverPicker from './CoverPicker'
import { Search } from 'lucide-react-native'
import { addBook } from '@/lib/data/books'
import { lookupISBN } from '@/lib/providers'
import { saveCoverFromDataUri, saveCoverFromUrl } from '@/lib/covers'
import type { Book } from '@/lib/types'

export default function AddManuallySheet({
  visible,
  onClose,
  onAdded,
  initialIsbn = '',
}: {
  visible: boolean
  onClose: () => void
  onAdded: () => void
  initialIsbn?: string
}) {
  const [isbn, setIsbn] = useState('')
  const [title, setTitle] = useState('')
  const [cover, setCover] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [searching, setSearching] = useState(false)
  const [picks, setPicks] = useState<Book[]>([])
  const dark = useColorScheme() === 'dark'
  const titleRef = useRef<TextInput>(null)

  useEffect(() => {
    if (visible) {
      setIsbn(initialIsbn)
      setTitle('')
      setCover('')
      setSaving(false)
      setError('')
      setSearching(false)
      setPicks([])
    }
  }, [visible])

  const handleSearch = async () => {
    const trimmed = isbn.trim()

    if (!trimmed) {
      return
    }

    setSearching(true)
    setError('')
    setPicks([])

    try {
      const results = await lookupISBN(trimmed)

      if (results.length === 0) {
        setError('Not found — fill in manually')
        setSearching(false)
      } else if (results.length === 1) {
        await prefillFromBook(results[0])
      } else {
        setPicks(results)
        setSearching(false)
      }
    } catch {
      setError('Lookup failed')
      setSearching(false)
    }
  }

  const prefillFromBook = async (book: Book) => {
    setTitle(book.title)
    const c = book.cover || book.coverUrl || ''

    if (c) {
      setCover(c)
    }

    setPicks([])
    setSearching(false)
    titleRef.current?.focus()
  }

  const handleSave = async () => {
    if (!isbn.trim() || !title.trim()) {
      setError('ISBN and title are required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const trimmedIsbn = isbn.trim()
      let coverPath = ''

      if (cover.startsWith('data:')) {
        coverPath = await saveCoverFromDataUri(trimmedIsbn, cover)
      } else if (cover.startsWith('http://') || cover.startsWith('https://')) {
        coverPath = await saveCoverFromUrl(trimmedIsbn, cover)
      } else if (cover.startsWith('file://')) {
        coverPath = cover
      }

      const book: Book = {
        isbn: trimmedIsbn,
        title: title.trim(),
        cover: coverPath,
        tags: [],
        createdAt: new Date(),
      }

      await addBook(book)
      setSaving(false)
      onAdded()
      onClose()
    } catch (e) {
      console.log('[manual-add] save failed:', e)
      setSaving(false)
      setError('Failed to save')
    }
  }

  if (!visible) {
    return null
  }

  return (
    <CenterModal visible={visible} onClose={onClose}>
      {picks.length > 0 ? (
        <ScrollView className="p-4" style={{ maxHeight: 400 }}>
          <Text className="text-gray-400 text-center mb-4">Pick the correct book:</Text>

          {picks.map((book, i) => (
            <Pressable
              key={i}
              onPress={() => prefillFromBook(book)}
              className="flex-row items-center bg-gray-100 dark:bg-neutral-800 rounded-xl p-3 mb-3"
            >
              {book.cover || book.coverUrl ? (
                <Image
                  source={{ uri: book.cover || book.coverUrl }}
                  className="w-12 h-16 rounded bg-gray-200 dark:bg-neutral-700"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-12 h-16 rounded bg-gray-200 dark:bg-neutral-700" />
              )}

              <View className="flex-1 ml-3">
                <Text className="text-base font-medium dark:text-white" numberOfLines={2}>
                  {book.title}
                </Text>
              </View>
            </Pressable>
          ))}

          <Pressable onPress={() => setPicks([])} className="mt-1 mb-6">
            <Text className="text-gray-500 text-center text-sm">None of these</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <View className="p-5">
          <Text className="text-xl font-bold mb-5 dark:text-white">Add Book</Text>

          <View className="flex-row mb-5">
            <CoverPicker value={cover} onChange={setCover} />

            <View className="flex-1 flex-col gap-4 ml-4 justify-center">
              <View
                className="flex-row items-center bg-gray-100 dark:bg-neutral-800 rounded-lg"
                style={{ overflow: 'hidden' }}
              >
                <TextInput
                  className="flex-1 px-3 py-2.5 text-base dark:text-white"
                  // @ts-ignore — web: remove default focus outline
                  style={{ outlineStyle: 'none' }}
                  placeholder="ISBN"
                  placeholderTextColor={dark ? '#666' : '#999'}
                  value={isbn}
                  onChangeText={setIsbn}
                  keyboardType="number-pad"
                  autoFocus={!initialIsbn}
                />

                {isbn.trim().length > 0 && (
                  <Pressable onPress={handleSearch} disabled={searching} className="pr-3">
                    {searching ? (
                      <ActivityIndicator size="small" color={dark ? '#666' : '#9ca3af'} />
                    ) : (
                      <Search size={18} color={dark ? '#666' : '#9ca3af'} />
                    )}
                  </Pressable>
                )}
              </View>

              <TextInput
                ref={titleRef}
                className="bg-gray-100 dark:bg-neutral-800 rounded-lg px-3 py-2.5 text-base dark:text-white"
                placeholder="Title"
                placeholderTextColor={dark ? '#666' : '#999'}
                autoFocus={!!initialIsbn}
                value={title}
                onChangeText={setTitle}
              />
            </View>
          </View>

          {error ? <Text className="text-red-500 text-sm text-center mb-3">{error}</Text> : null}

          <Pressable
            onPress={handleSave}
            disabled={saving}
            className="bg-black dark:bg-white rounded-lg py-3"
          >
            {saving ? (
              <ActivityIndicator color={dark ? '#000' : '#fff'} />
            ) : (
              <Text className="text-white dark:text-black text-center font-semibold text-base">
                Add to Library
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </CenterModal>
  )
}
