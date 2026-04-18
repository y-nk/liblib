import { Pressable, View, useColorScheme } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScanBarcode, Plus, Search } from "lucide-react-native";

export default function ActionToolbar({
  onSearch,
  onAdd,
}: {
  onSearch: () => void;
  onAdd: () => void;
}) {
  const router = useRouter();
  const dark = useColorScheme() === "dark";
  const { bottom } = useSafeAreaInsets();

  return (
    <View className="absolute right-5 items-center" style={{ bottom: bottom + 16 }}>
      <Pressable
        onPress={onSearch}
        className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-full p-3 shadow mb-3"
      >
        <Search size={20} color={dark ? "#fff" : "#000"} />
      </Pressable>
      <Pressable
        onPress={onAdd}
        className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-full p-3 shadow mb-5"
      >
        <Plus size={20} color={dark ? "#fff" : "#000"} />
      </Pressable>
      <Pressable
        onPress={() => router.push("/scan")}
        className="bg-black dark:bg-white rounded-full p-5 shadow-lg"
      >
        <ScanBarcode size={28} color={dark ? "#000" : "#fff"} />
      </Pressable>
    </View>
  );
}
