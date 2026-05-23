import { useCallback, useState } from 'react'
import { View, ScrollView } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { getShelves } from '@/lib/data/shelves'
import type { Shelf } from '@/lib/data/shelves'
import ShelfRow from '@/components/ShelfRow'

export default function ShelvesScreen() {
  const [shelves, setShelves] = useState<Shelf[]>([])

  useFocusEffect(
    useCallback(() => {
      getShelves().then(setShelves)
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
