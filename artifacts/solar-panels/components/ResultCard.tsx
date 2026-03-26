import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Colors from "@/constants/colors";

interface ResultCardProps {
  label: string;
  value: string;
  unit?: string;
  highlight?: boolean;
  description?: string;
}

export function ResultCard({ label, value, unit, highlight, description }: ResultCardProps) {
  return (
    <View style={[styles.card, highlight && styles.cardHighlight]}>
      <Text style={[styles.label, highlight && styles.labelHighlight]}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, highlight && styles.valueHighlight]}>{value}</Text>
        {unit ? <Text style={[styles.unit, highlight && styles.unitHighlight]}>{unit}</Text> : null}
      </View>
      {description ? (
        <Text style={[styles.description, highlight && styles.descriptionHighlight]}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    flex: 1,
  },
  cardHighlight: {
    backgroundColor: Colors.light.secondary,
    borderColor: Colors.light.secondary,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  labelHighlight: {
    color: "rgba(255,255,255,0.7)",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  value: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  valueHighlight: {
    color: Colors.light.primary,
  },
  unit: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  unitHighlight: {
    color: "rgba(255,255,255,0.7)",
  },
  description: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.tabIconDefault,
    marginTop: 4,
  },
  descriptionHighlight: {
    color: "rgba(255,255,255,0.6)",
  },
});
