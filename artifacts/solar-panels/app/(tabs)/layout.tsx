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
  const { panelHeight, panelWidth, panelAngle, minDistance } = results;

  const anglRad = (panelAngle * Math.PI) / 180;
  const panelProjectedDepth = panelHeight * Math.cos(anglRad);

  // Scale to fit
  const maxW = 310;
  const totalW = cols * panelWidth + (cols - 1) * 0.3;
  const totalD = rows * panelProjectedDepth + (rows - 1) * minDistance;
  const scaleX = (maxW - 60) / totalW;
  const scaleY = Math.min(scaleX, 220 / totalD);
  const panelW = panelWidth * scaleX;
  const panelD = panelProjectedDepth * scaleY;
  const gapX = 0.3 * scaleX;
  const gapY = minDistance * scaleY;
  const colGap = gapX;
  const rowGap = gapY;

  const offsetX = 50;
  const offsetY = 20;
  const totalSvgW = cols * panelW + (cols - 1) * colGap + offsetX + 10;
  const totalSvgH = rows * panelD + (rows - 1) * rowGap + offsetY + 60;

  return (
    <View style={styles.diagramBox}>
      <Text style={styles.diagramTitle}>Vista Superior - Layout do Array</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={Math.max(totalSvgW, 300)} height={totalSvgH + 10}>
          {/* Draw panels */}
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => {
              const x = offsetX + c * (panelW + colGap);
              const y = offsetY + r * (panelD + rowGap);
              const isLast = r === rows - 1;
              const isFirst = r === 0;
              return (
                <G key={`${r}-${c}`}>
                  {/* Panel body */}
                  <Rect
                    x={x}
                    y={y}
                    width={panelW}
                    height={panelD}
                    fill={Colors.light.panel}
                    opacity={0.85}
                    rx={2}
                  />
                  {/* Cell lines on panel */}
                  <Line x1={x + panelW / 3} y1={y} x2={x + panelW / 3} y2={y + panelD} stroke="#fff" strokeWidth={0.5} opacity={0.4} />
                  <Line x1={x + (panelW * 2) / 3} y1={y} x2={x + (panelW * 2) / 3} y2={y + panelD} stroke="#fff" strokeWidth={0.5} opacity={0.4} />
                  <Line x1={x} y1={y + panelD / 2} x2={x + panelW} y2={y + panelD / 2} stroke="#fff" strokeWidth={0.5} opacity={0.4} />
                </G>
              );
            })
          )}

          {/* Row gap dimension lines */}
          {Array.from({ length: rows - 1 }).map((_, r) => {
            const y1 = offsetY + (r + 1) * panelD + r * rowGap;
            const y2 = y1 + rowGap;
            const xLine = offsetX + cols * panelW + (cols - 1) * colGap + 12;
            return (
              <G key={`gap-${r}`}>
                <Line x1={xLine} y1={y1} x2={xLine} y2={y2} stroke={Colors.light.success} strokeWidth={1.5} />
                <Line x1={xLine - 4} y1={y1} x2={xLine + 4} y2={y1} stroke={Colors.light.success} strokeWidth={1.5} />
                <Line x1={xLine - 4} y1={y2} x2={xLine + 4} y2={y2} stroke={Colors.light.success} strokeWidth={1.5} />
                {rowGap > 12 ? (
                  <SvgText
                    x={xLine + 6}
                    y={(y1 + y2) / 2 + 4}
                    fontSize="8"
                    fill={Colors.light.success}
                    fontWeight="700"
                  >
                    {`${minDistance.toFixed(2)}m`}
                  </SvgText>
                ) : null}
              </G>
            );
          })}

          {/* Panel width dimension */}
          <Line
            x1={offsetX}
            y1={offsetY - 10}
            x2={offsetX + panelW}
            y2={offsetY - 10}
            stroke={Colors.light.accent}
            strokeWidth={1.5}
          />
          <Line x1={offsetX} y1={offsetY - 14} x2={offsetX} y2={offsetY - 6} stroke={Colors.light.accent} strokeWidth={1.5} />
          <Line x1={offsetX + panelW} y1={offsetY - 14} x2={offsetX + panelW} y2={offsetY - 6} stroke={Colors.light.accent} strokeWidth={1.5} />
          <SvgText x={offsetX + panelW / 2} y={offsetY - 14} fontSize="9" fill={Colors.light.accent} textAnchor="middle" fontWeight="600">
            {`${panelWidth.toFixed(2)}m`}
          </SvgText>

          {/* Panel depth dimension */}
          <Line
            x1={offsetX - 14}
            y1={offsetY}
            x2={offsetX - 14}
            y2={offsetY + panelD}
            stroke={Colors.light.accent}
            strokeWidth={1.5}
          />
          <Line x1={offsetX - 18} y1={offsetY} x2={offsetX - 10} y2={offsetY} stroke={Colors.light.accent} strokeWidth={1.5} />
          <Line x1={offsetX - 18} y1={offsetY + panelD} x2={offsetX - 10} y2={offsetY + panelD} stroke={Colors.light.accent} strokeWidth={1.5} />
          <SvgText
            x={offsetX - 28}
            y={offsetY + panelD / 2 + 4}
            fontSize="9"
            fill={Colors.light.accent}
            textAnchor="middle"
            transform={`rotate(-90, ${offsetX - 28}, ${offsetY + panelD / 2 + 4})`}
            fontWeight="600"
          >
            {`${panelProjectedDepth.toFixed(2)}m`}
          </SvgText>

          {/* North arrow */}
          <SvgText x={totalSvgW - 28} y={30} fontSize="10" fill={Colors.light.textSecondary} textAnchor="middle">N</SvgText>
          <Line x1={totalSvgW - 28} y1={32} x2={totalSvgW - 28} y2={50} stroke={Colors.light.textSecondary} strokeWidth={1.5} />
          <Rect
            x={totalSvgW - 30}
            y={26}
            width={4}
            height={6}
            fill={Colors.light.textSecondary}
          />

          {/* Labels at bottom */}
          <SvgText
            x={offsetX + (cols * panelW + (cols - 1) * colGap) / 2}
            y={totalSvgH - 4}
            fontSize="9"
            fill={Colors.light.textSecondary}
            textAnchor="middle"
          >
            {`${cols} colunas × ${rows} fileiras`}
          </SvgText>
        </Svg>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: Colors.light.panel }]} />
          <Text style={styles.legendText}>Painel fotovoltaico</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: Colors.light.success }]} />
          <Text style={styles.legendText}>Distância entre fileiras</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: Colors.light.accent }]} />
          <Text style={styles.legendText}>Dimensões do painel</Text>
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
    { label: "Área por Painel", value: `${areaPerPanel.toFixed(2)} m²` },
    { label: "Área Útil Total", value: `${totalUsefulArea.toFixed(1)} m²` },
    { label: "Área Ocupada Total", value: `${(results.totalWidth * results.totalLength).toFixed(1)} m²` },
    { label: "Distância Min. Fileiras", value: `${results.minDistance.toFixed(2)} m` },
    { label: "Largura Total Array", value: `${results.totalWidth.toFixed(2)} m` },
    { label: "Comprimento Total Array", value: `${results.totalLength.toFixed(2)} m` },
  ];

  return (
    <View style={styles.tableSection}>
      <Text style={styles.tableTitle}>Resumo do Sistema</Text>
      {data.map((item, i) => (
        <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
          <Text style={styles.tableLabel}>{item.label}</Text>
          <Text style={styles.tableValue}>{item.value}</Text>
        </View>
      ))}
      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          * Potência estimada com painéis de 400W (padrão residencial). Distância calculada para o solstício de inverno (pior caso anual).
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
        <Text style={styles.screenSubtitle}>Vista aérea com todas as fileiras</Text>

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
    gap: 12,
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
