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
  Polygon,
  G,
} from "react-native-svg";
import Colors from "@/constants/colors";
import { useSolar } from "@/context/SolarContext";

const DIAGRAM_W = 340;

function ShadowDiagram() {
  const { results } = useSolar();
  if (!results) return null;

  const { panelHeight, panelAngle, gap, rowSpacing, shadowLength, panelProjectedDepth } = results;

  const scale = 80;
  const groundY = 210;
  const startX = 50;

  const anglRad = (panelAngle * Math.PI) / 180;
  const pDepth = panelProjectedDepth * scale;     // projeção horizontal
  const pVert = panelHeight * Math.sin(anglRad) * scale; // altura vertical
  const gapScaled = gap * scale;
  const shadowScaled = shadowLength * scale;
  const rowSpacingScaled = rowSpacing * scale;

  // Painel 1
  const p1BaseX = startX;
  const p1BaseY = groundY;
  const p1TopX = p1BaseX + pDepth;
  const p1TopY = groundY - pVert;

  // Painel 2 começa exatamente em startX + rowSpacing
  const p2BaseX = startX + rowSpacingScaled;
  const p2BaseY = groundY;
  const p2TopX = p2BaseX + pDepth;
  const p2TopY = groundY - pVert;

  // Ponta da sombra no chão (desde a base do painel 1)
  const shadowEndX = startX + shadowScaled;

  const viewW = Math.max(DIAGRAM_W - 16, p2TopX + 30);
  const viewH = 280;

  return (
    <View style={styles.diagramBox}>
      <Text style={styles.diagramTitle}>Secção Lateral — 21 de Dezembro, Meio-dia Solar</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={viewW} height={viewH}>
          {/* Chão */}
          <Line x1={0} y1={groundY} x2={viewW} y2={groundY} stroke="#8B7355" strokeWidth={2} />
          {/* Hachura do chão */}
          {Array.from({ length: 20 }).map((_, i) => (
            <Line
              key={i}
              x1={i * 18}
              y1={groundY}
              x2={i * 18 - 10}
              y2={groundY + 12}
              stroke="#8B7355"
              strokeWidth={1}
              opacity={0.4}
            />
          ))}

          {/* Zona de sombra no chão */}
          <Rect
            x={p1TopX}
            y={groundY - 5}
            width={Math.max(shadowScaled - pDepth, 0)}
            height={10}
            fill="rgba(245,166,35,0.18)"
            rx={2}
          />

          {/* Linha de sombra (raio solar) */}
          <Line
            x1={p1TopX}
            y1={p1TopY}
            x2={shadowEndX}
            y2={groundY}
            stroke={Colors.light.warning}
            strokeWidth={1.5}
            strokeDasharray="6,4"
            opacity={0.9}
          />

          {/* Painel 1 */}
          <Rect
            x={p1BaseX - 2}
            y={p1TopY - 2}
            width={pDepth + 4}
            height={pVert + 2}
            fill="rgba(43,108,176,0.1)"
            rx={2}
          />
          <Line
            x1={p1BaseX}
            y1={p1BaseY}
            x2={p1TopX}
            y2={p1TopY}
            stroke={Colors.light.panel}
            strokeWidth={6}
            strokeLinecap="round"
          />
          {/* Células do painel 1 */}
          <Line x1={p1BaseX + pDepth * 0.33} y1={p1BaseY - pVert * 0.33} x2={p1TopX - pDepth * 0.33} y2={p1TopY + pVert * 0.33} stroke="#fff" strokeWidth={0.8} opacity={0.4} />

          {/* Painel 2 */}
          <Rect
            x={p2BaseX - 2}
            y={p2TopY - 2}
            width={pDepth + 4}
            height={pVert + 2}
            fill="rgba(43,108,176,0.1)"
            rx={2}
          />
          <Line
            x1={p2BaseX}
            y1={p2BaseY}
            x2={p2TopX}
            y2={p2TopY}
            stroke={Colors.light.panel}
            strokeWidth={6}
            strokeLinecap="round"
          />

          {/* Sol */}
          {(() => {
            const sunLen = 55;
            const sunX = p1TopX - sunLen * Math.cos(anglRad);
            const sunY = p1TopY - sunLen * Math.sin(anglRad);
            return (
              <G>
                <Line
                  x1={sunX}
                  y1={sunY}
                  x2={p1TopX}
                  y2={p1TopY}
                  stroke={Colors.light.warning}
                  strokeWidth={2}
                />
                <Polygon
                  points={`${sunX},${sunY - 9} ${sunX + 9},${sunY} ${sunX},${sunY + 9} ${sunX - 9},${sunY}`}
                  fill={Colors.light.warning}
                  opacity={0.95}
                />
                <SvgText x={sunX - 14} y={sunY - 14} fontSize="9" fill={Colors.light.warning} textAnchor="middle" fontWeight="600">
                  Sol
                </SvgText>
              </G>
            );
          })()}

          {/* ── COTAS ── */}

          {/* Cota: projeção horizontal do painel (p1) */}
          <Line x1={p1BaseX} y1={groundY + 24} x2={p1TopX} y2={groundY + 24} stroke={Colors.light.accent} strokeWidth={1.5} />
          <Line x1={p1BaseX} y1={groundY + 20} x2={p1BaseX} y2={groundY + 28} stroke={Colors.light.accent} strokeWidth={1.5} />
          <Line x1={p1TopX} y1={groundY + 20} x2={p1TopX} y2={groundY + 28} stroke={Colors.light.accent} strokeWidth={1.5} />
          <SvgText x={(p1BaseX + p1TopX) / 2} y={groundY + 38} fontSize="9" fill={Colors.light.accent} textAnchor="middle" fontWeight="600">
            {`proj.=${panelProjectedDepth.toFixed(2)}m`}
          </SvgText>

          {/* Cota: gap (espaço livre) */}
          <Line x1={p1TopX} y1={groundY + 52} x2={p2BaseX} y2={groundY + 52} stroke="#E53E3E" strokeWidth={1.5} />
          <Line x1={p1TopX} y1={groundY + 48} x2={p1TopX} y2={groundY + 56} stroke="#E53E3E" strokeWidth={1.5} />
          <Line x1={p2BaseX} y1={groundY + 48} x2={p2BaseX} y2={groundY + 56} stroke="#E53E3E" strokeWidth={1.5} />
          <SvgText x={(p1TopX + p2BaseX) / 2} y={groundY + 65} fontSize="9" fill="#E53E3E" textAnchor="middle" fontWeight="600">
            {`folga=${gap.toFixed(2)}m`}
          </SvgText>

          {/* Cota principal: rowSpacing (início ao início) */}
          <Line x1={p1BaseX} y1={groundY - 22} x2={p2BaseX} y2={groundY - 22} stroke={Colors.light.success} strokeWidth={2} />
          <Line x1={p1BaseX} y1={groundY - 27} x2={p1BaseX} y2={groundY - 17} stroke={Colors.light.success} strokeWidth={2} />
          <Line x1={p2BaseX} y1={groundY - 27} x2={p2BaseX} y2={groundY - 17} stroke={Colors.light.success} strokeWidth={2} />
          {/* Marcador início painel 1 */}
          <Line x1={p1BaseX} y1={groundY - 32} x2={p1BaseX} y2={groundY + 4} stroke={Colors.light.success} strokeWidth={1} strokeDasharray="3,3" opacity={0.6} />
          {/* Marcador início painel 2 */}
          <Line x1={p2BaseX} y1={groundY - 32} x2={p2BaseX} y2={groundY + 4} stroke={Colors.light.success} strokeWidth={1} strokeDasharray="3,3" opacity={0.6} />
          <SvgText x={(p1BaseX + p2BaseX) / 2} y={groundY - 28} fontSize="10" fill={Colors.light.success} textAnchor="middle" fontWeight="700">
            {`d=${rowSpacing.toFixed(2)}m (início→início)`}
          </SvgText>

          {/* Cota: altura do painel */}
          <Line x1={p1BaseX - 16} y1={p1BaseY} x2={p1BaseX - 16} y2={p1TopY} stroke={Colors.light.textSecondary} strokeWidth={1} />
          <Line x1={p1BaseX - 20} y1={p1BaseY} x2={p1BaseX - 12} y2={p1BaseY} stroke={Colors.light.textSecondary} strokeWidth={1} />
          <Line x1={p1BaseX - 20} y1={p1TopY} x2={p1BaseX - 12} y2={p1TopY} stroke={Colors.light.textSecondary} strokeWidth={1} />
          <SvgText
            x={p1BaseX - 30}
            y={(p1BaseY + p1TopY) / 2 + 4}
            fontSize="9"
            fill={Colors.light.textSecondary}
            textAnchor="middle"
            fontWeight="600"
            transform={`rotate(-90, ${p1BaseX - 30}, ${(p1BaseY + p1TopY) / 2 + 4})`}
          >
            {`h=${panelHeight.toFixed(2)}m`}
          </SvgText>

          {/* Ângulo β */}
          <SvgText x={p1BaseX + 22} y={p1BaseY - 6} fontSize="9" fill={Colors.light.accent} textAnchor="middle">
            {`β=${panelAngle}°`}
          </SvgText>

          {/* Labels dos painéis */}
          <SvgText x={(p1BaseX + p1TopX) / 2} y={p1TopY - 9} fontSize="10" fill={Colors.light.panelDark} textAnchor="middle" fontWeight="700">
            Painel 1
          </SvgText>
          <SvgText x={(p2BaseX + p2TopX) / 2} y={p2TopY - 9} fontSize="10" fill={Colors.light.panelDark} textAnchor="middle" fontWeight="700">
            Painel 2
          </SvgText>
        </Svg>
      </ScrollView>

      {/* Legenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: Colors.light.success }]} />
          <Text style={styles.legendText}>Dist. início→início</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#E53E3E" }]} />
          <Text style={styles.legendText}>Espaço livre</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: Colors.light.warning }]} />
          <Text style={styles.legendText}>Sombra</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: Colors.light.accent }]} />
          <Text style={styles.legendText}>Proj. horizontal</Text>
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
          <Text style={styles.infoLabel}>Dist. início→início (d)</Text>
          <Text style={[styles.infoValue, { color: Colors.light.success }]}>{results.rowSpacing.toFixed(2)} m</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Espaço livre entre fileiras</Text>
          <Text style={[styles.infoValue, { color: "#E53E3E" }]}>{results.gap.toFixed(2)} m</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Altitude Solar Mínima (α)</Text>
          <Text style={styles.infoValue}>{results.altitudeAngle.toFixed(1)}°</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Projeção Horizontal</Text>
          <Text style={styles.infoValue}>{results.panelProjectedDepth.toFixed(2)} m</Text>
        </View>
      </View>

      <View style={styles.formulaBox}>
        <Text style={styles.formulaTitle}>Fórmula Aplicada — 21 de Dezembro (pior caso)</Text>
        <Text style={styles.formulaText}>d = h·cos(β) + [h·sin(β)/tan(α) − h·cos(β)]</Text>
        <Text style={styles.formulaText2}>d = h·sin(β) / tan(α)</Text>
        <Text style={styles.formulaDesc}>
          d = distância início→início{"\n"}
          h = altura do painel · β = inclinação{"\n"}
          α = altitude solar a 21 dez., meio-dia (sol mais baixo do ano, δ = −23,45°)
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
        <Text style={styles.screenSubtitle}>21 de Dezembro · Vista lateral com cotas — início ao início</Text>

        {results ? (
          <>
            <ShadowDiagram />
            <AngleInfo />
          </>
        ) : (
          <View style={styles.emptyState}>
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
  container: { flex: 1, backgroundColor: Colors.light.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },
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
    gap: 14,
    marginTop: 14,
    flexWrap: "wrap",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendColor: { width: 12, height: 12, borderRadius: 3 },
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
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.primary,
    marginBottom: 2,
    fontStyle: "italic",
  },
  formulaText2: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.light.primary,
    marginBottom: 8,
    fontStyle: "italic",
  },
  formulaDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
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
