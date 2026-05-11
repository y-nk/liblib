import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import type { ReactNode } from 'react'

export default function Header({
  children,
  action,
  withBackButton,
}: {
  children: ReactNode
  action?: ReactNode
  withBackButton?: boolean
}) {
  const router = useRouter()

  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center flex-1">
        {withBackButton && (
          <Pressable onPress={() => router.back()} className="mr-2" hitSlop={8}>
            <ChevronLeft size={24} color="#000" />
          </Pressable>
        )}
        <Text className="text-2xl font-bold dark:text-white">{children}</Text>
      </View>
      {action && <View>{action}</View>}
    </View>
  )
}
