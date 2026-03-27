import React, { useState, useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Rect,
  Line,
  Text as SvgText,
  G,
  Path,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { MaterialCommunityIcons, Feather, Ionicons } from "@expo/vector-icons";
import { InputField } from "@/components/InputField";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

// ─── Portugal monthly irradiation weights (sum = 1.0) ───────────────────────
const MONTHLY_FACTORS = [
  0.050, 0.063, 0.087, 0.095, 0.109, 0.114,
  0.119, 0.110, 0.091, 0.068, 0.050, 0.044,
];
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// ─── Orientation ─────────────────────────────────────────────────────────────
const ORIENTATIONS = [
  { label: "S", full: "Sul", factor: 1.00 },
  { label: "SW", full: "Sudoeste", factor: 0.95 },
  { label: "SE", full: "Sudeste", factor: 0.95 },
  { label: "W", full: "Oeste", factor: 0.82 },
  { label: "E", full: "Este", factor: 0.82 },
  { label: "NW", full: "Noroeste", factor: 0.68 },
  { label: "NE", full: "Nordeste", factor: 0.68 },
  { label: "N", full: "Norte", factor: 0.55 },
];

// ─── Inclination factor (interpolated lookup) ─────────────────────────────────
function getInclinationFactor(deg: number): number {
  const table: [number, number][] = [
    [0, 0.78], [10, 0.88], [20, 0.95], [30, 0.99], [35, 1.00],
    [40, 0.99], [45, 0.97], [60, 0.89], [75, 0.78], [90, 0.65],
  ];
  if (deg <= 0) return 0.78;
  if (deg >= 90) return 0.65;
  for (let i = 0; i < table.length - 1; i++) {
    const [a, fa] = table[i];
    const [b, fb] = table[i + 1];
    if (deg >= a && deg <= b) {
      return fa + (fb - fa) * (deg - a) / (b - a);
    }
  }
  return 1.0;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface RoiParams {
  investmentCost: string;
  panelPower: string;
  numPanels: string;
  inclination: string;
  inverterPower: string;
  electricityPrice: string;
  feedInTariff: string;
}

interface RoiResults {
  totalPowerKwp: number;
  annualProductionKwh: number;
  monthlyKwh: number[];
  annualSavingsEur: number;
  selfKwh: number;
  exportKwh: number;
  paybackYears: number;
  netAfter20: number;
  netAfter25: number;
  cumulativeNet: number[];
}

// ─── Core computation ─────────────────────────────────────────────────────────
function computeRoi(
  params: RoiParams,
  orientation: string,
  hasBattery: boolean
): RoiResults | null {
  const cost = parseFloat(params.investmentCost);
  const panelW = parseFloat(params.panelPower);
  const n = parseFloat(params.numPanels);
  const inclDeg = parseFloat(params.inclination) || 30;
  const price = parseFloat(params.electricityPrice) || 0.22;
  const feedIn = parseFloat(params.feedInTariff) || 0.05;

  if (!cost || !panelW || !n || cost <= 0 || panelW <= 0 || n <= 0) return null;

  const orientFactor =
    ORIENTATIONS.find((o) => o.label === orientation)?.factor ?? 1.0;
  const inclFactor = getInclinationFactor(inclDeg);

  const totalPowerKwp = (panelW * n) / 1000;
  const baseYield = 1550; // kWh/kWp/year — Portugal south-facing optimal
  const annualProductionKwh = totalPowerKwp * baseYield * orientFactor * inclFactor;

  const selfRate = hasBattery ? 0.75 : 0.30;
  const selfKwh = annualProductionKwh * selfRate;
  const exportKwh = annualProductionKwh * (1 - selfRate);

  const annualSavingsEur = selfKwh * price + exportKwh * feedIn;
  const monthlyKwh = MONTHLY_FACTORS.map((f) => annualProductionKwh * f);

  const paybackYears = annualSavingsEur > 0 ? cost / annualSavingsEur : Infinity;

  // 25-year projection: 0.5% annual panel degradation, 3% electricity price rise/year
  const cumulativeNet: number[] = [];
  let cumRevenue = 0;
  for (let y = 1; y <= 25; y++) {
    const degradation = Math.pow(0.995, y - 1);
    const priceGrowth = Math.pow(1.03, y - 1);
    cumRevenue += annualSavingsEur * degradation * priceGrowth;
    cumulativeNet.push(cumRevenue - cost);
  }

  return {
    totalPowerKwp,
    annualProductionKwh,
    monthlyKwh,
    annualSavingsEur,
    selfKwh,
    exportKwh,
    paybackYears,
    netAfter20: cumulativeNet[19],
    netAfter25: cumulativeNet[24],
    cumulativeNet,
  };
}

// ─── Monthly bar chart ────────────────────────────────────────────────────────
function MonthlyChart({ data }: { data: number[] }) {
  const W = 320;
  const H = 160;
  const padL = 42;
  const padR = 8;
  const padT = 12;
  const padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxVal = Math.max(...data);
  const gridLines = 4;

  const barW = chartW / 12 - 4;
  const barX = (i: number) => padL + (i * chartW) / 12 + 2;
  const barH = (v: number) => (v / maxVal) * chartH;
  const barY = (v: number) => padT + chartH - barH(v);

  return (
    <Svg width={W} height={H}>
      <Defs>
        <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={Colors.light.accent} stopOpacity="1" />
          <Stop offset="1" stopColor="#0D52A0" stopOpacity="0.8" />
        </LinearGradient>
      </Defs>

      {/* Grid lines */}
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = padT + (i * chartH) / gridLines;
        const val = maxVal * (1 - i / gridLines);
        return (
          <G key={i}>
            <Line x1={padL} y1={y} x2={W - padR} y2={y}
              stroke={Colors.light.border} strokeWidth={0.8} strokeDasharray="3,3" />
            <SvgText x={padL - 4} y={y + 4} fontSize="8"
              fill={Colors.light.tabIconDefault} textAnchor="end">
              {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val).toString()}
            </SvgText>
          </G>
        );
      })}

      {/* Bars */}
      {data.map((v, i) => (
        <G key={i}>
          <Rect
            x={barX(i)} y={barY(v)}
            width={barW} height={barH(v)}
            fill="url(#barGrad)" rx={2}
          />
          <SvgText
            x={barX(i) + barW / 2}
            y={padT + chartH + 18}
            fontSize="7.5"
            fill={Colors.light.tabIconDefault}
            textAnchor="middle"
          >
            {MONTHS[i]}
          </SvgText>
        </G>
      ))}

      {/* Axis */}
      <Line x1={padL} y1={padT} x2={padL} y2={padT + chartH}
        stroke={Colors.light.border} strokeWidth={1} />
      <Line x1={padL} y1={padT + chartH} x2={W - padR} y2={padT + chartH}
        stroke={Colors.light.border} strokeWidth={1} />
    </Svg>
  );
}

