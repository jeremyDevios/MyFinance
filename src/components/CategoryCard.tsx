import type { CategoryInfo, CategorySummary } from '../types';
import { useCurrency } from '../hooks/useCurrency';
import './CategoryCard.css';

interface CategoryCardProps {
  categoryInfo: CategoryInfo;
  summary: CategorySummary;
  isSelected: boolean;
  onClick: () => void;
}

export function CategoryCard({ categoryInfo, summary, isSelected, onClick }: CategoryCardProps) {
  const { formatValue } = useCurrency();

  return (
    <div
      className={`category-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      style={{ '--category-color': categoryInfo.color } as React.CSSProperties}
    >
      <div className="category-header">
        <span className="category-icon">{categoryInfo.icon}</span>
        <span className="category-name">{categoryInfo.name}</span>
      </div>
      <div className="category-value">{formatValue(summary.totalValue)}</div>
      <div className="category-meta">
        <span className="asset-count">{summary.assetCount} actif(s)</span>
        <span className="percentage">{summary.percentageOfTotal.toFixed(1)}%</span>
      </div>
      <div className="category-bar">
        <div
          className="category-bar-fill"
          style={{ width: `${Math.min(summary.percentageOfTotal, 100)}%` }}
        />
      </div>
    </div>
  );
}
