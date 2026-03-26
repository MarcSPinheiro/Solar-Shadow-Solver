import React, { createContext, useContext, useState, ReactNode } from "react";

export interface SolarParams {
  height: string;
  width: string;
  angle: string;
  latitude: string;
  rows: string;
  cols: string;
}

export interface SolarResults {
  gap: number;           // espaço livre entre fileiras (fim do 1º ao início do 2º)
  rowSpacing: number;    // distância início ao início (painel 1 ao painel 2)
  shadowLength: number;
  declinationAngle: number;
  altitudeAngle: number;
  totalWidth: number;
  totalLength: number;
  panelHeight: number;
  panelWidth: number;
  panelAngle: number;
  panelProjectedDepth: number; // projeção horizontal do painel
}

interface SolarContextType {
  params: SolarParams;
  results: SolarResults | null;
  setParams: (params: SolarParams) => void;
  calculate: (params: SolarParams) => void;
}

const SolarContext = createContext<SolarContextType | null>(null);

export function useSolar() {
  const ctx = useContext(SolarContext);
  if (!ctx) throw new Error("useSolar must be used within SolarProvider");
  return ctx;
}

function computeSolar(params: SolarParams): SolarResults {
  const h = parseFloat(params.height) || 1.0;
  const w = parseFloat(params.width) || 1.0;
  const beta = parseFloat(params.angle) || 20;
  const lat = parseFloat(params.latitude) || 38.7;
  const rows = parseInt(params.rows) || 4;
  const cols = parseInt(params.cols) || 5;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  // Declinação solar no solstício de inverno (pior caso)
  // Hemisfério norte (Portugal): 21 dezembro → δ = -23.45°
  // Hemisfério sul: 21 junho → δ = +23.45°
  const dec = lat >= 0 ? -23.45 : 23.45;

  // Ângulo de altitude solar ao meio-dia no solstício de inverno
  const altDeg = 90 - Math.abs(lat) + dec;
  const altRad = toRad(Math.max(altDeg, 1)); // evitar divisão por zero

  // Projeção horizontal e vertical do painel inclinado
  const panelProjectedDepth = h * Math.cos(toRad(beta));
  const panelProjectedHeight = h * Math.sin(toRad(beta));

  // Comprimento da sombra projectada no chão (desde a base do painel)
  const shadowLength = panelProjectedHeight / Math.tan(altRad);

  // Espaço livre entre fileiras (gap) = sombra total - projeção horizontal do painel
  const rawGap = shadowLength - panelProjectedDepth;
  const gap = Math.max(rawGap, 0.2);

  // Distância início ao início do painel seguinte
  const rowSpacing = panelProjectedDepth + gap;

  // Dimensões totais do array
  const totalWidth = cols * w + (cols - 1) * 0.05;
  const totalLength = panelProjectedDepth + (rows - 1) * rowSpacing;

  return {
    gap,
    rowSpacing,
    shadowLength,
    declinationAngle: dec,
    altitudeAngle: altDeg,
    totalWidth,
    totalLength,
    panelHeight: h,
    panelWidth: w,
    panelAngle: beta,
    panelProjectedDepth,
  };
}

const defaultParams: SolarParams = {
  height: "1.65",
  width: "1.0",
  angle: "20",
  latitude: "38.7",
  rows: "4",
  cols: "5",
};

export function SolarProvider({ children }: { children: ReactNode }) {
  const [params, setParamsState] = useState<SolarParams>(defaultParams);
  const [results, setResults] = useState<SolarResults | null>(computeSolar(defaultParams));

  const setParams = (p: SolarParams) => {
    setParamsState(p);
  };

  const calculate = (p: SolarParams) => {
    setParamsState(p);
    const r = computeSolar(p);
    setResults(r);
  };

  return (
    <SolarContext.Provider value={{ params, results, setParams, calculate }}>
      {children}
    </SolarContext.Provider>
  );
}
