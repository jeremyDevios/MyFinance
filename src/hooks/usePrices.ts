import { useState, useEffect } from 'react';
import { priceService, type StockMetadata } from '../services/priceService';
import { useSettings } from '../contexts/SettingsContext';
import type { Asset } from '../types';

export function usePrices(assets: Asset[]) {
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [metadata, setMetadata] = useState<Record<string, StockMetadata>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { finnhubApiKey } = useSettings();

  // Create a stable key for assets to prevent infinite loops
  const assetsKey = JSON.stringify(assets.map(a => {
    if (a.category === 'stocks') return `stock:${(a as any).ticker}`;
    if (a.category === 'crypto') return `crypto:${(a as any).symbol}`;
    return a.id;
  }));

  useEffect(() => {
    const fetchPrices = async () => {
      // Don't set loading to true on background refreshes to avoid UI flickering
      // Only set it if we have no prices yet
      if (Object.keys(prices).length === 0) {
        setLoading(true);
      }
      
      const newPrices: Record<string, number | null> = {};
      const newMetadata: Record<string, StockMetadata> = {};
      const newErrors: Record<string, string> = {};
      
      // Filter assets that need price updates
      const cryptoAssets = assets.filter(a => a.category === 'crypto');
      const stockAssets = assets.filter(a => a.category === 'stocks');

      // Fetch Crypto Prices
      for (const asset of cryptoAssets) {
        if ('symbol' in asset) {
          const result = await priceService.getCryptoPrice(asset.symbol);
          if (result.price !== null) {
            newPrices[asset.id] = result.price;
            if (result.metadata) newMetadata[asset.id] = result.metadata;
          } else if (result.error) {
            newErrors[asset.id] = result.error;
          }
        }
      }

      // Fetch Stock Prices
      for (const asset of stockAssets) {
        // Skip unlisted stocks (manual update)
        if ((asset as any).isListed === false) continue;

        if ('ticker' in asset) {
          // We now allow fetching without a key (will use Yahoo fallback)
          const result = await priceService.getStockPrice(asset.ticker, finnhubApiKey);
          if (result.price !== null) {
            newPrices[asset.id] = result.price;
            if (result.metadata) newMetadata[asset.id] = result.metadata;
          } else if (result.error) {
            newErrors[asset.id] = result.error;
          }
        }
      }

      setPrices(prev => ({ ...prev, ...newPrices }));
      setMetadata(prev => ({ ...prev, ...newMetadata }));
      setErrors(prev => ({ ...prev, ...newErrors }));
      setLoading(false);
    };

    if (assets.length > 0) {
      fetchPrices();
      
      // Refresh prices every 10 seconds
      const intervalId = setInterval(fetchPrices, 10000);
      return () => clearInterval(intervalId);
    }
  }, [assetsKey, finnhubApiKey]); // Use stable key instead of assets array

  return { prices, metadata, errors, loading };
}
