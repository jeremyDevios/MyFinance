import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAssets } from '../hooks/useAssets';
import { priceService } from '../services/priceService';
import type { Asset } from '../types';

interface PriceContextType {
  prices: Record<string, number>;
  metadata: Record<string, any>;
  errors: Record<string, string>;
  loading: boolean;
  refreshPrices: () => Promise<void>;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

const REFRESH_INTERVAL = 60000; // 1 minute

export function PriceProvider({ children }: { children: React.ReactNode }) {
  const { assets } = useAssets();
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const fetchPrices = useCallback(async (currentAssets: Asset[]) => {
    if (currentAssets.length === 0) return;
    
    setLoading(true);
    
    const newPrices: Record<string, number> = {};
    const newMetadata: Record<string, any> = {};
    const newErrors: Record<string, string> = {};

    const cryptoAssets = currentAssets.filter(a => a.category === 'crypto');
    const stockAssets = currentAssets.filter(a => a.category === 'stocks');

    try {
      // Parallel fetch for Crypto
      const cryptoPromises = cryptoAssets.map(async (asset) => {
        if (!('symbol' in asset)) return null;
        try {
          const result = await priceService.getCryptoPrice(asset.symbol);
          if (result.price !== null) {
            return { id: asset.id, price: result.price, metadata: result.metadata, type: 'price' };
          } else if (result.error) {
            return { id: asset.id, error: result.error, type: 'error' };
          }
        } catch (e) {
          console.error(`Error fetching crypto ${asset.symbol}`, e);
        }
        return null;
      });

      // Parallel fetch for Stocks
      const stockPromises = stockAssets.map(async (asset) => {
        if ((asset as any).isListed === false) return null;
        if (!('ticker' in asset)) return null;

        try {
          // Use empty API key rely on service fallback
          const result = await priceService.getStockPrice(asset.ticker, ''); 
          if (result.price !== null) {
            return { id: asset.id, price: result.price, metadata: result.metadata, type: 'price' };
          } else if (result.error) {
            return { id: asset.id, error: result.error, type: 'error' };
          }
        } catch (e) {
          console.error(`Error fetching stock ${asset.ticker}`, e);
        }
        return null;
      });

      const promises = [...cryptoPromises, ...stockPromises];
      const results = await Promise.all(promises);

      results.forEach(res => {
        if (!res) return;
        if (res.type === 'price') {
          // @ts-ignore
          newPrices[res.id] = res.price;
          // @ts-ignore
          if (res.metadata) newMetadata[res.id] = res.metadata;
        } else if (res.type === 'error') {
          // @ts-ignore
          newErrors[res.id] = res.error;
        }
      });
      
      setPrices(prev => ({ ...prev, ...newPrices }));
      setMetadata(prev => ({ ...prev, ...newMetadata }));
      setErrors(prev => ({ ...prev, ...newErrors }));

    } catch (globalError) {
      console.error("Global error in fetchPrices", globalError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let intervalId: any;

    if (assets.length > 0) {
      fetchPrices(assets);
      intervalId = setInterval(() => {
        fetchPrices(assets);
      }, REFRESH_INTERVAL);
    } 
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [assets, fetchPrices]);

  const value = {
    prices,
    metadata,
    errors,
    loading,
    refreshPrices: () => fetchPrices(assets)
  };

  return (
    <PriceContext.Provider value={value}>
      {children}
    </PriceContext.Provider>
  );
}

export function usePriceContext() {
  const context = useContext(PriceContext);
  if (context === undefined) {
    throw new Error('usePriceContext must be used within a PriceProvider');
  }
  return context;
}
