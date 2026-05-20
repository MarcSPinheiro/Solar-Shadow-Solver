import React, { createContext, useContext, useState, useMemo } from "react";

export interface SolarParams {
  height: string;
  width: string;
  angle: string;
  latitude: string;
  rows: string;
  cols: string;
}

export interface SolarResult {
  gap: number;
  rowSpacing: number;
  shadowLength: number;
  declinationAngle: number;
  altitudeAngle: number;
  totalWidth: number;
  totalLength: number;
  panelHeight: number;
  panelWidth: number;
  panelAngle: number;
  panelProjectedDepth: number;
}

interface SolarContextType {
  params: SolarParams;
  setParams: React.Dispatch<React.SetStateAction<SolarParams>>;
  results: SolarResult;
}

const defaultParams: SolarParams = {
  height: "2.28",
  width: "1.13",
  angle: "30",
  latitude: "38.7",
  rows: "4",
  cols: "5",
};

const SolarContext = createContext<SolarContextType | undefined>(undefined);

function computeSolar(params: SolarParams): SolarResult {
  const h = parseFloat(params.height) || 1.0;
  const w = parseFloat(params.width) || 1.0;
  const beta = parseFloat(params.angle) || 20;
  const lat = parseFloat(params.latitude) || 38.7;
  const rows = parseInt(params.rows) || 4;
  const cols = parseInt(params.cols) || 5;
  
  const toRad = (deg: number) => deg * Math.PI / 180;
  const dec = lat >= 0 ? -23.45 : 23.45;
  const altDeg = 90 - Math.abs(lat) + dec;
  const altRad = toRad(Math.max(altDeg, 1));
  
  const panelProjectedDepth = h * Math.cos(toRad(beta));
  const panelProjectedHeight = h * Math.sin(toRad(beta));
  const shadowFromTop = panelProjectedHeight / Math.tan(altRad);
  const shadowLength = panelProjectedDepth + shadowFromTop;
  
  const gap = shadowFromTop;
  const rowSpacing = panelProjectedDepth + gap;
  
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
    panelProjectedDepth
  };
}

export function SolarProvider({ children }: { children: React.ReactNode }) {
  const [params, setParams] = useState<SolarParams>(defaultParams);
  const results = useMemo(() => computeSolar(params), [params]);

  return (
    <SolarContext.Provider value={{ params, setParams, results }}>
      {children}
    </SolarContext.Provider>
  );
}

export function useSolar() {
  const context = useContext(SolarContext);
  if (context === undefined) {
    throw new Error("useSolar must be used within a SolarProvider");
  }
  return context;
}
