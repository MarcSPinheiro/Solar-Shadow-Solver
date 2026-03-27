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
  G,
} from "react-native-svg";
import Colors from "@/constants/colors";
import { useSolar } from "@/context/SolarContext";

function ArrayLayoutDiagram() {
  const { results, params } = useSolar();
  if (!results) return null;

  const rows = parseInt(params.rows) || 4;
  const cols = parseInt(params.cols) || 5;
  const { panelWidth, panelProjectedDepth, rowSpacing, gap } = results;

  // Escala UNIFORME para X e Y — proporções reais
  const drawableW = 270;
  const totalW = cols * panelWidth + (cols - 1) * 0.05;
  const totalD = (rows - 1) * rowSpacing + panelProjectedDepth;
  const scale = Math.min(drawableW / totalW, 38); // px/m, máx 38

  const panelW = panelWidth * scale;
  const panelD = panelProjectedDepth * scale;
  const colGapPx = 0.05 * scale;
  const rowSpacingPx = rowSpacing * scale;
  const gapPx = gap * scale;

  const offsetX = 46;
  const offsetY = 28;
  const dimRightW = 70; // espaço para cotas à direita

  const svgW = offsetX + cols * panelW + (cols - 1) * colGapPx + dimRightW;
  const svgH = offsetY + totalD * scale + 56;

  const scaleBarPx = 1 * scale; // barra de escala = 1m

  return (
    <View style={styles.diagramBox}>
      <Text style={styles.diagramTitle}>Vista Superior — Escala Proporcional Real</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={Math.max(svgW, 300)} height={svgH}>

          {/* Zonas de espaço livre entre fileiras */}
          {Array.from({ length: rows - 1 }).map((_, r) => {
            const yGapStart = offsetY + r * rowSpacingPx + panelD;
            return (
              <Rect
                key={`gap-bg-${r}`}
                x={offsetX}
                y={yGapStart}
                width={cols * panelW + (cols - 1) * colGapPx}
                height={gapPx}
                fill="rgba(229,62,62,0.07)"
                stroke="rgba(229,62,62,0.20)"
                strokeWidth={0.5}
              />
            );
          })}

          {/* Painéis */}
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => {
              const x = offsetX + c * (panelW + colGapPx);
              const y = offsetY + r * rowSpacingPx;
              return (
                <G key={`p-${r}-${c}`}>
                  <Rect x={x} y={y} width={panelW} height={panelD}
                    fill={Colors.light.panel} opacity={0.90} rx={2} />
                  <Line x1={x + panelW / 3} y1={y} x2={x + panelW / 3} y2={y + panelD}
                    stroke="#fff" strokeWidth={0.5} opacity={0.3} />
                  <Line x1={x + (panelW * 2) / 3} y1={y} x2={x + (panelW * 2) / 3} y2={y + panelD}
                    stroke="#fff" strokeWidth={0.5} opacity={0.3} />
                  <Line x1={x} y1={y + panelD / 2} x2={x + panelW} y2={y + panelD / 2}
                    stroke="#fff" strokeWidth={0.5} opacity={0.3} />
                </G>
              );
            })
          )}

          {/* Cotas direita: início→início e espaço livre */}
          {Array.from({ length: rows - 1 }).map((_, r) => {
            const yTop = offsetY + r * rowSpacingPx;
            const yNext = offsetY + (r + 1) * rowSpacingPx;
            const yGapStart = yTop + panelD;
            const xD = offsetX + cols * panelW + (cols - 1) * colGapPx + 12;
            const xG = xD + 28;
            return (
              <G key={`dim-${r}`}>
                {/* início→início (verde) */}
                <Line x1={xD} y1={yTop} x2={xD} y2={yNext} stroke={Colors.light.success} strokeWidth={1.5} />
                <Line x1={xD - 4} y1={yTop} x2={xD + 4} y2={yTop} stroke={Colors.light.success} strokeWidth={1.5} />
                <Line x1={xD - 4} y1={yNext} x2={xD + 4} y2={yNext} stroke={Colors.light.success} strokeWidth={1.5} />
                <SvgText x={xD + 7} y={(yTop + yNext) / 2 + 4} fontSize="8" fill={Colors.light.success} fontWeight="700">
                  {`d=${rowSpacing.toFixed(2)}m`}
                </SvgText>
                {/* espaço livre (vermelho) */}
                <Line x1={xG} y1={yGapStart} x2={xG} y2={yNext} stroke="#E53E3E" strokeWidth={1.2} />
                <Line x1={xG - 3} y1={yGapStart} x2={xG + 3} y2={yGapStart} stroke="#E53E3E" strokeWidth={1.2} />
                <Line x1={xG - 3} y1={yNext} x2={xG + 3} y2={yNext} stroke="#E53E3E" strokeWidth={1.2} />
                {gapPx > 14 && (
                  <SvgText x={xG + 6} y={(yGapStart + yNext) / 2 + 3} fontSize="7" fill="#E53E3E" fontWeight="600">
                    {`${gap.toFixed(2)}m`}
                  </SvgText>
                )}
              </G>
            );
          })}

          {/* Cota largura painel (topo) */}
          <Line x1={offsetX} y1={offsetY - 14} x2={offsetX + panelW} y2={offsetY - 14}
            stroke={Colors.light.accent} strokeWidth={1} />
          <Line x1={offsetX} y1={offsetY - 17} x2={offsetX} y2={offsetY - 11}
            stroke={Colors.light.accent} strokeWidth={1} />
          <Line x1={offsetX + panelW} y1={offsetY - 17} x2={offsetX + panelW} y2={offsetY - 11}
            stroke={Colors.light.accent} strokeWidth={1} />
          <SvgText x={offsetX + panelW / 2} y={offsetY - 17} fontSize="8"
            fill={Colors.light.accent} textAnchor="middle" fontWeight="600">
            {`L=${panelWidth.toFixed(2)}m`}
          </SvgText>

          {/* Cota prof. painel (esquerda) */}
          <Line x1={offsetX - 14} y1={offsetY} x2={offsetX - 14} y2={offsetY + panelD}
            stroke={Colors.light.accent} strokeWidth={1} />
          <Line x1={offsetX - 17} y1={offsetY} x2={offsetX - 11} y2={offsetY}
            stroke={Colors.light.accent} strokeWidth={1} />
          <Line x1={offsetX - 17} y1={offsetY + panelD} x2={offsetX - 11} y2={offsetY + panelD}
            stroke={Colors.light.accent} strokeWidth={1} />
          <SvgText x={offsetX - 26} y={offsetY + panelD / 2 + 3} fontSize="8"
            fill={Colors.light.accent} textAnchor="middle" fontWeight="600"
            transform={`rotate(-90, ${offsetX - 26}, ${offsetY + panelD / 2 + 3})`}>
            {`${panelProjectedDepth.toFixed(2)}m`}
          </SvgText>

          {/* Seta Norte ↑ e Sul ↓ */}
          <SvgText x={offsetX - 8} y={offsetY + 6} fontSize="8" fill={Colors.light.tabIconDefault} textAnchor="end">N↑</SvgText>
          <SvgText x={offsetX - 8} y={offsetY + totalD * scale} fontSize="8" fill={Colors.light.tabIconDefault} textAnchor="end">S↓</SvgText>

          {/* Barra de escala */}
          {(() => {
            const barY = offsetY + totalD * scale + 22;
            const barX = offsetX;
            return (
              <G>
                <Line x1={barX} y1={barY} x2={barX + scaleBarPx} y2={barY}
                  stroke={Colors.light.text} strokeWidth={2} />
                <Line x1={barX} y1={barY - 5} x2={barX} y2={barY + 5}
                  stroke={Colors.light.text} strokeWidth={2} />
                <Line x1={barX + scaleBarPx} y1={barY - 5} x2={barX + scaleBarPx} y2={barY + 5}
                  stroke={Colors.light.text} strokeWidth={2} />
                <SvgText x={barX + scaleBarPx / 2} y={barY - 7} fontSize="8"
                  fill={Colors.light.text} textAnchor="middle" fontWeight="700">
                  1 metro
                </SvgText>
              </G>
            );
          })()}
        </Svg>
      </ScrollView>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: Colors.light.panel }]} />
          <Text style={styles.legendText}>Painel fotovoltaico</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: Colors.light.success }]} />
          <Text style={styles.legendText}>d = início→início</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#E53E3E" }]} />
          <Text style={styles.legendText}>Espaço livre</Text>
        </View>
      </View>
    </View>
  );
}

