import { Pressable } from 'react-native'
import { Star } from 'lucide-react-native'

export default function FavoriteButton({
  active,
  onToggle,
  size = 20,
}: {
  active?: boolean
  onToggle: () => void
  size?: number
}) {
  return (
    <Pressable onPress={onToggle} className="p-2" hitSlop={8}>
      <Star size={size} color="#facc15" fill={active ? '#facc15' : 'transparent'} />
    </Pressable>
  )
}
