import { createContext } from 'react';
import type { Currency } from '../types';

export interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertFromEur: (valueInEur: number) => number;
  formatValue: (value: number) => string;
  getSymbol: () => string;
}

export const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);
