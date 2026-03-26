import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Rect,
  Line,
  Text as SvgText,
  Defs,
  Pattern,
  Polygon,
  Path,
  G,
  Marker,
  Defs as SvgDefs,
} from "react-native-svg";
import Colors from "@/constants/colors";
import { useSolar } from "@/context/SolarContext";

const W = 340;

function ShadowDiagram() {
  const { results } = useSolar();
  if (!results) return null;

  const { panelHeight, panelAngle, minDistance, shadowLength } = results;

  // Scale: fit 2 panels + gap in the view
  const scale = 80;
  const groundY = 200;
  const startX = 40;

  const anglRad = (panelAngle * Math.PI) / 180;
  const panelProjectedH = panelHeight * Math.cos(anglRad) * scale;
  const panelProjectedV = panelHeight * Math.sin(anglRad) * scale;
  const gapScaled = minDistance * scale;
  const shadowLengthScaled = shadowLength * scale;

  // Panel 1 base (on ground)
  const p1BaseX = startX;
  const p1BaseY = groundY;
  const p1TopX = p1BaseX + panelProjectedH;
  const p1TopY = groundY - panelProjectedV;

  // Panel 2 base
  const p2BaseX = p1BaseX + panelProjectedH + gapScaled;
  const p2BaseY = groundY;
  const p2TopX = p2BaseX + panelProjectedH;
  const p2TopY = groundY - panelProjectedV;

  // Shadow end point (from top of panel 1 projected to ground)
  const shadowEndX = p1TopX + shadowLengthScaled;

  // Sun angle line
  const sunLineLen = 50;
  const sunX = p1TopX - sunLineLen * Math.cos(anglRad);
  const sunY = p1TopY - sunLineLen * Math.sin(anglRad);

  const viewW = Math.max(W - 20, p2TopX + 30);
  const viewH = 250;

  return (
    <View style={styles.diagramBox}>
      <Text style={styles.diagramTitle}>Secção Transversal - Sombreamento</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={viewW} height={viewH}>
          {/* Ground */}
          <Line
            x1={0}
            y1={groundY}
            x2={viewW}
            y2={groundY}
            stroke="#8B7355"
            strokeWidth={2}
          />
          {/* Ground hatch */}
          {Array.from({ length: 15 }).map((_, i) => (
            <Line
              key={i}
              x1={i * 20}
              y1={groundY}
              x2={i * 20 - 10}
              y2={groundY + 12}
              stroke="#8B7355"
              strokeWidth={1}
              opacity={0.5}
            />
          ))}

          {/* Shadow zone on ground */}
          <Rect
            x={p1TopX}
            y={groundY - 4}
            width={shadowLengthScaled}
            height={8}
            fill="rgba(255,165,0,0.2)"
            rx={2}
          />

          {/* Shadow line (from panel top to ground) */}
          <Line
            x1={p1TopX}
            y1={p1TopY}
            x2={shadowEndX}
            y2={groundY}
            stroke={Colors.light.warning}
            strokeWidth={1.5}
            strokeDasharray="5,4"
            opacity={0.8}
          />

          {/* Panel 1 */}
          <Rect
            x={p1BaseX - 3}
            y={p1TopY - 3}
            width={panelProjectedH + 6}
            height={panelProjectedV + 3}
            fill="rgba(43,108,176,0.08)"
            rx={2}
          />
          <Line
            x1={p1BaseX}
            y1={p1BaseY}
            x2={p1TopX}
            y2={p1TopY}
            stroke={Colors.light.panel}
            strokeWidth={5}
            strokeLinecap="round"
          />
          <Line
            x1={p1BaseX}
            y1={p1BaseY}
            x2={p1TopX}
            y2={p1TopY}
            stroke={Colors.light.primary}
            strokeWidth={1.5}
            strokeDasharray="4,4"
          />

          {/* Panel 2 */}
          <Rect
            x={p2BaseX - 3}
            y={p2TopY - 3}
            width={panelProjectedH + 6}
            height={panelProjectedV + 3}
            fill="rgba(43,108,176,0.08)"
            rx={2}
          />
          <Line
            x1={p2BaseX}
            y1={p2BaseY}
            x2={p2TopX}
            y2={p2TopY}
            stroke={Colors.light.panel}
            strokeWidth={5}
            strokeLinecap="round"
          />
          <Line
            x1={p2BaseX}
            y1={p2BaseY}
            x2={p2TopX}
            y2={p2TopY}
            stroke={Colors.light.primary}
            strokeWidth={1.5}
            strokeDasharray="4,4"
          />

          {/* Sun rays */}
          <Line
            x1={sunX}
            y1={sunY}
            x2={p1TopX}
            y2={p1TopY}
            stroke={Colors.light.warning}
            strokeWidth={2}
          />
          {/* Sun circle */}
          <Polygon
            points={`${sunX},${sunY - 8} ${sunX + 8},${sunY} ${sunX},${sunY + 8} ${sunX - 8},${sunY}`}
            fill={Colors.light.warning}
            opacity={0.9}
          />

          {/* Dimension: panel height */}
          <Line
            x1={p1BaseX - 14}
            y1={p1BaseY}
            x2={p1BaseX - 14}
            y2={p1TopY}
            stroke={Colors.light.textSecondary}
            strokeWidth={1}
          />
          <Line x1={p1BaseX - 18} y1={p1BaseY} x2={p1BaseX - 10} y2={p1BaseY} stroke={Colors.light.textSecondary} strokeWidth={1} />
          <Line x1={p1BaseX - 18} y1={p1TopY} x2={p1BaseX - 10} y2={p1TopY} stroke={Colors.light.textSecondary} strokeWidth={1} />
          <SvgText
            x={p1BaseX - 28}
            y={(p1BaseY + p1TopY) / 2 + 4}
            fontSize="9"
            fill={Colors.light.textSecondary}
            textAnchor="middle"
            transform={`rotate(-90, ${p1BaseX - 28}, ${(p1BaseY + p1TopY) / 2 + 4})`}
            fontWeight="600"
          >
            {`h=${panelHeight.toFixed(2)}m`}
          </SvgText>

          {/* Dimension: gap */}
          <Line
            x1={p1TopX}
            y1={groundY + 20}
            x2={p2BaseX}
            y2={groundY + 20}
            stroke={Colors.light.success}
            strokeWidth={1.5}
          />
          <Line x1={p1TopX} y1={groundY + 16} x2={p1TopX} y2={groundY + 24} stroke={Colors.light.success} strokeWidth={1.5} />
          <Line x1={p2BaseX} y1={groundY + 16} x2={p2BaseX} y2={groundY + 24} stroke={Colors.light.success} strokeWidth={1.5} />
          <SvgText
            x={(p1TopX + p2BaseX) / 2}
            y={groundY + 35}
            fontSize="9"
            fill={Colors.light.success}
            textAnchor="middle"
            fontWeight="600"
          >
            {`d=${minDistance.toFixed(2)}m`}
          </SvgText>

          {/* Dimension: shadow */}
          <Line
            x1={p1TopX}
            y1={groundY - 12}
            x2={shadowEndX}
            y2={groundY - 12}
            stroke={Colors.light.warning}
            strokeWidth={1.5}
            strokeDasharray="4,3"
          />
          <Line x1={p1TopX} y1={groundY - 16} x2={p1TopX} y2={groundY - 8} stroke={Colors.light.warning} strokeWidth={1.5} />
          <Line x1={shadowEndX} y1={groundY - 16} x2={shadowEndX} y2={groundY - 8} stroke={Colors.light.warning} strokeWidth={1.5} />
          <SvgText
            x={(p1TopX + shadowEndX) / 2}
            y={groundY - 16}
            fontSize="9"
            fill={Colors.light.warning}
            textAnchor="middle"
            fontWeight="600"
          >
            {`sombra=${shadowLength.toFixed(2)}m`}
          </SvgText>

          {/* Labels */}
          <SvgText
            x={(p1BaseX + p1TopX) / 2}
            y={p1TopY - 8}
            fontSize="10"
            fill={Colors.light.panelDark}
            textAnchor="middle"
            fontWeight="700"
          >
            Painel 1
          </SvgText>
          <SvgText
            x={(p2BaseX + p2TopX) / 2}
            y={p2TopY - 8}
            fontSize="10"
            fill={Colors.light.panelDark}
            textAnchor="middle"
            fontWeight="700"
          >
            Painel 2
          </SvgText>

          {/* Angle annotation */}
          <SvgText
            x={p1BaseX + 20}
            y={p1BaseY - 8}
            fontSize="9"
            fill={Colors.light.accent}
            textAnchor="middle"
          >
            {`β=${panelAngle}°`}
          </SvgText>
        </Svg>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: Colors.light.panel }]} />
          <Text style={styles.legendText}>Painel solar</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: Colors.light.warning }]} />
          <Text style={styles.legendText}>Sombra</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: Colors.light.success }]} />
          <Text style={styles.legendText}>Distância mín.</Text>
        </View>
      </View>
    </View>
  );
}

