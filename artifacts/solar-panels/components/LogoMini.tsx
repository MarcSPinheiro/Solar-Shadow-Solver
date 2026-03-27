import React from "react";
import { Image, StyleSheet, View } from "react-native";

interface LogoMiniProps {
  size?: number;
}

export function LogoMini({ size = 44 }: LogoMiniProps) {
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size * 0.22 }]}>
      <Image
        source={require("@/assets/logo.png")}
        style={{ width: size * 0.85, height: size * 0.85 }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#EBF4FF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
