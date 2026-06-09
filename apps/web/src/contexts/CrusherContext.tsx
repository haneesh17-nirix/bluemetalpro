'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CrusherInfo {
  id: string;
  name: string;
  legal_name?: string;
  gstin?: string;
  city?: string;
  state?: string;
  logo_url?: string;
  invoice_prefix?: string;
  quarry_invoice_prefix?: string;
  bank_name?: string;
  bank_account?: string;
  bank_ifsc?: string;
  bank_branch?: string;
  address?: string;
  phone?: string;
  email?: string;
  terms_conditions?: string;
}

interface CrusherContextValue {
  crusher: CrusherInfo | null;
  setCrusher: (c: CrusherInfo | null) => void;
}

const CrusherContext = createContext<CrusherContextValue>({ crusher: null, setCrusher: () => {} });

export function CrusherProvider({ children }: { children: ReactNode }) {
  const [crusher, setCrusherState] = useState<CrusherInfo | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('crusher');
      if (stored) setCrusherState(JSON.parse(stored));
    }
  }, []);

  const setCrusher = (c: CrusherInfo | null) => {
    setCrusherState(c);
    if (typeof window !== 'undefined') {
      if (c) localStorage.setItem('crusher', JSON.stringify(c));
      else localStorage.removeItem('crusher');
    }
  };

  return <CrusherContext.Provider value={{ crusher, setCrusher }}>{children}</CrusherContext.Provider>;
}

export const useCrusher = () => useContext(CrusherContext);
