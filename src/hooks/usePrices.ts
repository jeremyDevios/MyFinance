import { useMemo } from 'react';
import { usePriceContext } from '../contexts/PriceContext';
import type { Asset } from '../types';

export function usePrices(assets: Asset[]) {
  const { prices: allPrices, metadata: allMetadata, errors: allErrors, loading: contextLoading, refreshPrices } = usePriceContext();

  const prices = useMemo(() => {
    const result: Record<string, number> = {};
    assets.forEach(asset => {
      if (allPrices[asset.id] !== undefined) {
        result[asset.id] = allPrices[asset.id];
      }
    });
    return result;
  }, [allPrices, assets]); // Note: assets changes on every snapshot, might be frequent if assets update often.
  // But prices updates more often?

  const metadata = useMemo(() => {
    const result: Record<string, any> = {};
    assets.forEach(asset => {
      if (allMetadata[asset.id] !== undefined) {
        result[asset.id] = allMetadata[asset.id];
      }
    });
    return result;
  }, [allMetadata, assets]);

  const errors = useMemo(() => {
    const result: Record<string, string> = {};
    assets.forEach(asset => {
      if (allErrors[asset.id] !== undefined) {
        result[asset.id] = allErrors[asset.id];
      }
    });
    return result;
  }, [allErrors, assets]);

  // Loading Logic:
  // If we have prices for all the requested (priceable) assets, we are not loading.
  // If we miss some prices, we are loading if context is loading.
  const loading = useMemo(() => {
    const pricedAssets = assets.filter(a => 
      (a.category === 'stocks' && (a as any).isListed !== false) || 
      a.category === 'crypto'
    );

    if (pricedAssets.length === 0) return false;

    // Check if we are missing any prices
    const missingPrice = pricedAssets.some(a => 
      allPrices[a.id] === undefined && allErrors[a.id] === undefined
    );

    if (!missingPrice) return false;

    return contextLoading;
  }, [assets, allPrices, allErrors, contextLoading]);

  return { prices, metadata, errors, loading, refresh: refreshPrices };
}
