import { useRef, useState } from 'react'
import { View, Pressable, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Settings } from 'lucide-react-native'
import Header from '@/components/Header'
import BookList from '@/components/BookList'
import type { BookListRef } from '@/components/BookList'
import SettingsSheet from '@/components/sheets/SettingsSheet'
import AddManuallySheet from '@/components/sheets/AddManuallySheet'
import SearchSheet from '@/components/sheets/SearchSheet'
import ActionToolbar from '@/components/ActionToolbar'
import BookDetailSheet from '@/components/sheets/BookDetailSheet'
import type { Book } from '@/lib/types'

export default function BooksScreen() {
  const [showSettings, setShowSettings] = useState(false)
  const [showAddManual, setShowAddManual] = useState(false)
  const [manualIsbn, setManualIsbn] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const listRef = useRef<BookListRef>(null)
  const dark = useColorScheme() === 'dark'

  const reload = async () => {
    const updated = await listRef.current?.reload()

    if (updated) {
      setSelectedBook((prev) => (prev ? (updated.find((b) => b.isbn === prev.isbn) ?? null) : null))
    }
  }

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <SafeAreaView className="flex-1 px-3">
        <BookList
          ref={listRef}
          header={
            <Header
              action={
                <Pressable onPress={() => setShowSettings(true)} hitSlop={8}>
                  <Settings size={22} color={dark ? '#aaa' : '#666'} />
                </Pressable>
              }
            >
              LibLib
            </Header>
          }
          onSelectBook={setSelectedBook}
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
