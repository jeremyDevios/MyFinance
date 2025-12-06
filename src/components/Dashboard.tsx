import { useState, useMemo } from 'react';
import { useAssets } from '../hooks/useAssets';
import { usePrices } from '../hooks/usePrices';
import { useCurrency } from '../hooks/useCurrency';
import { CATEGORIES } from '../types';
import type { AssetCategory, CategorySummary } from '../types';
import { CategoryCard } from './CategoryCard';
import { AddAssetModal } from './AddAssetModal';
import { PatrimonyChart } from './PatrimonyChart';
import { AllocationCharts } from './AllocationCharts';
import './Dashboard.css';

interface DashboardProps {
  onCategorySelect: (category: AssetCategory | null) => void;
  selectedCategory: AssetCategory | null;
}

export function Dashboard({ onCategorySelect, selectedCategory }: DashboardProps) {
  const { assets, loading } = useAssets();
  const { prices, metadata } = usePrices(assets);
  const { formatValue } = useCurrency();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Calculate real-time portfolio summary
  const portfolioSummary = useMemo(() => {
    // Calculate total value with real-time prices
    const totalValue = assets.reduce((sum, asset) => {
      const price = prices[asset.id];
      if (price !== undefined && price !== null && ['stocks', 'crypto'].includes(asset.category)) {
        const quantity = 'quantity' in asset ? (asset as any).quantity : 0;
        return sum + (price * quantity);
      }
      return sum + asset.valueInEur;
    }, 0);

    // Calculate category summaries
    const categoryTotals = Object.keys(CATEGORIES).reduce(
      (acc, cat) => {
        const category = cat as AssetCategory;
        const categoryAssets = assets.filter((a) => a.category === category);
        
        const categoryTotal = categoryAssets.reduce((sum, asset) => {
          const price = prices[asset.id];
          if (price !== undefined && price !== null && ['stocks', 'crypto'].includes(asset.category)) {
            const quantity = 'quantity' in asset ? (asset as any).quantity : 0;
            return sum + (price * quantity);
          }
          return sum + asset.valueInEur;
        }, 0);
        
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
  }, [assets, prices]);

  if (loading) {
    return <div className="dashboard-loading">Chargement de vos finances...</div>;
  }

  return (
    <div className="dashboard">
      <div className="total-patrimony">
        <div className="total-patrimony-content">
          <div className="total-header">
            <span className="net-label">PATRIMOINE NET</span>
            <div className="last-updated">
              Mise à jour: {portfolioSummary.lastUpdated.toLocaleDateString('fr-FR')}
            </div>
          </div>
          <div className="total-value">{formatValue(portfolioSummary.totalValue)}</div>
        </div>
        <PatrimonyChart assets={assets} prices={prices} />
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
