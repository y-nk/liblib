import { useCallback, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Alert,
  Platform,
  useColorScheme,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Settings } from 'lucide-react-native'
import { getBooks, removeBook, toggleFavorite } from '@/lib/data/books'
import Header from '@/components/Header'
import BookCard from '@/components/BookCard'
import SettingsSheet from '@/components/sheets/SettingsSheet'
import AddManuallySheet from '@/components/sheets/AddManuallySheet'
import SearchSheet from '@/components/sheets/SearchSheet'
import ActionToolbar from '@/components/ActionToolbar'
import BookDetailSheet from '@/components/sheets/BookDetailSheet'
import type { Book } from '@/lib/types'

export default function BooksScreen() {
  const [books, setBooks] = useState<Book[]>([])
  const [query, setQuery] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showAddManual, setShowAddManual] = useState(false)
  const [manualIsbn, setManualIsbn] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const dark = useColorScheme() === 'dark'

  const reload = async () => {
    const updated = await getBooks()
    setBooks(updated)
    setSelectedBook((prev) => (prev ? (updated.find((b) => b.isbn === prev.isbn) ?? null) : null))
  }

  const handleToggleFavorite = async (isbn: string) => {
    await toggleFavorite(isbn)
    reload()
  }

  useFocusEffect(
    useCallback(() => {
      reload()
    }, []),
  )

  const filtered = books.filter((b) => {
    const q = query.toLowerCase()
    return b.title.toLowerCase().includes(q) || b.isbn.includes(q)
  })

  const confirmDelete = (isbn: string, title: string) => {
    const doDelete = async () => {
      await removeBook(isbn)
      reload()
    }

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${title}"?`)) {
        doDelete()
      }
    } else {
      Alert.alert('Delete', `Delete "${title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ])
    }
  }

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <SafeAreaView className="flex-1 px-3">
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.isbn}
          numColumns={2}
          stickyHeaderIndices={[0]}
          ListHeaderComponent={
            <View className="py-3 bg-white dark:bg-neutral-950">
              <Header
                action={
                  <Pressable onPress={() => setShowSettings(true)} hitSlop={8}>
                    <Settings size={22} color={dark ? '#aaa' : '#666'} />
                  </Pressable>
                }
              >
                LibLib
              </Header>
              <TextInput
                className="mt-3 bg-gray-100 dark:bg-neutral-800 rounded-lg px-4 py-3 text-base dark:text-white"
                placeholder="Search by title or ISBN..."
                placeholderTextColor={dark ? '#666' : '#999'}
                value={query}
                onChangeText={setQuery}
              />
            </View>
          }
          ListEmptyComponent={
            <View className="items-center pt-20">
              <Text className="text-gray-400 text-base">
                {query ? 'No matches' : 'No books yet. Tap scan to add one.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <BookCard
              book={item}
              onPress={() => setSelectedBook(item)}
              onToggleFavorite={() => handleToggleFavorite(item.isbn)}
              onDelete={() => confirmDelete(item.isbn, item.title)}
            />
          )}
        />
      </SafeAreaView>

      <ActionToolbar
        onSearch={() => setShowSearch(true)}
        onAdd={() => {
          setManualIsbn('')
          setShowAddManual(true)
        }}
      />

      <BookDetailSheet
        book={selectedBook}
        visible={!!selectedBook}
        onClose={() => setSelectedBook(null)}
        onChanged={reload}
        onDelete={(isbn, title) => {
          setSelectedBook(null)
          confirmDelete(isbn, title)
        }}
      />

      <SettingsSheet visible={showSettings} onClose={() => setShowSettings(false)} />
      <AddManuallySheet
        visible={showAddManual}
        onClose={() => setShowAddManual(false)}
        onAdded={reload}
        initialIsbn={manualIsbn}
      />
      <SearchSheet
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        onAdded={reload}
        onManualFallback={(isbn) => {
          setManualIsbn(isbn)
          setShowAddManual(true)
        }}
      />
    </View>
  )
}
