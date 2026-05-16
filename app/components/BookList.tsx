import { useCallback, useImperativeHandle, useState, forwardRef } from 'react'
import { View, Text, TextInput, FlatList, useColorScheme } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { getBooks } from '@/lib/data/books'
import BookCard from './BookCard'
import type { Book } from '@/lib/types'

export type BookListRef = {
  reload: () => Promise<Book[]>
}

export default forwardRef<
  BookListRef,
  {
    header: React.ReactNode
    onSelectBook: (book: Book) => void
  }
>(function BookList({ header, onSelectBook }, ref) {
  const [books, setBooks] = useState<Book[]>([])
  const [query, setQuery] = useState('')
  const dark = useColorScheme() === 'dark'

  const reload = async () => {
    const updated = await getBooks()
    setBooks(updated)

    return updated
  }

  useImperativeHandle(ref, () => ({ reload }))

  useFocusEffect(
    useCallback(() => {
      reload()
    }, []),
  )

  const filtered = books.filter((b) => {
    const q = query.toLowerCase()

    return b.title.toLowerCase().includes(q) || b.isbn.includes(q)
  })

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.isbn}
      numColumns={2}
      stickyHeaderIndices={[0]}
      ListHeaderComponent={
        <View className="py-3 bg-white dark:bg-neutral-950">
          {header}
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
      renderItem={({ item }) => <BookCard book={item} onPress={() => onSelectBook(item)} />}
    />
  )
})
