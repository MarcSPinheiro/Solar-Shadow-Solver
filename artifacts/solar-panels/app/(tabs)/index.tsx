import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { InputField } from "@/components/InputField";
import { ResultCard } from "@/components/ResultCard";
import { useSolar, SolarParams } from "@/context/SolarContext";

export default function CalculatorScreen() {
  const insets = useSafeAreaInsets();
  const { params, results, calculate } = useSolar();

  const [localParams, setLocalParams] = useState<SolarParams>(params);

  const handleChange = (key: keyof SolarParams, value: string) => {
    setLocalParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleCalculate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    calculate(localParams);
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : insets.bottom + 80;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset + 16, paddingBottom: bottomInset },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="solar-panel" size={22} color={Colors.light.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Painéis Fotovoltaicos</Text>
            <Text style={styles.subtitle}>Cálculo de distanciamento</Text>
          </View>
        </View>

        {/* Panel Geometry */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="resize" size={16} color={Colors.light.accent} />
            <Text style={styles.sectionTitle}>Geometria do Painel</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.flex}>
              <InputField
                label="Altura"
                unit="m"
                hint="comprimento"
                value={localParams.height}
                onChangeText={(v) => handleChange("height", v)}
                placeholder="1.65"
              />
            </View>
            <View style={styles.flex}>
              <InputField
                label="Largura"
                unit="m"
                value={localParams.width}
                onChangeText={(v) => handleChange("width", v)}
                placeholder="1.0"
              />
            </View>
          </View>
          <InputField
            label="Ângulo de Inclinação"
            unit="°"
            hint="em relação à horizontal"
            value={localParams.angle}
            onChangeText={(v) => handleChange("angle", v)}
            placeholder="20"
          />
        </View>

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={16} color={Colors.light.accent} />
            <Text style={styles.sectionTitle}>Localização</Text>
          </View>
          <InputField
            label="Latitude"
            unit="°"
            hint="negativo = sul do equador"
            value={localParams.latitude}
            onChangeText={(v) => handleChange("latitude", v)}
            placeholder="-22"
          />
          <Text style={styles.latitudeHint}>
            Brasil: entre -5° (norte) e -34° (sul)
          </Text>
        </View>

        {/* Array Configuration */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="view-grid" size={16} color={Colors.light.accent} />
            <Text style={styles.sectionTitle}>Configuração do Array</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.flex}>
              <InputField
                label="Fileiras"
                hint="linhas"
                value={localParams.rows}
                onChangeText={(v) => handleChange("rows", v)}
                placeholder="4"
              />
            </View>
            <View style={styles.flex}>
              <InputField
                label="Colunas"
                hint="por fileira"
                value={localParams.cols}
                onChangeText={(v) => handleChange("cols", v)}
                placeholder="5"
              />
            </View>
          </View>
        </View>

        {/* Calculate Button */}
        <TouchableOpacity
          style={styles.calculateButton}
          onPress={handleCalculate}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="calculator" size={20} color="#fff" />
          <Text style={styles.calculateButtonText}>Calcular Distâncias</Text>
        </TouchableOpacity>

        {/* Results */}
        {results ? (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsSectionTitle}>Resultados</Text>

            <View style={[styles.row, { marginBottom: 10 }]}>
              <ResultCard
                label="Distância Mínima"
                value={results.minDistance.toFixed(2)}
                unit="m"
                highlight
                description="entre fileiras"
              />
              <View style={{ width: 10 }} />
              <ResultCard
                label="Comprimento Sombra"
                value={results.shadowLength.toFixed(2)}
                unit="m"
                description="no solstício de inverno"
              />
            </View>

            <View style={[styles.row, { marginBottom: 10 }]}>
              <ResultCard
                label="Ângulo Solar"
                value={results.altitudeAngle.toFixed(1)}
                unit="°"
                description="altitude mínima"
              />
              <View style={{ width: 10 }} />
              <ResultCard
                label="Declinação"
                value={results.declinationAngle.toFixed(1)}
                unit="°"
                description="solstício inverno"
              />
            </View>

            <View style={styles.totalArea}>
              <View style={styles.totalAreaContent}>
                <View style={styles.totalAreaItem}>
                  <Text style={styles.totalAreaLabel}>Largura Total</Text>
                  <Text style={styles.totalAreaValue}>{results.totalWidth.toFixed(2)} m</Text>
                </View>
                <View style={styles.totalAreaDivider} />
                <View style={styles.totalAreaItem}>
                  <Text style={styles.totalAreaLabel}>Comprimento Total</Text>
                  <Text style={styles.totalAreaValue}>{results.totalLength.toFixed(2)} m</Text>
                </View>
                <View style={styles.totalAreaDivider} />
                <View style={styles.totalAreaItem}>
                  <Text style={styles.totalAreaLabel}>Área Total</Text>
                  <Text style={styles.totalAreaValue}>
                    {(results.totalWidth * results.totalLength).toFixed(1)} m²
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.noteBox}>
              <Ionicons name="information-circle" size={16} color={Colors.light.accent} />
              <Text style={styles.noteText}>
                Cálculo baseado no pior caso solar: solstício de inverno ao meio-dia solar, sem sombra entre fileiras.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.light.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 1,
  },
  section: {
    marginBottom: 20,
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  latitudeHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.tabIconDefault,
    marginTop: -4,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  calculateButton: {
    backgroundColor: Colors.light.secondary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 24,
    shadowColor: Colors.light.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  calculateButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  resultsSection: {
    marginBottom: 8,
  },
  resultsSectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    marginBottom: 14,
  },
  totalArea: {
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 10,
    overflow: "hidden",
  },
  totalAreaContent: {
    flexDirection: "row",
  },
  totalAreaItem: {
    flex: 1,
    padding: 14,
    alignItems: "center",
  },
  totalAreaDivider: {
    width: 1,
    backgroundColor: Colors.light.border,
  },
  totalAreaLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: "center",
  },
  totalAreaValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  noteBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(30, 136, 229, 0.08)",
    borderRadius: 10,
    padding: 12,
    alignItems: "flex-start",
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
});
