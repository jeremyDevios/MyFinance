import { useState, useEffect } from 'react';
import { priceService, type StockMetadata } from '../services/priceService';
import { useSettings } from '../contexts/SettingsContext';
import type { Asset } from '../types';

export function usePrices(assets: Asset[]) {
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [metadata, setMetadata] = useState<Record<string, StockMetadata>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true); 
  const { finnhubApiKey } = useSettings();

  // Create a stable key for assets to prevent infinite loops
  const assetsKey = JSON.stringify(assets.map(a => {
    // Include lastUpdated to force refresh if asset is edited
    // But exclude it normally to avoid refresh loops if we were updating asset timestamps
    // Here we only care about identity essential for pricing
    if (a.category === 'stocks') return `stock:${(a as any).ticker}`;
    if (a.category === 'crypto') return `crypto:${(a as any).symbol}`;
    return a.id;
  }));

  // Determine if we actually have assets that need pricing
  const hasPricedAssets = assets.some(a => 
    (a.category === 'stocks' && (a as any).isListed !== false) || 
    a.category === 'crypto'
  );

  useEffect(() => {
    if (!hasPricedAssets) {
      setLoading(false);
      return;
    }

    const fetchPrices = async () => {
      // Don't set loading to true on background refreshes to avoid UI flickering
      // But ensure it starts as true on first mount or significant changes
      // Actually, we should probably only set it to true if we don't have prices for the CURRENT assets yet.
      // But since we are fetching based on assetsKey, let's keep it simple.
      // If we have cached prices, maybe don't show loading? 
      // Current implementation: only set true if prices state is empty.
      if (Object.keys(prices).length === 0) {
        setLoading(true);
      }
      
      const newPrices: Record<string, number | null> = {};
      const newMetadata: Record<string, StockMetadata> = {};
      const newErrors: Record<string, string> = {};
      
      // Filter assets that need price updates
      const cryptoAssets = assets.filter(a => a.category === 'crypto');
      const stockAssets = assets.filter(a => a.category === 'stocks');

      try {
        // Fetch Crypto Prices
        for (const asset of cryptoAssets) {
          if ('symbol' in asset) {
            try {
              const result = await priceService.getCryptoPrice(asset.symbol);
              if (result.price !== null) {
                newPrices[asset.id] = result.price;
                if (result.metadata) newMetadata[asset.id] = result.metadata;
              } else if (result.error) {
                newErrors[asset.id] = result.error;
              }
            } catch (e) {
              console.error(`Error fetching crypto ${asset.symbol}`, e);
            }
          }
        }

        // Fetch Stock Prices
        for (const asset of stockAssets) {
          // Skip unlisted stocks (manual update)
          if ((asset as any).isListed === false) continue;

          if ('ticker' in asset) {
            try {
              // We now allow fetching without a key (will use Yahoo fallback)
              const result = await priceService.getStockPrice(asset.ticker, finnhubApiKey);
              if (result.price !== null) {
                newPrices[asset.id] = result.price;
                if (result.metadata) newMetadata[asset.id] = result.metadata;
              } else if (result.error) {
                newErrors[asset.id] = result.error;
              }
            } catch (e) {
              console.error(`Error fetching stock ${asset.ticker}`, e);
            }
          }
        }
      } catch (globalError) {
        console.error("Global error in fetchPrices", globalError);
      }

      setPrices(prev => ({ ...prev, ...newPrices }));
      setMetadata(prev => ({ ...prev, ...newMetadata }));
      setErrors(prev => ({ ...prev, ...newErrors }));
      setLoading(false);
    };

    fetchPrices();
    
    // Refresh prices every 10 seconds
    const intervalId = setInterval(fetchPrices, 10000);
    return () => clearInterval(intervalId);

  }, [assetsKey, finnhubApiKey]); // Use stable key instead of assets array

  return { prices, metadata, errors, loading };
}
