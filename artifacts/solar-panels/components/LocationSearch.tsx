import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationSearchProps {
  latitude: string;
  onLatitudeChange: (lat: string) => void;
}

export function LocationSearch({ latitude, onLatitudeChange }: LocationSearchProps) {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedName, setSelectedName] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = async (text: string) => {
    setQuery(text);
    setSelectedName("");
    setShowDropdown(false);

    if (text.length < 2) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&countrycodes=pt&format=json&limit=6&addressdetails=0`;
        const res = await fetch(url, {
          headers: {
            "Accept-Language": "pt-PT,pt;q=0.9",
            "User-Agent": "FotoCalc/1.0 (Pinheiro Instalações Eléctricas; pinheiro.iec@gmail.com)",
          },
        });
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setShowDropdown(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const selectLocation = (item: NominatimResult) => {
    const lat = parseFloat(item.lat).toFixed(4);
    onLatitudeChange(lat);
    // Shorten display name to first two parts
    const shortName = item.display_name.split(",").slice(0, 2).join(",").trim();
    setSelectedName(shortName);
    setQuery(shortName);
    setShowDropdown(false);
    setResults([]);
  };

  const clear = () => {
    setQuery("");
    setSelectedName("");
    setResults([]);
    setShowDropdown(false);
    onLatitudeChange("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Localidade</Text>
        {latitude ? (
          <Text style={styles.latValue}>
            {parseFloat(latitude) >= 0 ? "+" : ""}{parseFloat(latitude).toFixed(4)}°
          </Text>
        ) : null}
      </View>

      <View style={styles.inputWrapper}>
        <Ionicons name="location" size={16} color={Colors.light.accent} style={styles.icon} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={search}
          placeholder="Ex: Lisboa, Porto, Faro..."
          placeholderTextColor={Colors.light.tabIconDefault}
          returnKeyType="search"
          autoCorrect={false}
        />
        {loading ? (
          <ActivityIndicator size="small" color={Colors.light.accent} style={styles.iconRight} />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={clear} style={styles.iconRight}>
            <Ionicons name="close-circle" size={18} color={Colors.light.tabIconDefault} />
          </TouchableOpacity>
        ) : null}
      </View>

      {showDropdown && results.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.place_id.toString()}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => {
              const parts = item.display_name.split(",");
              const main = parts[0].trim();
              const sub = parts.slice(1, 3).join(",").trim();
              return (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => selectLocation(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location-outline" size={14} color={Colors.light.accent} />
                  <View style={styles.resultText}>
                    <Text style={styles.resultMain} numberOfLines={1}>{main}</Text>
                    {sub ? <Text style={styles.resultSub} numberOfLines={1}>{sub}</Text> : null}
                  </View>
                  <Text style={styles.resultLat}>{parseFloat(item.lat).toFixed(3)}°</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {selectedName && latitude ? (
        <View style={styles.selectedBadge}>
          <Ionicons name="checkmark-circle" size={13} color={Colors.light.success} />
          <Text style={styles.selectedText}>
            Latitude obtida: {parseFloat(latitude).toFixed(4)}° N
          </Text>
        </View>
      ) : !selectedName && latitude ? (
        <Text style={styles.hint}>Portugal: entre 37° (Algarve) e 42° (Minho)</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  latValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.light.accent,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    overflow: "hidden",
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  iconRight: {
    paddingLeft: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
  },
  dropdown: {
    marginTop: 4,
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: "hidden",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 100,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.light.border,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  resultText: {
    flex: 1,
  },
  resultMain: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
  },
  resultSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 1,
  },
  resultLat: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.accent,
  },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  selectedText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.light.success,
  },
  hint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.tabIconDefault,
    marginTop: 4,
    paddingHorizontal: 2,
  },
});
