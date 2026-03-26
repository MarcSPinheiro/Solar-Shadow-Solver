import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from "react-native";
import Colors from "@/constants/colors";

interface InputFieldProps extends TextInputProps {
  label: string;
  unit?: string;
  hint?: string;
}

export function InputField({ label, unit, hint, style, ...props }: InputFieldProps) {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, style]}
          keyboardType="numeric"
          placeholderTextColor={Colors.light.textSecondary}
          {...props}
        />
        {unit ? (
          <View style={styles.unitContainer}>
            <Text style={styles.unit}>{unit}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  hint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.tabIconDefault,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    overflow: "hidden",
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
  },
  unitContainer: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderLeftWidth: 1,
    borderLeftColor: Colors.light.border,
  },
  unit: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
});
