import { useMemo } from 'react';
import type { Asset, AssetCategory, CategorySummary, PortfolioSummary } from '../types';
import { CATEGORIES } from '../types';
import { sampleAssets } from '../data/sampleData';

export function useAssets() {
  const assets = sampleAssets;

  const getAssetsByCategory = (category: AssetCategory): Asset[] => {
    return assets.filter((asset) => asset.category === category);
  };

  const portfolioSummary: PortfolioSummary = useMemo(() => {
    const totalValue = assets.reduce((sum, asset) => sum + asset.valueInEur, 0);

    const categoryTotals = Object.keys(CATEGORIES).reduce(
      (acc, cat) => {
        const category = cat as AssetCategory;
        const categoryAssets = assets.filter((a) => a.category === category);
        const categoryTotal = categoryAssets.reduce((sum, a) => sum + a.valueInEur, 0);
        
        acc[category] = {
          category,
          totalValue: categoryTotal,
          assetCount: categoryAssets.length,
          percentageOfTotal: totalValue > 0 ? (categoryTotal / totalValue) * 100 : 0,
        };
        return acc;
      },
      {} as Record<AssetCategory, CategorySummary>
    );

    return {
      totalValue,
      categories: Object.values(categoryTotals),
      lastUpdated: new Date(),
    };
  }, [assets]);

  return {
    assets,
    getAssetsByCategory,
    portfolioSummary,
  };
}