function SummaryTable() {
  const { results, params } = useSolar();
  if (!results) return null;

  const rows = parseInt(params.rows) || 4;
  const cols = parseInt(params.cols) || 5;
  const totalPanels = rows * cols;
  const totalPower = totalPanels * 0.4;
  const areaPerPanel = results.panelHeight * results.panelWidth;
  const totalUsefulArea = totalPanels * areaPerPanel;

  const data = [
    { label: "Painéis Totais", value: `${totalPanels} un` },
    { label: "Potência Estimada", value: `${totalPower.toFixed(1)} kWp` },
    { label: "Dist. Início→Início", value: `${results.rowSpacing.toFixed(2)} m` },
    { label: "Espaço Livre entre Fileiras", value: `${results.gap.toFixed(2)} m` },
    { label: "Área por Painel", value: `${areaPerPanel.toFixed(2)} m²` },
    { label: "Área Útil (painéis)", value: `${totalUsefulArea.toFixed(1)} m²` },
    { label: "Largura Total do Array", value: `${results.totalWidth.toFixed(2)} m` },
    { label: "Comprimento Total do Array", value: `${results.totalLength.toFixed(2)} m` },
    { label: "Área Total Ocupada", value: `${(results.totalWidth * results.totalLength).toFixed(1)} m²` },
  ];

  return (
    <View style={styles.tableSection}>
      <Text style={styles.tableTitle}>Resumo do Sistema</Text>
      {data.map((item, i) => (
        <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
          <Text style={styles.tableLabel}>{item.label}</Text>
          <Text style={[
            styles.tableValue,
            item.label.includes("Início→Início") && { color: Colors.light.success },
            item.label.includes("Espaço Livre") && { color: "#E53E3E" },
          ]}>
            {item.value}
          </Text>
        </View>
      ))}
      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          * Potência estimada com painéis de 400W. Distâncias calculadas para{" "}
          <Text style={{ fontFamily: "Inter_700Bold", color: Colors.light.warning }}>21 de Dezembro</Text>
          {" "}(sol mais baixo do ano, δ = −23,45°). A distância início→início = proj. horizontal ({results.panelProjectedDepth.toFixed(2)} m) + espaço livre ({results.gap.toFixed(2)} m).
        </Text>
      </View>
    </View>
  );
}

export default function LayoutScreen() {
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
        <Text style={styles.screenTitle}>Layout do Array</Text>
        <Text style={styles.screenSubtitle}>Vista aérea com distâncias início→início</Text>

        {results ? (
          <>
            <ArrayLayoutDiagram />
            <SummaryTable />
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
    marginTop: 12,
    flexWrap: "wrap",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendColor: { width: 12, height: 12, borderRadius: 3 },
  legendText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  tableSection: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: "hidden",
    marginBottom: 16,
  },
  tableTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableRowAlt: {
    backgroundColor: Colors.light.backgroundSecondary,
  },
  tableLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    flex: 1,
  },
  tableValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  noteBox: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  noteText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.tabIconDefault,
    lineHeight: 16,
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
