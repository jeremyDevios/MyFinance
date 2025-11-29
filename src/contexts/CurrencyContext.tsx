import { useState, type ReactNode } from 'react';
import type { Currency } from '../types';
import { exchangeRates } from '../data/sampleData';
import { CurrencyContext } from './currencyContextType';

const currencySymbols: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF',
  JPY: '¥',
};

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [currency, setCurrency] = useState<Currency>('EUR');

  const convertFromEur = (valueInEur: number): number => {
    if (currency === 'EUR') return valueInEur;
    // Convert EUR to target currency
    const rate = exchangeRates[currency];
    return valueInEur / rate;
  };

  const formatValue = (value: number): string => {
    const convertedValue = convertFromEur(value);
    const symbol = currencySymbols[currency];
    
    // Format with appropriate decimal places
    const decimals = currency === 'JPY' ? 0 : 2;
    const formattedNumber = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(convertedValue);

    return `${formattedNumber} ${symbol}`;
  };

  const getSymbol = (): string => currencySymbols[currency];

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        convertFromEur,
        formatValue,
        getSymbol,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
