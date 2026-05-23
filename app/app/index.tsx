import { useCallback, useState } from 'react'
import { View, Text, FlatList, Pressable, useColorScheme } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronRight } from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getShelves, createShelf } from '@/lib/data/shelves'
import type { Shelf } from '@/lib/data/shelves'
import Header from '@/components/Header'

const INITIALIZED_KEY = 'shelves_initialized'

export default function ShelvesScreen() {
  const [shelves, setShelves] = useState<Shelf[]>([])
  const dark = useColorScheme() === 'dark'

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

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <SafeAreaView className="flex-1 px-3">
        <FlatList
          data={shelves}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            <View className="py-3">
              <Header>Shelves</Header>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable className="flex-row items-center py-4 px-2">
              <View className="flex-1">
                <Text className="text-base font-bold dark:text-white">{item.name}</Text>
                <Text className="text-sm text-gray-400 mt-0.5">0 books</Text>
              </View>
              <ChevronRight size={20} color={dark ? '#666' : '#999'} />
            </Pressable>
          )}
        />
      </SafeAreaView>
    </View>
  )
}
