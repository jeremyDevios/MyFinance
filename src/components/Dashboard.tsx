import { useAssets } from '../hooks/useAssets';
import { useCurrency } from '../hooks/useCurrency';
import { CATEGORIES } from '../types';
import type { AssetCategory } from '../types';
import { CategoryCard } from './CategoryCard';
import './Dashboard.css';

interface DashboardProps {
  onCategorySelect: (category: AssetCategory | null) => void;
  selectedCategory: AssetCategory | null;
}

export function Dashboard({ onCategorySelect, selectedCategory }: DashboardProps) {
  const { portfolioSummary } = useAssets();
  const { formatValue } = useCurrency();

  return (
    <div className="dashboard">
      <div className="total-patrimony">
        <h2>Patrimoine Total</h2>
        <div className="total-value">{formatValue(portfolioSummary.totalValue)}</div>
        <div className="last-updated">
          Dernière mise à jour: {portfolioSummary.lastUpdated.toLocaleDateString('fr-FR')}
        </div>
      </div>

      <div className="categories-grid">
        {portfolioSummary.categories.map((categorySummary) => {
          const categoryInfo = CATEGORIES[categorySummary.category];
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
    </div>
  );
}