function AngleInfo() {
  const { results } = useSolar();
  if (!results) return null;

  return (
    <View style={styles.infoSection}>
      <Text style={styles.infoTitle}>Parâmetros do Cálculo</Text>
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Ângulo Inclinação (β)</Text>
          <Text style={styles.infoValue}>{results.panelAngle.toFixed(1)}°</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Altitude Solar Mínima (α)</Text>
          <Text style={styles.infoValue}>{results.altitudeAngle.toFixed(1)}°</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Declinação Solar (δ)</Text>
          <Text style={styles.infoValue}>{results.declinationAngle.toFixed(1)}°</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Distância Mínima (d)</Text>
          <Text style={[styles.infoValue, { color: Colors.light.success }]}>
            {results.minDistance.toFixed(2)} m
          </Text>
        </View>
      </View>

      <View style={styles.formulaBox}>
        <Text style={styles.formulaTitle}>Fórmula Aplicada</Text>
        <Text style={styles.formulaText}>d = h·sin(β) / tan(α) − h·cos(β)</Text>
        <Text style={styles.formulaDesc}>
          Onde h = altura do painel, β = ângulo de inclinação, α = altitude solar mínima (solstício de inverno)
        </Text>
      </View>
    </View>
  );
}

export default function DiagramScreen() {
  const insets = useSafeAreaInsets();
  const { results } = useSolar();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : insets.bottom + 80;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset + 16, paddingBottom: bottomInset },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Diagrama de Sombreamento</Text>
        <Text style={styles.screenSubtitle}>Vista lateral com cotas e sombras</Text>

        {results ? (
          <>
            <ShadowDiagram />
            <AngleInfo />
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>☀️</Text>
            <Text style={styles.emptyTitle}>Nenhum cálculo ainda</Text>
            <Text style={styles.emptyText}>
              Vá para a aba "Calcular", insira os dados e pressione "Calcular Distâncias"
            </Text>
          </View>
        )}
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
    paddingHorizontal: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: 20,
  },
  diagramBox: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  diagramTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  legend: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  infoSection: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
    marginBottom: 14,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  infoItem: {
    width: "47%",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 10,
    padding: 12,
  },
  infoLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  formulaBox: {
    backgroundColor: Colors.light.secondary,
    borderRadius: 12,
    padding: 14,
  },
  formulaTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  formulaText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.primary,
    marginBottom: 6,
    fontStyle: "italic",
  },
  formulaDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    lineHeight: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
});
