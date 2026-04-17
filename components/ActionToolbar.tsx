import { Pressable, View, useColorScheme } from "react-native";
import { useRouter } from "expo-router";
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

  return (
    <View className="absolute bottom-8 right-5 items-center gap-3">
      <Pressable
        onPress={onSearch}
        className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-full p-3 shadow"
      >
        <Search size={20} color={dark ? "#fff" : "#000"} />
      </Pressable>
      <Pressable
        onPress={onAdd}
        className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-full p-3 shadow"
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
