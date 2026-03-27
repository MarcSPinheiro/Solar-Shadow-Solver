import React, { createContext, useContext, useState, useMemo, ReactNode } from "react";

// ─── Monthly irradiation factors (Portugal, sum = 1.0) ───────────────────────
export const MONTHLY_FACTORS = [
  0.050, 0.063, 0.087, 0.095, 0.109, 0.114,
  0.119, 0.110, 0.091, 0.068, 0.050, 0.044,
];

export const ORIENTATIONS = [
  { label: "S",  full: "Sul",       factor: 1.00 },
  { label: "SW", full: "Sudoeste",  factor: 0.95 },
  { label: "SE", full: "Sudeste",   factor: 0.95 },
  { label: "W",  full: "Oeste",     factor: 0.82 },
  { label: "E",  full: "Este",      factor: 0.82 },
  { label: "NW", full: "Noroeste",  factor: 0.68 },
  { label: "NE", full: "Nordeste",  factor: 0.68 },
  { label: "N",  full: "Norte",     factor: 0.55 },
];

export function getInclinationFactor(deg: number): number {
  const table: [number, number][] = [
    [0, 0.78], [10, 0.88], [20, 0.95], [30, 0.99], [35, 1.00],
    [40, 0.99], [45, 0.97], [60, 0.89], [75, 0.78], [90, 0.65],
  ];
  if (deg <= 0) return 0.78;
  if (deg >= 90) return 0.65;
  for (let i = 0; i < table.length - 1; i++) {
    const [a, fa] = table[i];
    const [b, fb] = table[i + 1];
    if (deg >= a && deg <= b) return fa + (fb - fa) * (deg - a) / (b - a);
  }
  return 1.0;
}

export function calcSelfConsumption(
  productionKwh: number,
  consumptionKwh: number,
  hasBattery: boolean,
  batteryCapacityKwh: number
): { selfKwh: number; selfRate: number } {
  if (productionKwh <= 0) return { selfKwh: 0, selfRate: 0 };
  if (consumptionKwh <= 0) {
    const r = hasBattery
      ? Math.min(0.85, 0.30 + (batteryCapacityKwh * 365 * 0.9) / Math.max(1, productionKwh))
      : 0.30;
    return { selfKwh: productionKwh * r, selfRate: r };
  }
  const directKwh = Math.min(productionKwh * 0.42, consumptionKwh);
  if (!hasBattery || batteryCapacityKwh <= 0) {
    return { selfKwh: directKwh, selfRate: directKwh / productionKwh };
  }
  const batteryThroughput = batteryCapacityKwh * 365 * 0.90;
  const excess = Math.max(0, productionKwh - directKwh);
  const unmet  = Math.max(0, consumptionKwh - directKwh);
  const battKwh = Math.min(batteryThroughput, excess, unmet);
  const selfKwh = directKwh + battKwh;
  return { selfKwh, selfRate: Math.min(1, selfKwh / productionKwh) };
}

// ─── Types ───────────────────────────────────────────────────────────────────
export interface RoiParams {
  investmentCost: string;
  panelPower: string;
  numPanels: string;
  inclination: string;
  inverterPower: string;
  annualConsumption: string;
  batteryCapacity: string;
  electricityPrice: string;
  feedInTariff: string;
}

export interface RoiResults {
  totalPowerKwp: number;
  annualProductionKwh: number;
  monthlyKwh: number[];
  annualSavingsEur: number;
  selfKwh: number;
  selfRate: number;
  exportKwh: number;
  consumptionCoveredPct: number | null;
  paybackYears: number;
  netAfter20: number;
  netAfter25: number;
  cumulativeNet: number[];
}

