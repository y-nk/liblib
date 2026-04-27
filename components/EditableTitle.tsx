import { useState, useRef } from 'react'
import { View, Text, TextInput, Pressable, useColorScheme } from 'react-native'
import { Pencil } from 'lucide-react-native'

export default function EditableTitle({
  value,
  onSave,
}: {
  value: string
  onSave: (title: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<TextInput>(null)
  const dark = useColorScheme() === 'dark'

  const startEditing = () => {
    setDraft(value)
    setEditing(true)

    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleBlur = () => {
    setEditing(false)
    const trimmed = draft.trim()

    if (trimmed && trimmed !== value) {
      onSave(trimmed)
    }
  }

  if (editing) {
    return (
      <TextInput
        ref={inputRef}
        className="text-2xl font-bold dark:text-white"
        value={draft}
        onChangeText={setDraft}
        onBlur={handleBlur}
        multiline
        autoFocus
      />
    )
  }

  return (
    <Pressable onPress={startEditing} className="flex-row items-start">
      <Text className="text-2xl font-bold dark:text-white flex-1">{value}</Text>

      <View className="ml-2 mt-1">
        <Pencil size={18} color={dark ? '#666' : '#9ca3af'} />
      </View>
    </Pressable>
  )
}
