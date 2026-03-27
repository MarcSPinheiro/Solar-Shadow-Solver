import React, { createContext, useContext, useState, ReactNode } from "react";

export interface ClientData {
  name: string;
  address: string;
  nif: string;
  phone: string;
  email: string;
  notes: string;
}

const defaultClient: ClientData = {
  name: "",
  address: "",
  nif: "",
  phone: "",
  email: "",
  notes: "",
};

interface ClientContextType {
  client: ClientData;
  setClient: (data: ClientData) => void;
  updateClient: (key: keyof ClientData, value: string) => void;
}

const ClientContext = createContext<ClientContextType | null>(null);

export function ClientProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ClientData>(defaultClient);

  const updateClient = (key: keyof ClientData, value: string) => {
    setClient((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <ClientContext.Provider value={{ client, setClient, updateClient }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error("useClient must be used inside ClientProvider");
  return ctx;
}
