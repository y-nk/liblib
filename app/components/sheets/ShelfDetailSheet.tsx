import { useCallback } from 'react'
import { View, Text, Pressable, Alert, Platform } from 'react-native'
import { Trash2 } from 'lucide-react-native'
import BottomDrawer from './BottomDrawer'
import EditableTitle from '../EditableTitle'
import { updateShelfName, deleteShelf } from '@/lib/data/shelves'
import type { Shelf } from '@/lib/data/shelves'

export default function ShelfDetailSheet({
  shelf,
  visible,
  onClose,
  onChanged,
}: {
  shelf: Shelf
  visible: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const handleNameSave = useCallback(
    async (name: string) => {
      await updateShelfName(shelf.id, name)
      onChanged()
    },
    [shelf.id, onChanged],
  )

  const confirmDelete = useCallback(() => {
    const doDelete = async () => {
      await deleteShelf(shelf.id)
      onClose()
      onChanged()
    }

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${shelf.name}"? Books will be moved to mis-shelved.`)) {
        doDelete()
      }
    } else {
      Alert.alert('Delete shelf', `Delete "${shelf.name}"? Books will be moved to mis-shelved.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ])
    }
  }, [shelf.id, onClose, onChanged])

  return (
    <BottomDrawer visible={visible} onClose={onClose}>
      <View className="px-4 pt-2 pb-6">
        <View className="mb-6">
          <EditableTitle value={shelf.name} onSave={handleNameSave} />
        </View>

        <Text className="text-xs text-gray-400 text-center mb-6">
          Last synced: {shelf.syncedAt ? new Date(shelf.syncedAt).toLocaleString() : 'never'}
        </Text>

        <Pressable onPress={confirmDelete} className="flex-row items-center justify-center py-3">
          <Trash2 size={16} color="#ef4444" />
          <Text className="text-red-500 text-sm font-medium ml-2">Delete this shelf</Text>
        </Pressable>
      </View>
    </BottomDrawer>
  )
}
