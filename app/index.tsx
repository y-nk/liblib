import { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  Pressable,
  Alert,
  Platform,
  useColorScheme,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Settings, ScanBarcode, Plus, Search } from "lucide-react-native";
import { getBooks, removeBook } from "@/lib/storage";
import SettingsSheet from "@/components/SettingsSheet";
import AddManuallySheet from "@/components/AddManuallySheet";
import SearchSheet from "@/components/SearchSheet";
import type { Book } from "@/lib/types";

export default function BooksScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showAddManual, setShowAddManual] = useState(false);
  const [manualIsbn, setManualIsbn] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const router = useRouter();
  const dark = useColorScheme() === "dark";

  const reload = () => getBooks().then(setBooks);

  useFocusEffect(useCallback(() => { reload(); }, []));

  const filtered = books.filter((b) => {
    const q = query.toLowerCase();
    return b.title.toLowerCase().includes(q) || b.isbn.includes(q);
  });

  const confirmDelete = (isbn: string, title: string) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${title}"?`)) {
        removeBook(isbn).then(reload);
      }
    } else {
      Alert.alert("Delete", `Delete "${title}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => removeBook(isbn).then(reload) },
      ]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <View className="px-4 pt-2 pb-3">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold dark:text-white">LibLib</Text>
          <Pressable onPress={() => setShowSettings(true)} hitSlop={8}>
            <Settings size={22} color={dark ? "#aaa" : "#666"} />
          </Pressable>
        </View>
        <TextInput
          className="bg-gray-100 dark:bg-neutral-800 rounded-lg px-4 py-3 text-base dark:text-white"
          placeholder="Search by title or ISBN..."
          placeholderTextColor={dark ? "#666" : "#999"}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.isbn}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center pt-20">
            <Text className="text-gray-400 text-base">
              {query ? "No matches" : "No books yet. Tap scan to add one."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="flex-row items-center py-3 border-b border-gray-100 dark:border-neutral-800">
            {item.cover ? (
              <Image
                source={{ uri: item.cover }}
                className="w-12 h-16 rounded bg-gray-200 dark:bg-neutral-800"
                resizeMode="cover"
              />
            ) : (
              <View className="w-12 h-16 rounded bg-gray-200 dark:bg-neutral-800 items-center justify-center">
                <Text className="text-gray-400 text-xs">No img</Text>
              </View>
            )}
            <View className="flex-1 ml-3">
              <Text className="text-base font-medium dark:text-white" numberOfLines={2}>
                {item.title}
              </Text>
              <Text className="text-sm text-gray-400 mt-0.5">{item.isbn}</Text>
            </View>
            <Pressable
              onPress={() => confirmDelete(item.isbn, item.title)}
              className="p-2"
              hitSlop={8}
            >
              <Text className="text-red-500 text-sm font-medium">Delete</Text>
            </Pressable>
          </View>
        )}
      />

      <View className="absolute bottom-8 right-5 items-end gap-3">
        <Pressable
          onPress={() => setShowSearch(true)}
          className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-full p-3 shadow"
        >
          <Search size={20} color={dark ? "#fff" : "#000"} />
        </Pressable>
        <Pressable
          onPress={() => { setManualIsbn(""); setShowAddManual(true); }}
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

      <SettingsSheet visible={showSettings} onClose={() => setShowSettings(false)} />
      <AddManuallySheet visible={showAddManual} onClose={() => setShowAddManual(false)} onAdded={reload} initialIsbn={manualIsbn} />
      <SearchSheet
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        onAdded={reload}
        onManualFallback={(isbn) => { setManualIsbn(isbn); setShowAddManual(true); }}
      />
    </SafeAreaView>
  );
}
