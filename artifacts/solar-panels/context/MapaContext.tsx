import React, { createContext, useContext, useState, ReactNode } from "react";

export interface MapaData {
  roofArea: number;
  panelCount: number;
  capacity: number;
  totalKwp: number;
  adjKwp: number;
  azimuth: number;
  orientationLabel: string;
  penaltyPct: number;
  panelW: number;
  panelH: number;
  powerWp: number;
  roofBoundsW: number;
  roofBoundsH: number;
}

interface MapaContextType {
  mapaData: MapaData | null;
  setMapaData: (data: MapaData | null) => void;
}

const MapaContext = createContext<MapaContextType | null>(null);

export function useMapaContext() {
  const ctx = useContext(MapaContext);
  if (!ctx) throw new Error("useMapaContext must be used within MapaProvider");
  return ctx;
}

export function MapaProvider({ children }: { children: ReactNode }) {
  const [mapaData, setMapaData] = useState<MapaData | null>(null);
  return (
    <MapaContext.Provider value={{ mapaData, setMapaData }}>
      {children}
    </MapaContext.Provider>
  );
}
