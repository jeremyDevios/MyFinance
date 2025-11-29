import type { AssetCategory, Asset } from '../types';
import { CATEGORIES } from '../types';
import { useAssets } from '../hooks/useAssets';
import { useCurrency } from '../hooks/useCurrency';
import './CategoryDetail.css';

interface CategoryDetailProps {
  category: AssetCategory;
  onClose: () => void;
}

export function CategoryDetail({ category, onClose }: CategoryDetailProps) {
  const { getAssetsByCategory } = useAssets();
  const { formatValue } = useCurrency();
  const categoryInfo = CATEGORIES[category];
  const assets = getAssetsByCategory(category);

  const renderAssetDetails = (asset: Asset) => {
    switch (asset.category) {
      case 'savings':
        return (
          <>
            <span className="detail-item">{asset.institution}</span>
            <span className="detail-item">Taux: {asset.interestRate}%</span>
          </>
        );
      case 'current_account':
        return (
          <>
            <span className="detail-item">{asset.institution}</span>
            <span className="detail-item">
              {asset.originalValue.toLocaleString('fr-FR')} {asset.currency}
            </span>
          </>
        );
      case 'stocks':
        return (
          <>
            <span className="detail-item">{asset.ticker}</span>
            <span className="detail-item">{asset.quantity} parts</span>
            <span className={`detail-item ${asset.currentPrice >= asset.purchasePrice ? 'positive' : 'negative'}`}>
              {((asset.currentPrice - asset.purchasePrice) / asset.purchasePrice * 100).toFixed(1)}%
            </span>
          </>
        );
      case 'crypto':
        return (
          <>
            <span className="detail-item">{asset.symbol}</span>
            <span className="detail-item">{asset.quantity} unités</span>
            <span className={`detail-item ${asset.currentPrice >= asset.purchasePrice ? 'positive' : 'negative'}`}>
              {((asset.currentPrice - asset.purchasePrice) / asset.purchasePrice * 100).toFixed(1)}%
            </span>
          </>
        );
      case 'real_estate':
        return (
          <>
            <span className="detail-item">{asset.propertyType}</span>
            <span className={`detail-item ${asset.currentValue >= asset.purchasePrice ? 'positive' : 'negative'}`}>
              {((asset.currentValue - asset.purchasePrice) / asset.purchasePrice * 100).toFixed(1)}%
            </span>
          </>
        );
    }
  };

  return (
    <div className="category-detail">
      <div className="category-detail-header">
        <div className="header-left">
          <span className="icon">{categoryInfo.icon}</span>
          <h2>{categoryInfo.name}</h2>
        </div>
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="assets-list">
        {assets.map((asset) => (
          <div key={asset.id} className="asset-item">
            <div className="asset-name">{asset.name}</div>
            <div className="asset-details">{renderAssetDetails(asset)}</div>
            <div className="asset-value">{formatValue(asset.valueInEur)}</div>
          </div>
        ))}
      </div>

      <div className="category-total">
        <span>Total</span>
        <span>{formatValue(assets.reduce((sum, a) => sum + a.valueInEur, 0))}</span>
      </div>
    </div>
  );
}
