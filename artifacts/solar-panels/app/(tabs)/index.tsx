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
import { LocationSearch } from "@/components/LocationSearch";
import { useSolar, SolarParams } from "@/context/SolarContext";

export default function CalculatorScreen() {
  const insets = useSafeAreaInsets();
  const { params, results, calculate } = useSolar();

  const [localParams, setLocalParams] = useState<SolarParams>(params);

  const handleChange = (key: keyof SolarParams, value: string) => {
    setLocalParams((prev) => ({ ...prev, [key]: value }));
  };

  const canCalculate =
    localParams.height.trim() !== "" &&
    localParams.width.trim() !== "" &&
    localParams.angle.trim() !== "" &&
    localParams.latitude.trim() !== "";

  const handleCalculate = () => {
    if (!canCalculate) return;
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
        <View style={[styles.section, { zIndex: 10 }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={16} color={Colors.light.accent} />
            <Text style={styles.sectionTitle}>Localização</Text>
          </View>
          <LocationSearch
            latitude={localParams.latitude}
            onLatitudeChange={(lat) => handleChange("latitude", lat)}
          />
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

        {/* Reference date note */}
        <View style={styles.referenceDateBox}>
          <MaterialCommunityIcons name="calendar-today" size={15} color={Colors.light.warning} />
          <Text style={styles.referenceDateText}>
            Referência: <Text style={styles.referenceDateHighlight}>21 de Dezembro</Text> — solstício de inverno (sol mais baixo, δ = −23,45°){"\n"}
            <Text style={{ fontFamily: "Inter_600SemiBold", color: Colors.light.textSecondary }}>d = h·cos(β) + h·sin(β)/tan(α)</Text>
          </Text>
        </View>

        {/* Calculate Button */}
        <TouchableOpacity
          style={[styles.calculateButton, !canCalculate && styles.calculateButtonDisabled]}
          onPress={handleCalculate}
          activeOpacity={canCalculate ? 0.85 : 1}
        >
          <MaterialCommunityIcons name="calculator" size={20} color={canCalculate ? "#fff" : "rgba(255,255,255,0.45)"} />
          <Text style={[styles.calculateButtonText, !canCalculate && styles.calculateButtonTextDisabled]}>
            Calcular Distâncias
          </Text>
        </TouchableOpacity>

        {/* Results */}
        {results ? (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsSectionTitle}>Resultados</Text>

            {/* Main result: row spacing start to start */}
            <View style={styles.mainResultCard}>
              <View style={styles.mainResultLeft}>
                <Text style={styles.mainResultLabel}>Distância Início → Início</Text>
                <Text style={styles.mainResultDesc}>entre fileiras consecutivas</Text>
              </View>
              <View style={styles.mainResultRight}>
                <Text style={styles.mainResultValue}>{results.rowSpacing.toFixed(2)}</Text>
                <Text style={styles.mainResultUnit}>m</Text>
              </View>
            </View>

            <View style={[styles.row, { marginBottom: 10 }]}>
              <ResultCard
                label="Espaço Livre"
                value={results.gap.toFixed(2)}
                unit="m"
                description="folga entre fileiras"
              />
              <View style={{ width: 10 }} />
              <ResultCard
                label="Sombra Projectada"
                value={results.shadowLength.toFixed(2)}
                unit="m"
                description="21 dez. (pior caso)"
              />
            </View>

            <View style={[styles.row, { marginBottom: 10 }]}>
              <ResultCard
                label="Altitude Solar"
                value={results.altitudeAngle.toFixed(1)}
                unit="°"
                description="21 dez., meio-dia solar"
              />
              <View style={{ width: 10 }} />
              <ResultCard
                label="Proj. Horizontal"
                value={results.panelProjectedDepth.toFixed(2)}
                unit="m"
                description="profundidade do painel"
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
                Fórmula: <Text style={{ fontFamily: "Inter_600SemiBold", color: Colors.light.accent }}>d = h·cos(β) + h·sin(β)/tan(α)</Text>{"\n"}Calculado para <Text style={{ fontFamily: "Inter_600SemiBold", color: Colors.light.accent }}>21 de Dezembro</Text> ao meio-dia solar (α = {results.altitudeAngle.toFixed(1)}°, δ = −23,45°). Garante ausência de sombra durante todo o ano.
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
    marginBottom: 16,
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
  calculateButtonDisabled: {
    backgroundColor: Colors.light.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  calculateButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  calculateButtonTextDisabled: {
    color: Colors.light.textSecondary,
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
  mainResultCard: {
    backgroundColor: Colors.light.secondary,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    shadowColor: Colors.light.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  mainResultLeft: {
    flex: 1,
  },
  mainResultLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    marginBottom: 3,
  },
  mainResultDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
  },
  mainResultRight: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  mainResultValue: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: Colors.light.primary,
  },
  mainResultUnit: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
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
  referenceDateBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(245, 166, 35, 0.10)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(245, 166, 35, 0.25)",
    padding: 12,
    marginBottom: 14,
  },
  referenceDateText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  referenceDateHighlight: {
    fontFamily: "Inter_700Bold",
    color: Colors.light.warning,
  },
});
