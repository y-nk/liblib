import { useCallback, useState } from 'react'
import { View, Text, TextInput, ScrollView, Pressable, useColorScheme } from 'react-native'
import { useFocusEffect, Stack } from 'expo-router'
import { Plus } from 'lucide-react-native'
import { getShelves, createShelf } from '@/lib/data/shelves'
import type { Shelf } from '@/lib/data/shelves'
import CenterModal from '@/components/CenterModal'
import ShelfRow from '@/components/ShelfRow'
import ShelfDetailSheet from '@/components/sheets/ShelfDetailSheet'

export default function ShelvesScreen() {
  const [shelves, setShelves] = useState<Shelf[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null)
  const dark = useColorScheme() === 'dark'

  const load = () => {
    getShelves().then(setShelves)
    setRefreshKey((k) => k + 1)
  }

  useFocusEffect(
    useCallback(() => {
      load()
    }, []),
  )

  const handleCreate = async () => {
    const name = newName.trim()

    if (!name) {
      return
    }

    await createShelf(name)
    setNewName('')
    setShowCreate(false)
    load()
  }

  const rows = [
    { id: undefined as string | undefined, name: 'Mis-shelved books' },
    ...shelves.map((s) => ({ id: s.id, name: s.name })),
  ]

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950 px-3">
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => setShowCreate(true)} hitSlop={8}>
              <Plus size={24} color={dark ? '#aaa' : '#666'} />
            </Pressable>
          ),
        }}
      />

      <ScrollView>
        {rows.map((shelf) => (
          <ShelfRow
            key={shelf.id ?? 'unshelved'}
            shelfId={shelf.id}
            name={shelf.name}
            refreshKey={refreshKey}
            onLongPress={
              shelf.id
                ? () => setSelectedShelf(shelves.find((s) => s.id === shelf.id) ?? null)
                : undefined
            }
          />
        ))}
      </ScrollView>

      <CenterModal visible={showCreate} onClose={() => setShowCreate(false)}>
        <View className="p-5">
          <Text className="text-lg font-bold dark:text-white mb-4">New shelf</Text>

          <TextInput
            className="bg-gray-100 dark:bg-neutral-700 rounded-lg px-4 py-3 text-base dark:text-white mb-4"
            placeholder="Name"
            placeholderTextColor={dark ? '#666' : '#999'}
            value={newName}
            onChangeText={setNewName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />

          <View className="flex-row justify-end gap-3">
            <Pressable onPress={() => setShowCreate(false)} className="px-4 py-2">
              <Text className="text-gray-500 text-base">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleCreate}
              className="bg-black dark:bg-white rounded-lg px-4 py-2"
            >
              <Text className="text-white dark:text-black text-base font-medium">Create</Text>
            </Pressable>
          </View>
        </View>
      </CenterModal>

      <ShelfDetailSheet
        shelf={selectedShelf}
        visible={!!selectedShelf}
        onClose={() => setSelectedShelf(null)}
        onChanged={load}
      />
    </View>
  )
}
