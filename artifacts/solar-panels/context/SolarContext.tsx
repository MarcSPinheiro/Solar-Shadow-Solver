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
  minDistance: number;
  shadowLength: number;
  declinationAngle: number;
  altitudeAngle: number;
  totalWidth: number;
  totalLength: number;
  panelHeight: number;
  panelWidth: number;
  panelAngle: number;
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
  const lat = parseFloat(params.latitude) || -20;
  const rows = parseInt(params.rows) || 4;
  const cols = parseInt(params.cols) || 5;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  // Winter solstice declination (worst case, June 21 for southern hemisphere or Dec 21 for northern)
  const dec = lat >= 0 ? -23.45 : 23.45;

  // Solar altitude angle at solar noon (worst case - winter solstice)
  const altRad = toRad(90 - Math.abs(lat) + dec);
  const alt = toDeg(altRad);

  // Height of the top of the inclined panel above ground
  const panelProjectedHeight = h * Math.sin(toRad(beta));
  const panelProjectedHorizontal = h * Math.cos(toRad(beta));

  // Shadow length cast by the top of the panel
  const shadowLength = panelProjectedHeight / Math.tan(altRad > 0 ? altRad : toRad(1));

  // Minimum distance between rows (from end of one panel to start of next)
  const minDistance = shadowLength - panelProjectedHorizontal;

  const totalWidth = cols * w + (cols - 1) * 0.5;
  const totalLength = rows * h * Math.cos(toRad(beta)) + (rows - 1) * Math.max(minDistance, 0.3);

  return {
    minDistance: Math.max(minDistance, 0.3),
    shadowLength,
    declinationAngle: dec,
    altitudeAngle: alt,
    totalWidth,
    totalLength,
    panelHeight: h,
    panelWidth: w,
    panelAngle: beta,
  };
}

const defaultParams: SolarParams = {
  height: "1.65",
  width: "1.0",
  angle: "20",
  latitude: "-22",
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