function computeRoi(
  params: RoiParams,
  orientation: string,
  hasBattery: boolean
): RoiResults | null {
  const cost      = parseFloat(params.investmentCost);
  const panelW    = parseFloat(params.panelPower);
  const n         = parseFloat(params.numPanels);
  const inclDeg   = parseFloat(params.inclination) || 30;
  const price     = parseFloat(params.electricityPrice) || 0.22;
  const feedIn    = parseFloat(params.feedInTariff) || 0.05;
  const consKwh   = parseFloat(params.annualConsumption) || 0;
  const battCap   = parseFloat(params.batteryCapacity) || 0;

  if (!cost || !panelW || !n || cost <= 0 || panelW <= 0 || n <= 0) return null;

  const orientFactor = ORIENTATIONS.find((o) => o.label === orientation)?.factor ?? 1.0;
  const inclFactor   = getInclinationFactor(inclDeg);
  const totalPowerKwp = (panelW * n) / 1000;
  const annualProductionKwh = totalPowerKwp * 1550 * orientFactor * inclFactor;

  const { selfKwh, selfRate } = calcSelfConsumption(annualProductionKwh, consKwh, hasBattery, battCap);
  const exportKwh = annualProductionKwh - selfKwh;
  const annualSavingsEur = selfKwh * price + exportKwh * feedIn;
  const monthlyKwh = MONTHLY_FACTORS.map((f) => annualProductionKwh * f);
  const paybackYears = annualSavingsEur > 0 ? cost / annualSavingsEur : Infinity;
  const consumptionCoveredPct = consKwh > 0 ? Math.min(100, (selfKwh / consKwh) * 100) : null;

  const cumulativeNet: number[] = [];
  let cum = 0;
  for (let y = 1; y <= 25; y++) {
    cum += annualSavingsEur * Math.pow(0.995, y - 1) * Math.pow(1.03, y - 1);
    cumulativeNet.push(cum - cost);
  }

  return {
    totalPowerKwp, annualProductionKwh, monthlyKwh,
    annualSavingsEur, selfKwh, selfRate, exportKwh,
    consumptionCoveredPct, paybackYears,
    netAfter20: cumulativeNet[19], netAfter25: cumulativeNet[24], cumulativeNet,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface RoiContextType {
  params: RoiParams;
  orientation: string;
  hasBattery: boolean;
  results: RoiResults | null;
  calculated: boolean;
  setOrientation: (o: string) => void;
  setHasBattery: (v: boolean) => void;
  updateParam: (key: keyof RoiParams, value: string) => void;
  calculate: () => void;
  selfRatePreview: number | null;
}

const RoiContext = createContext<RoiContextType | null>(null);

const defaultParams: RoiParams = {
  investmentCost: "",
  panelPower: "",
  numPanels: "",
  inclination: "",
  inverterPower: "",
  annualConsumption: "",
  batteryCapacity: "",
  electricityPrice: "0.22",
  feedInTariff: "0.05",
};

export function RoiProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useState<RoiParams>(defaultParams);
  const [orientation, setOrientation] = useState("S");
  const [hasBattery, setHasBattery] = useState(false);
  const [calculated, setCalculated] = useState(false);

  const updateParam = (key: keyof RoiParams, value: string) => {
    setParams((p) => ({ ...p, [key]: value }));
    setCalculated(false);
  };

  const calculate = () => setCalculated(true);

  const results = useMemo(() => {
    if (!calculated) return null;
    return computeRoi(params, orientation, hasBattery);
  }, [calculated, params, orientation, hasBattery]);

  const selfRatePreview = useMemo(() => {
    const pW = parseFloat(params.panelPower);
    const pN = parseFloat(params.numPanels);
    if (!pW || !pN) return null;
    const prod = (pW * pN / 1000) * 1550;
    const cons = parseFloat(params.annualConsumption) || 0;
    const cap  = parseFloat(params.batteryCapacity) || 0;
    return calcSelfConsumption(prod, cons, hasBattery, cap).selfRate;
  }, [params.panelPower, params.numPanels, params.annualConsumption, params.batteryCapacity, hasBattery]);

  return (
    <RoiContext.Provider value={{
      params, orientation, hasBattery, results, calculated,
      setOrientation, setHasBattery, updateParam, calculate, selfRatePreview,
    }}>
      {children}
    </RoiContext.Provider>
  );
}

export function useRoi() {
  const ctx = useContext(RoiContext);
  if (!ctx) throw new Error("useRoi must be used inside RoiProvider");
  return ctx;
}
