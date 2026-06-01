import { useEffect, useRef, useState } from 'react'
import { View, Pressable, useColorScheme } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Stack } from 'expo-router'
import { Settings } from 'lucide-react-native'
import BookList from '@/components/BookList'
import type { BookListRef } from '@/components/BookList'
import SettingsSheet from '@/components/sheets/SettingsSheet'
import AddManuallySheet from '@/components/sheets/AddManuallySheet'
import SearchSheet from '@/components/sheets/SearchSheet'
import EnableSyncSheet from '@/components/sheets/EnableSyncSheet'
import ActionToolbar from '@/components/ActionToolbar'
import BookDetailSheet from '@/components/sheets/BookDetailSheet'
import SyncButton from '@/components/SyncButton'
import { getShelfName } from '@/lib/data/shelves'
import { useSyncVersion } from '@/lib/cloud/SyncProvider'
import type { Book } from '@/lib/types'

export default function BooksScreen() {
  const { shelfId } = useLocalSearchParams<{ shelfId?: string }>()
  const [showSettings, setShowSettings] = useState(false)
  const [showAddManual, setShowAddManual] = useState(false)
  const [manualIsbn, setManualIsbn] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showEnableSync, setShowEnableSync] = useState(false)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [title, setTitle] = useState('')
  const listRef = useRef<BookListRef>(null)
  const dark = useColorScheme() === 'dark'
  const syncVersion = useSyncVersion()

  useEffect(() => {
    getShelfName(shelfId).then(setTitle)
  }, [shelfId])

  const reload = async () => {
    const updated = await listRef.current?.reload()

    if (updated) {
      setSelectedBook((prev) => (prev ? (updated.find((b) => b.isbn === prev.isbn) ?? null) : null))
    }
  }

  // Reload the list + title after a sync from any source so pulled changes
  // show without navigating away. Skip the mount value (initial load is
  // handled above) and react only to subsequent bumps.
  const mountedSyncVersion = useRef(syncVersion)

  useEffect(() => {
    if (syncVersion === mountedSyncVersion.current) {
      return
    }

    getShelfName(shelfId).then(setTitle)
    listRef.current?.reload()
  }, [syncVersion, shelfId])

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <Stack.Screen
        options={{
          title,
          headerRight: () => (
            <View className="flex-row items-center">
              <SyncButton onRequestEnable={() => setShowEnableSync(true)} />
              <Pressable onPress={() => setShowSettings(true)} hitSlop={8}>
                <Settings size={22} color={dark ? '#aaa' : '#666'} />
              </Pressable>
            </View>
          ),
        }}
      />

      <View className="flex-1 px-4">
        <BookList ref={listRef} shelfId={shelfId} onSelectBook={setSelectedBook} />
      </View>

      <ActionToolbar
        shelfId={shelfId}
        onSearch={() => setShowSearch(true)}
        onAdd={() => {
          setManualIsbn('')
          setShowAddManual(true)
        }}
      />

      {selectedBook ? (
        <BookDetailSheet
          book={selectedBook}
          visible
          onClose={() => setSelectedBook(null)}
          onChanged={reload}
        />
      ) : null}

      <SettingsSheet visible={showSettings} onClose={() => setShowSettings(false)} />
      <EnableSyncSheet visible={showEnableSync} onClose={() => setShowEnableSync(false)} />
      <AddManuallySheet
        visible={showAddManual}
        onClose={() => setShowAddManual(false)}
        onAdded={reload}
        initialIsbn={manualIsbn}
        shelfId={shelfId}
      />
      <SearchSheet
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        onAdded={reload}
        shelfId={shelfId}
        onManualFallback={(isbn) => {
          setManualIsbn(isbn)
          setShowAddManual(true)
        }}
      />
    </View>
  )
}
