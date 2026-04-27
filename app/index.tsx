import { useCallback, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  Pressable,
  Alert,
  Platform,
  useColorScheme,
  Animated,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Settings } from 'lucide-react-native'
import * as Clipboard from 'expo-clipboard'
import { getBooks, removeBook, toggleFavorite } from '@/lib/data/books'
import FavoriteButton from '@/components/FavoriteButton'
import Header from '@/components/Header'
import SwipeableRow from '@/components/SwipeableRow'
import SettingsSheet from '@/components/SettingsSheet'
import AddManuallySheet from '@/components/AddManuallySheet'
import SearchSheet from '@/components/SearchSheet'
import ActionToolbar from '@/components/ActionToolbar'
import BookDetailSheet from '@/components/BookDetailSheet'
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
  const toastOpacity = useRef(new Animated.Value(0)).current

  const reload = () => getBooks().then(setBooks)

  const copyIsbn = async (isbn: string) => {
    await Clipboard.setStringAsync(isbn)

    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start()
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
      const updated = await getBooks()
      setBooks(updated)
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
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="items-center pt-20">
              <Text className="text-gray-400 text-base">
                {query ? 'No matches' : 'No books yet. Tap scan to add one.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <SwipeableRow onDelete={() => confirmDelete(item.isbn, item.title)}>
              <Pressable
                onPress={() => setSelectedBook(item)}
                onLongPress={() => copyIsbn(item.isbn)}
                delayLongPress={150}
                className="flex-row items-center p-3 mb-2 rounded-xl bg-gray-100 dark:bg-neutral-800"
              >
                {item.cover ? (
                  <Image
                    source={{ uri: item.cover }}
                    className="w-16 h-22 rounded-lg bg-gray-200 dark:bg-neutral-700"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-16 h-22 rounded-lg bg-gray-200 dark:bg-neutral-700 items-center justify-center">
                    <Text className="text-gray-400 text-xs">No img</Text>
                  </View>
                )}

                <View className="flex-1 ml-3">
                  <Text className="text-base font-semibold dark:text-white" numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text className="text-sm text-gray-400 mt-1">{item.isbn}</Text>
                </View>

                <FavoriteButton
                  active={item.favorite}
                  onToggle={() => handleToggleFavorite(item.isbn)}
                />
              </Pressable>
            </SwipeableRow>
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

      <Animated.View
        pointerEvents="none"
        className="absolute bottom-28 left-0 right-0 items-center"
        style={{ opacity: toastOpacity }}
      >
        <View className="bg-neutral-800 dark:bg-neutral-200 rounded-full px-5 py-2">
          <Text className="text-white dark:text-black text-sm font-medium">ISBN copied</Text>
        </View>
      </Animated.View>

      <BookDetailSheet
        book={selectedBook}
        visible={!!selectedBook}
        onClose={() => setSelectedBook(null)}
        onChanged={reload}
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
