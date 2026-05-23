import { useRef, useState } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import BookList from '@/components/BookList'
import type { BookListRef } from '@/components/BookList'
import SettingsSheet from '@/components/sheets/SettingsSheet'
import AddManuallySheet from '@/components/sheets/AddManuallySheet'
import SearchSheet from '@/components/sheets/SearchSheet'
import ActionToolbar from '@/components/ActionToolbar'
import BookDetailSheet from '@/components/sheets/BookDetailSheet'
import type { Book } from '@/lib/types'

export default function BooksScreen() {
  const { shelfId } = useLocalSearchParams<{ shelfId?: string }>()
  const [showSettings, setShowSettings] = useState(false)
  const [showAddManual, setShowAddManual] = useState(false)
  const [manualIsbn, setManualIsbn] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const listRef = useRef<BookListRef>(null)

  const reload = async () => {
    const updated = await listRef.current?.reload()

    if (updated) {
      setSelectedBook((prev) => (prev ? (updated.find((b) => b.isbn === prev.isbn) ?? null) : null))
    }
  }

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <View className="flex-1 px-3">
        <BookList ref={listRef} shelfId={shelfId} onSelectBook={setSelectedBook} />
      </View>

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