// ─── Cumulative ROI line chart ────────────────────────────────────────────────
function RoiChart({ data, cost }: { data: number[]; cost: number }) {
  const W = 320;
  const H = 190;
  const padL = 52;
  const padR = 16;
  const padT = 16;
  const padB = 32;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const minVal = Math.min(...data, -cost);
  const maxVal = Math.max(...data, 0);
  const range = maxVal - minVal || 1;

  const toX = (year: number) => padL + ((year - 1) / 24) * chartW;
  const toY = (val: number) => padT + ((maxVal - val) / range) * chartH;

  const zeroY = toY(0);

  // Build SVG path for line
  const linePath = data
    .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i + 1).toFixed(1)} ${toY(v).toFixed(1)}`)
    .join(" ");

  // Fill path (area under line, clipped at zero)
  const fillPath =
    `M ${toX(1).toFixed(1)} ${Math.min(zeroY, toY(data[0])).toFixed(1)} ` +
    data.map((v, i) => `L ${toX(i + 1).toFixed(1)} ${toY(v).toFixed(1)}`).join(" ") +
    ` L ${toX(25).toFixed(1)} ${zeroY.toFixed(1)} L ${toX(1).toFixed(1)} ${zeroY.toFixed(1)} Z`;

  // Break-even year
  const breakEvenYear = data.findIndex((v) => v >= 0);

  // Y-axis labels
  const gridSteps = 4;
  const step = range / gridSteps;

  return (
    <Svg width={W} height={H}>
      <Defs>
        <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={Colors.light.success} stopOpacity="0.35" />
          <Stop offset="1" stopColor={Colors.light.success} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>

      {/* Grid lines */}
      {Array.from({ length: gridSteps + 1 }).map((_, i) => {
        const val = maxVal - i * step;
        const y = toY(val);
        return (
          <G key={i}>
            <Line x1={padL} y1={y} x2={W - padR} y2={y}
              stroke={Colors.light.border} strokeWidth={0.7} strokeDasharray="3,3" />
            <SvgText x={padL - 4} y={y + 4} fontSize="8"
              fill={Colors.light.tabIconDefault} textAnchor="end">
              {val >= 0
                ? `+${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : Math.round(val)}`
                : `${val <= -1000 ? `-${(Math.abs(val) / 1000).toFixed(0)}k` : Math.round(val)}`}
            </SvgText>
          </G>
        );
      })}

      {/* Zero line (break-even) */}
      {zeroY >= padT && zeroY <= padT + chartH && (
        <Line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY}
          stroke={Colors.light.success} strokeWidth={1.2} strokeDasharray="4,3" />
      )}

      {/* Area fill (positive = green) */}
      <Path d={fillPath} fill="url(#areaGrad)" />

      {/* Line */}
      <Path d={linePath} fill="none" stroke={Colors.light.success} strokeWidth={2.2} strokeLinejoin="round" />

      {/* Break-even marker */}
      {breakEvenYear >= 0 && (
        <G>
          <Line
            x1={toX(breakEvenYear + 1)} y1={padT}
            x2={toX(breakEvenYear + 1)} y2={padT + chartH}
            stroke={Colors.light.primary} strokeWidth={1.2} strokeDasharray="3,3"
          />
          <Rect
            x={toX(breakEvenYear + 1) - 14} y={padT + 2}
            width={28} height={12} rx={3}
            fill={Colors.light.primary}
          />
          <SvgText
            x={toX(breakEvenYear + 1)} y={padT + 11}
            fontSize="7.5" fill="#fff" textAnchor="middle" fontWeight="700"
          >
            Ano {breakEvenYear + 1}
          </SvgText>
        </G>
      )}

      {/* X-axis labels: years 1, 5, 10, 15, 20, 25 */}
      {[1, 5, 10, 15, 20, 25].map((y) => (
        <SvgText
          key={y}
          x={toX(y)} y={padT + chartH + 18}
          fontSize="8" fill={Colors.light.tabIconDefault} textAnchor="middle"
        >
          {y}a
        </SvgText>
      ))}

      {/* Axes */}
      <Line x1={padL} y1={padT} x2={padL} y2={padT + chartH}
        stroke={Colors.light.border} strokeWidth={1} />
      <Line x1={padL} y1={padT + chartH} x2={W - padR} y2={padT + chartH}
        stroke={Colors.light.border} strokeWidth={1} />
    </Svg>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────
function ResultCard({
  icon, label, value, unit, color, sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  color?: string;
  sub?: string;
}) {
  return (
    <View style={styles.resultCard}>
      <View style={styles.resultCardIcon}>{icon}</View>
      <View style={styles.resultCardBody}>
        <Text style={styles.resultCardLabel}>{label}</Text>
        <View style={styles.resultCardValueRow}>
          <Text style={[styles.resultCardValue, color ? { color } : {}]}>{value}</Text>
          {unit ? <Text style={styles.resultCardUnit}> {unit}</Text> : null}
        </View>
        {sub ? <Text style={styles.resultCardSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function RoiScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : insets.bottom + 80;

  const [params, setParams] = useState<RoiParams>({
    investmentCost: "",
    panelPower: "",
    numPanels: "",
    inclination: "",
    inverterPower: "",
    electricityPrice: "0.22",
    feedInTariff: "0.05",
  });

  const [orientation, setOrientation] = useState("S");
  const [hasBattery, setHasBattery] = useState(false);
  const [calculated, setCalculated] = useState(false);

  const handleChange = (key: keyof RoiParams, value: string) => {
    setParams((p) => ({ ...p, [key]: value }));
    setCalculated(false);
  };

  const canCalculate =
    params.investmentCost.trim() !== "" &&
    params.panelPower.trim() !== "" &&
    params.numPanels.trim() !== "" &&
    params.inclination.trim() !== "";

  const results = useMemo(() => {
    if (!calculated) return null;
    return computeRoi(params, orientation, hasBattery);
  }, [calculated, params, orientation, hasBattery]);

  const handleCalculate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCalculated(true);
  };

  const fmt = (n: number, decimals = 0) =>
    n.toLocaleString("pt-PT", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: topInset + 16, paddingBottom: bottomInset }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="currency-eur" size={22} color={Colors.light.primary} />
          </View>
          <View>
            <Text style={styles.title}>Retorno de Investimento</Text>
            <Text style={styles.subtitle}>Análise financeira do kit solar</Text>
          </View>
        </View>

        {/* ── Sistema ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="solar-power" size={16} color={Colors.light.accent} />
            <Text style={styles.sectionTitle}>Sistema Fotovoltaico</Text>
          </View>

          <InputField
            label="Custo Total do Investimento"
            unit="€"
            hint="kit + instalação"
            value={params.investmentCost}
            onChangeText={(v) => handleChange("investmentCost", v)}
            placeholder="ex: 8500"
          />

          <View style={styles.row}>
            <View style={styles.flex}>
              <InputField
                label="Potência Painel"
                unit="Wp"
                value={params.panelPower}
                onChangeText={(v) => handleChange("panelPower", v)}
                placeholder="ex: 400"
              />
            </View>
            <View style={styles.gap} />
            <View style={styles.flex}>
              <InputField
                label="Nº de Painéis"
                value={params.numPanels}
                onChangeText={(v) => handleChange("numPanels", v)}
                placeholder="ex: 10"
              />
            </View>
          </View>

          <InputField
            label="Potência do Inversor"
            unit="kW"
            hint="opcional"
            value={params.inverterPower}
            onChangeText={(v) => handleChange("inverterPower", v)}
            placeholder="ex: 3.6"
          />
        </View>

        {/* ── Localização e inclinação ──────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="compass-outline" size={16} color={Colors.light.accent} />
            <Text style={styles.sectionTitle}>Orientação e Inclinação</Text>
          </View>

          <Text style={styles.fieldLabel}>ORIENTAÇÃO</Text>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={styles.orientationRow}
          >
            {ORIENTATIONS.map((o) => (
              <TouchableOpacity
                key={o.label}
                style={[
                  styles.orientBtn,
                  orientation === o.label && styles.orientBtnActive,
                ]}
                onPress={() => {
                  setOrientation(o.label);
                  setCalculated(false);
                }}
              >
                <Text
                  style={[
                    styles.orientBtnLabel,
                    orientation === o.label && styles.orientBtnLabelActive,
                  ]}
                >
                  {o.label}
                </Text>
                <Text
                  style={[
                    styles.orientBtnSub,
                    orientation === o.label && styles.orientBtnSubActive,
                  ]}
                >
                  ×{o.factor.toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <InputField
            label="Ângulo de Inclinação"
            unit="°"
            hint="ótimo ~30-35° em Portugal"
            value={params.inclination}
            onChangeText={(v) => handleChange("inclination", v)}
            placeholder="ex: 30"
          />
        </View>

        {/* ── Baterias ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="battery-charging" size={16} color={Colors.light.accent} />
            <Text style={styles.sectionTitle}>Armazenamento</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLeft}>
              <Text style={styles.switchLabel}>Inclui baterias</Text>
              <Text style={styles.switchSub}>
                {hasBattery
                  ? "Autoconsumo estimado: ~75%"
                  : "Autoconsumo estimado: ~30%"}
              </Text>
            </View>
            <Switch
              value={hasBattery}
              onValueChange={(v) => {
                setHasBattery(v);
                setCalculated(false);
              }}
              trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
              thumbColor={hasBattery ? Colors.light.card : Colors.light.backgroundSecondary}
            />
          </View>
        </View>

        {/* ── Preços de energia ─────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="zap" size={15} color={Colors.light.accent} />
            <Text style={styles.sectionTitle}>Preços de Energia</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.flex}>
              <InputField
                label="Preço Eletricidade"
                unit="€/kWh"
                hint="compra"
                value={params.electricityPrice}
                onChangeText={(v) => handleChange("electricityPrice", v)}
                placeholder="0.22"
              />
            </View>
            <View style={styles.gap} />
            <View style={styles.flex}>
              <InputField
                label="Tarifa Injeção"
                unit="€/kWh"
                hint="venda rede"
                value={params.feedInTariff}
                onChangeText={(v) => handleChange("feedInTariff", v)}
                placeholder="0.05"
              />
            </View>
          </View>
        </View>

        {/* ── Calcular ──────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.calcButton, !canCalculate && styles.calcButtonDisabled]}
          onPress={handleCalculate}
          activeOpacity={canCalculate ? 0.85 : 1}
        >
          <MaterialCommunityIcons
            name="chart-line"
            size={20}
            color={canCalculate ? "#fff" : "rgba(255,255,255,0.4)"}
          />
          <Text
            style={[
              styles.calcButtonText,
              !canCalculate && styles.calcButtonTextDisabled,
            ]}
          >
            Calcular Retorno
          </Text>
        </TouchableOpacity>

        {/* ── Resultados ────────────────────────────────────────────── */}
        {results && (
          <>
            {/* Summary cards */}
            <View style={styles.resultsSection}>
              <Text style={styles.resultsSectionTitle}>Resumo do Sistema</Text>

              <View style={styles.cardGrid}>
                <ResultCard
                  icon={<MaterialCommunityIcons name="solar-panel" size={18} color={Colors.light.accent} />}
                  label="Potência Total"
                  value={results.totalPowerKwp.toFixed(2)}
                  unit="kWp"
                />
                <ResultCard
                  icon={<Feather name="zap" size={17} color={Colors.light.primary} />}
                  label="Produção Anual"
                  value={fmt(results.annualProductionKwh)}
                  unit="kWh"
                  color={Colors.light.accent}
                />
              </View>

              <View style={styles.cardGrid}>
                <ResultCard
                  icon={<MaterialCommunityIcons name="home-lightning-bolt" size={18} color={Colors.light.success} />}
                  label="Autoconsumo"
                  value={fmt(results.selfKwh)}
                  unit="kWh/ano"
                  color={Colors.light.success}
                  sub={`${Math.round((results.selfKwh / results.annualProductionKwh) * 100)}% da produção`}
                />
                <ResultCard
                  icon={<MaterialCommunityIcons name="transmission-tower" size={18} color={Colors.light.tabIconDefault} />}
                  label="Injeção Rede"
                  value={fmt(results.exportKwh)}
                  unit="kWh/ano"
                  sub="energia exportada"
                />
              </View>

              <View style={styles.savingsBanner}>
                <View>
                  <Text style={styles.savingsLabel}>Poupança Anual Estimada</Text>
                  <Text style={styles.savingsValue}>
                    {fmt(results.annualSavingsEur, 0)} €/ano
                  </Text>
                  <Text style={styles.savingsSub}>
                    Equivale a {fmt(results.annualSavingsEur / 12, 0)} €/mês
                  </Text>
                </View>
                <MaterialCommunityIcons name="piggy-bank" size={36} color="rgba(255,255,255,0.7)" />
              </View>

              <View style={styles.cardGrid}>
                <ResultCard
                  icon={<MaterialCommunityIcons name="clock-time-four" size={18} color={Colors.light.primary} />}
                  label="Retorno do Capital"
                  value={
                    results.paybackYears > 50
                      ? "> 50"
                      : results.paybackYears.toFixed(1)
                  }
                  unit="anos"
                  color={Colors.light.primary}
                />
                <ResultCard
                  icon={<MaterialCommunityIcons name="trending-up" size={18} color={Colors.light.success} />}
                  label="Lucro a 20 anos"
                  value={
                    results.netAfter20 >= 0
                      ? `+${fmt(results.netAfter20)}`
                      : fmt(results.netAfter20)
                  }
                  unit="€"
                  color={results.netAfter20 >= 0 ? Colors.light.success : "#E53E3E"}
                />
              </View>

              <ResultCard
                icon={<MaterialCommunityIcons name="cash-multiple" size={18} color={Colors.light.success} />}
                label="Retorno Líquido a 25 anos (c/ 3% aumento preço energia/ano)"
                value={
                  results.netAfter25 >= 0
                    ? `+${fmt(results.netAfter25)}`
                    : fmt(results.netAfter25)
                }
                unit="€"
                color={results.netAfter25 >= 0 ? Colors.light.success : "#E53E3E"}
              />
            </View>

            {/* Monthly production chart */}
            <View style={styles.chartBox}>
              <Text style={styles.chartTitle}>
                <Feather name="bar-chart-2" size={13} color={Colors.light.accent} />
                {"  "}Produção Mensal Estimada (kWh)
              </Text>
              <Text style={styles.chartSub}>
                Total anual: {fmt(results.annualProductionKwh)} kWh
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <MonthlyChart data={results.monthlyKwh} />
              </ScrollView>
              <View style={styles.monthTable}>
                {results.monthlyKwh.map((v, i) => (
                  <View key={i} style={styles.monthRow}>
                    <Text style={styles.monthName}>{MONTHS[i]}</Text>
                    <View style={styles.monthBar}>
                      <View
                        style={[
                          styles.monthBarFill,
                          {
                            width: `${(v / Math.max(...results.monthlyKwh)) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.monthVal}>{fmt(v)} kWh</Text>
                    <Text style={styles.monthEur}>
                      ~{fmt(v * parseFloat(params.electricityPrice || "0.22"), 0)} €
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ROI chart */}
            <View style={styles.chartBox}>
              <Text style={styles.chartTitle}>
                <MaterialCommunityIcons name="chart-line" size={13} color={Colors.light.success} />
                {"  "}Retorno Acumulado ao Longo do Tempo (€)
              </Text>
              <Text style={styles.chartSub}>
                Ponto de equilíbrio:{" "}
                {results.paybackYears > 50
                  ? "mais de 50 anos"
                  : `Ano ${Math.ceil(results.paybackYears)}`}
                {" "}· Marca laranja = payback
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <RoiChart
                  data={results.cumulativeNet}
                  cost={parseFloat(params.investmentCost)}
                />
              </ScrollView>
              <View style={styles.roiLegend}>
                <View style={styles.legendDot}>
                  <View style={[styles.dot, { backgroundColor: Colors.light.success }]} />
                  <Text style={styles.legendLabel}>Retorno líquido acumulado (€)</Text>
                </View>
                <View style={styles.legendDot}>
                  <View style={[styles.dot, { backgroundColor: Colors.light.primary }]} />
                  <Text style={styles.legendLabel}>Payback (equilíbrio)</Text>
                </View>
              </View>
            </View>

            {/* Assumptions note */}
            <View style={styles.noteBox}>
              <MaterialCommunityIcons name="information-outline" size={14} color={Colors.light.tabIconDefault} />
              <Text style={styles.noteText}>
                Cálculo baseado em 1550 kWh/kWp/ano (média Portugal, orientação sul ótima).
                Degradação anual dos painéis: 0,5%. Aumento anual do preço da eletricidade: 3%.
                Valores estimativos — consulte um instalador certificado para análise detalhada.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scroll: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.light.secondary,
    alignItems: "center",
    justifyContent: "center",
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
  },
  section: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  flex: {
    flex: 1,
  },
  gap: {
    width: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  orientationRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  orientBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.backgroundSecondary,
    marginRight: 8,
    alignItems: "center",
    minWidth: 48,
  },
  orientBtnActive: {
    borderColor: Colors.light.accent,
    backgroundColor: Colors.light.accent + "18",
  },
  orientBtnLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.light.tabIconDefault,
  },
  orientBtnLabelActive: {
    color: Colors.light.accent,
  },
  orientBtnSub: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    color: Colors.light.tabIconDefault,
  },
  orientBtnSubActive: {
    color: Colors.light.accent,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLeft: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
    marginBottom: 2,
  },
  switchSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  calcButton: {
    backgroundColor: Colors.light.secondary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: Colors.light.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  calcButtonDisabled: {
    backgroundColor: Colors.light.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  calcButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  calcButtonTextDisabled: {
    color: Colors.light.textSecondary,
  },
  resultsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  resultsSectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    marginBottom: 12,
  },
  cardGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  resultCard: {
    flex: 1,
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  resultCardIcon: {
    marginTop: 2,
  },
  resultCardBody: {
    flex: 1,
  },
  resultCardLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  resultCardValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
  },
  resultCardValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  resultCardUnit: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  resultCardSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.tabIconDefault,
    marginTop: 2,
  },
  savingsBanner: {
    backgroundColor: Colors.light.secondary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  savingsLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)",
    marginBottom: 4,
  },
  savingsValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 2,
  },
  savingsSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
  },
  chartBox: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  chartTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  chartSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: 14,
  },
  monthTable: {
    marginTop: 12,
    gap: 6,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monthName: {
    width: 28,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
  },
  monthBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 4,
    overflow: "hidden",
  },
  monthBarFill: {
    height: "100%",
    backgroundColor: Colors.light.accent,
    borderRadius: 4,
    opacity: 0.8,
  },
  monthVal: {
    width: 64,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
    textAlign: "right",
  },
  monthEur: {
    width: 40,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.success,
    textAlign: "right",
  },
  roiLegend: {
    marginTop: 10,
    gap: 4,
  },
  legendDot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  noteBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    alignItems: "flex-start",
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.tabIconDefault,
    lineHeight: 16,
  },
});
