import { useState, type ReactNode, useEffect } from 'react';
import type { Currency } from '../types';
import { exchangeRates as initialRates } from '../data/sampleData';
import { CurrencyContext } from './currencyContextType';
import { priceService } from '../services/priceService';

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
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(initialRates);

  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        // Fetch EURUSD=X (1 EUR = x USD) -> We need 1 USD = y EUR
        const usdResult = await priceService.getYahooPrice('EURUSD=X');
        if (usdResult.price) {
          setExchangeRates(prev => ({
            ...prev,
            USD: 1 / usdResult.price!
          }));
        }
      } catch (e) {
        console.warn('Failed to fetch live exchange rates', e);
      }
    };
    fetchExchangeRates();
  }, []);

  const convertFromEur = (valueInEur: number): number => {
    if (currency === 'EUR') return valueInEur;
    // Convert EUR to target currency (rate is value in EUR of 1 unit of target currency)
    const rate = exchangeRates[currency];
    if (!rate) return valueInEur; // Fallback
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
        exchangeRates,
        convertFromEur,
        formatValue,
        getSymbol,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
