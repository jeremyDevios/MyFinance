import { useState, useMemo } from 'react';
import { useAssets } from '../hooks/useAssets';
import { usePrices } from '../hooks/usePrices';
import { useCurrency } from '../hooks/useCurrency';
import { useSettings } from '../contexts/SettingsContext';
import { CATEGORIES } from '../types';
import type { AssetCategory, CategorySummary, Asset } from '../types';
import { CategoryCard } from './CategoryCard';
import { AddAssetModal } from './AddAssetModal';
import { AllocationCharts } from './AllocationCharts';
import './Dashboard.css';

interface DashboardProps {
  onCategorySelect: (category: AssetCategory | null) => void;
  selectedCategory: AssetCategory | null;
}

export function Dashboard({ onCategorySelect, selectedCategory }: DashboardProps) {
  const { assets, loading } = useAssets();
  const { prices, metadata } = usePrices(assets);
  const { formatValue, exchangeRates } = useCurrency();
  const { patrimonyGoal } = useSettings();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Helper to get price in EUR
  const getPriceInEur = (assetId: string, price: number) => {
    const meta = metadata?.[assetId];
    if (meta?.currency && meta.currency !== 'EUR') {
      const rate = exchangeRates[meta.currency];
      if (rate) return price * rate;
    }
    return price;
  };

  // Helper to calculate invested value
  const getInvestedValue = (asset: Asset) => {
    if (asset.category === 'stocks' || asset.category === 'crypto') {
      const quantity = 'quantity' in asset ? (asset as any).quantity : 0;
      const purchasePrice = 'purchasePrice' in asset ? (asset as any).purchasePrice : 0;
      return quantity * purchasePrice;
    }
    if (asset.category === 'real_estate') {
      return (asset as any).purchasePrice || 0;
    }
    
    // For savings and current accounts, we consider them neutral (0% performance)
    // So invested value equals current value
    return asset.valueInEur;
  };

  // Calculate real-time portfolio summary
  const portfolioSummary = useMemo(() => {
    let totalValue = 0;
    let totalInvested = 0;

    // Calculate totals
    assets.forEach(asset => {
      // Current Value
      let currentValue = asset.valueInEur;
      const price = prices[asset.id];
      if (price !== undefined && price !== null && ['stocks', 'crypto'].includes(asset.category)) {
        const quantity = 'quantity' in asset ? (asset as any).quantity : 0;
        const eurPrice = getPriceInEur(asset.id, price);
        currentValue = eurPrice * quantity;
      }
      totalValue += currentValue;

      // Invested Value
      totalInvested += getInvestedValue(asset);
    });

    // Calculate category summaries
    const categoryTotals = Object.keys(CATEGORIES).reduce(
      (acc, cat) => {
        const category = cat as AssetCategory;
        const categoryAssets = assets.filter((a) => a.category === category);
        
        let catTotalValue = 0;
        let catTotalInvested = 0;

        categoryAssets.forEach(asset => {
          // Current
          let currentValue = asset.valueInEur;
          const price = prices[asset.id];
          if (price !== undefined && price !== null && ['stocks', 'crypto'].includes(asset.category)) {
            const quantity = 'quantity' in asset ? (asset as any).quantity : 0;
            const eurPrice = getPriceInEur(asset.id, price);
            currentValue = eurPrice * quantity;
          }
          catTotalValue += currentValue;

          // Invested
          catTotalInvested += getInvestedValue(asset);
        });
        
        acc[category] = {
          category,
          totalValue: catTotalValue,
          assetCount: categoryAssets.length,
          percentageOfTotal: totalValue > 0 ? (catTotalValue / totalValue) * 100 : 0,
          investedValue: catTotalInvested,
          performance: catTotalValue - catTotalInvested,
          performancePercent: catTotalInvested > 0 ? ((catTotalValue - catTotalInvested) / catTotalInvested) * 100 : 0
        };
        return acc;
      },
      {} as Record<AssetCategory, CategorySummary & { investedValue: number, performance: number, performancePercent: number }>
    );

    return {
      totalValue,
      totalInvested,
      performance: totalValue - totalInvested,
      performancePercent: totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0,
      categories: Object.values(categoryTotals),
      lastUpdated: new Date(),
    };
  }, [assets, prices]);

  if (loading) {
    return <div className="dashboard-loading">Chargement de vos finances...</div>;
  }

  const isPositive = portfolioSummary.performance > 0;
  const isNegative = portfolioSummary.performance < 0;
  const progressPercent = Math.min((portfolioSummary.totalValue / patrimonyGoal) * 100, 100);
  
  let gradientClass = '';
  if (isPositive) gradientClass = 'card-gradient-green';
  else if (isNegative) gradientClass = 'card-gradient-red';

  return (
    <div className="dashboard">
      <div className={`total-patrimony ${gradientClass}`}>
        <div className="total-patrimony-content">
          <div className="total-header">
            <span className="net-label">PATRIMOINE</span>
            <div className="last-updated">
              Mise à jour: {portfolioSummary.lastUpdated.toLocaleDateString('fr-FR')}
            </div>
          </div>
          <div className="total-value">{formatValue(portfolioSummary.totalValue)}</div>
          
          <div className="total-performance">
            <span className="perf-percent">
              {isPositive ? '+' : ''}{portfolioSummary.performancePercent.toFixed(1)}%
            </span>
            <span className="perf-separator">-</span>
            <span className="perf-value">
              {isPositive ? '+' : ''}{formatValue(portfolioSummary.performance)}
            </span>
          </div>

          <div className="goal-progress-container">
            <div className="goal-info">
              <span>Objectif: {formatValue(patrimonyGoal)}</span>
              <span>{progressPercent.toFixed(1)}%</span>
            </div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {portfolioSummary.totalValue > 0 && (
        <AllocationCharts assets={assets} prices={prices} metadata={metadata} />
      )}

      {portfolioSummary.totalValue === 0 && assets.length === 0 && (
        <div className="empty-state">
          <p>Vous n'avez pas encore ajouté d'actifs.</p>
          <p>Commencez par ajouter une transaction ci-dessous.</p>
        </div>
      )}

      <div className="categories-grid">
        {portfolioSummary.categories.map((categorySummary) => {
          const categoryInfo = CATEGORIES[categorySummary.category];
          // Only show categories with assets or if it's the selected one
          if (categorySummary.totalValue === 0 && selectedCategory !== categorySummary.category && categorySummary.assetCount === 0) {
             // Skip empty categories if not selected
          }
          
          return (
            <CategoryCard
              key={categorySummary.category}
              categoryInfo={categoryInfo}
              summary={categorySummary}
              isSelected={selectedCategory === categorySummary.category}
              performance={categorySummary.performance}
              performancePercent={categorySummary.performancePercent}
              onClick={() =>
                onCategorySelect(
                  selectedCategory === categorySummary.category
                    ? null
                    : categorySummary.category
                )
              }
            />
          );
        })}
      </div>

      <button 
        className="btn-add-manual" 
        onClick={() => setIsAddModalOpen(true)}
        aria-label="Ajouter une transaction manuellement"
      >
        <span className="icon">+</span> Ajout manuel
      </button>

      <AddAssetModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </div>
  );
}
