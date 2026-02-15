import type { CategoryInfo, CategorySummary } from '../types';
import { useCurrency } from '../hooks/useCurrency';
import './CategoryCard.css';

interface CategoryCardProps {
  categoryInfo: CategoryInfo;
  summary: CategorySummary;
  isSelected: boolean;
  performance?: number;
  performancePercent?: number;
  onClick: () => void;
  isLoading?: boolean;
}

export function CategoryCard({ categoryInfo, summary, isSelected, performance = 0, performancePercent = 0, onClick, isLoading = false }: CategoryCardProps) {
  const { formatValue } = useCurrency();
  
  const isPositive = performance > 0;
  const isNegative = performance < 0;

  let gradientClass = '';
  if (isPositive) gradientClass = 'card-gradient-green';
  else if (isNegative) gradientClass = 'card-gradient-red';

  return (
    <div
      className={`category-card ${isSelected ? 'selected' : ''} ${gradientClass}`}
      onClick={onClick}
      style={{ '--category-color': categoryInfo.color } as React.CSSProperties}
    >
      <div className="category-header">
        <span className="category-icon">{categoryInfo.icon}</span>
        <span className="category-name">{categoryInfo.name}</span>
        {isLoading && (
          <div className="loading-indicator">
            <span className="hourglass">⏳</span>
            <span className="loading-text">Chargement...</span>
          </div>
        )}
      </div>
      <div className="category-value">{formatValue(summary.totalValue)}</div>
      
      <div className="category-performance">
        <span className="perf-percent">
          {isPositive ? '+' : ''}{performancePercent.toFixed(1)}%
        </span>
        <span className="perf-separator">-</span>
        <span className="perf-value">
          {isPositive ? '+' : ''}{formatValue(performance)}
        </span>
      </div>

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
