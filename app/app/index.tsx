import { useCallback, useState } from 'react'
import { View, ScrollView } from 'react-native'
import { useFocusEffect } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getShelves, createShelf } from '@/lib/data/shelves'
import type { Shelf } from '@/lib/data/shelves'
import ShelfRow from '@/components/ShelfRow'

const INITIALIZED_KEY = 'shelves_initialized'

export default function ShelvesScreen() {
  const [shelves, setShelves] = useState<Shelf[]>([])

  const load = async () => {
    const initialized = await AsyncStorage.getItem(INITIALIZED_KEY)

    if (!initialized) {
      const existing = await getShelves()

      if (existing.length === 0) {
        await createShelf('Default')
      }

      await AsyncStorage.setItem(INITIALIZED_KEY, '1')
    }

    setShelves(await getShelves())
  }

  useFocusEffect(
    useCallback(() => {
      load()
    }, []),
  )

  const rows = [
    { id: undefined, name: 'Mis-shelved books' },
    ...shelves.map((s) => ({ id: String(s.id), name: s.name })),
  ]

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950 px-3">
      <ScrollView>
        {rows.map((shelf) => (
          <ShelfRow key={shelf.id ?? 'unshelved'} shelfId={shelf.id} name={shelf.name} />
        ))}
      </ScrollView>
    </View>
  )
}
