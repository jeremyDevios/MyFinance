import { useMemo, useState } from 'react';
import type { AssetCategory, Asset } from '../types';
import { CATEGORIES } from '../types';
import { useAssets } from '../hooks/useAssets';
import { usePrices } from '../hooks/usePrices';
import { useCurrency } from '../hooks/useCurrency';
import { useSettings } from '../contexts/SettingsContext';
import { AddAssetModal } from './AddAssetModal';
import './CategoryDetail.css';

interface CategoryDetailProps {
  category: AssetCategory;
  onClose: () => void;
}

export function CategoryDetail({ category, onClose }: CategoryDetailProps) {
  const { assets: allAssets, deleteAsset } = useAssets();
  const { formatValue, exchangeRates } = useCurrency();
  const { monthlyExpenses } = useSettings();
  const categoryInfo = CATEGORIES[category];
  
  // Memoize filtered assets to prevent infinite loops in usePrices
  const assets = useMemo(() => {
    return allAssets.filter(asset => asset.category === category);
  }, [allAssets, category]);

  const { prices, metadata, errors } = usePrices(assets);
  
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // Helper to get the effective price in EUR
  const getPriceInEur = (asset: Asset) => {
    let price = prices[asset.id] ?? ('currentPrice' in asset ? (asset as any).currentPrice : 0);
    const meta = metadata?.[asset.id];

    // If we have metadata AND the asset currency matches metadata currency
    // For Crypto, priceService now returns price in USD or EUR with metadata
    // If the asset has an originalCurrency, we should assume the purchasePrice was in that currency.
    // However, the current price from usePrices might be in a different currency.
    
    // Simplification:
    // 1. priceService usually returns crypto in USD or EUR.
    // 2. We want to convert everything to EUR for display uniformity in the portfolio.
    
    if (meta?.currency && meta.currency !== 'EUR') {
      const rate = exchangeRates[meta.currency];
      if (rate) {
        price = price * rate;
      }
    }
    return price;
  };

  // Helper to get purchase price in EUR
  const getPurchasePriceInEur = (asset: Asset) => {
    if (!('purchasePrice' in asset)) return 0;
    
    let price = asset.purchasePrice;
    
    // If asset was bought in another currency, convert it to EUR using PRESENT exchange rate?
    // STRICTLY SPEAKING, to compute historical performance accurately in EUR, we should use the historical exchange rate.
    // BUT we don't store historical exchange rates.
    // So we have two options for invalid comparison:
    // A) Convert purchase price to EUR using CURRENT rate (Simulates "What if I held EUR instead of USD") -> Shows asset performance + currency performance
    // B) Don't convert, implies purchasePrice is already in EUR (WRONG if it was USD)
    
    // If the user selected a currency during creation:
    if (asset.originalCurrency && asset.originalCurrency !== 'EUR') {
       const rate = exchangeRates[asset.originalCurrency];
       if (rate) {
         price = price * rate;
       }
    }
    return price;
  };
  
  // Group assets by subGroup (or institution for legacy)
  const groupedAssets = useMemo(() => {
    const groups: Record<string, Asset[]> = {};
    
    assets.forEach(asset => {
      // Determine group name
      let groupName = asset.subGroup;
      if (!groupName && 'institution' in asset) {
        groupName = (asset as any).institution;
      }
      if (!groupName) groupName = 'Autres';

      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(asset);
    });

    return groups;
  }, [assets]);

  const handleDelete = async (assetId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet actif ?')) {
      try {
        await deleteAsset(assetId);
      } catch (error) {
        console.error("Error deleting asset:", error);
        alert("Erreur lors de la suppression");
      }
    }
  };

  const renderAssetDetails = (asset: Asset) => {
    const currentPrice = getPriceInEur(asset);
    const purchasePrice = 'purchasePrice' in asset ? getPurchasePriceInEur(asset) : 0;
    const hasRealTimePrice = prices[asset.id] !== undefined && prices[asset.id] !== null;
    const priceError = errors[asset.id];

    switch (asset.category) {
      case 'savings':
        return (
          <>
            <span className="detail-item">Taux: {asset.interestRate}%</span>
          </>
        );
      case 'current_account':
        return (
          <>
            <span className="detail-item">
              {asset.originalValue.toLocaleString('fr-FR')} {asset.currency}
            </span>
          </>
        );
      case 'stocks':
        const diffVal = (currentPrice - purchasePrice) * asset.quantity;
        return (
          <>
            <span className="detail-item col-quantity">{asset.quantity} parts</span>
            <span className="detail-item price-tag col-price">
              {formatValue(currentPrice)}
            </span>
            {priceError ? (
              <span className="detail-item error" title={`${priceError} - Vérifiez le symbole sur Finnhub.io`}>!</span>
            ) : (
              <>
                <span className={`detail-item col-perf ${currentPrice >= purchasePrice ? 'positive' : 'negative'}`}>
                  {purchasePrice > 0 ? ((currentPrice - purchasePrice) / purchasePrice * 100).toFixed(1) : 0}%
                </span>
                <span className={`detail-item col-gain ${diffVal >= 0 ? 'positive' : 'negative'}`}>
                  {diffVal > 0 ? '+' : ''}{formatValue(diffVal)}
                  {hasRealTimePrice && <span className="live-indicator" title="Prix en temps réel">•</span>}
                </span>
              </>
            )}
          </>
        );
      case 'crypto':
        const diffInEur = (currentPrice - purchasePrice) * asset.quantity;
        return (
          <>
            <span className="detail-item col-quantity">{asset.quantity} unités</span>
            <span className="detail-item price-tag col-price">
              {formatValue(currentPrice)}
            </span>
            {priceError ? (
              <span className="detail-item error" title={priceError}>!</span>
            ) : (
              <>
                <span className={`detail-item col-perf ${currentPrice >= purchasePrice ? 'positive' : 'negative'}`}>
                  {purchasePrice > 0 ? ((currentPrice - purchasePrice) / purchasePrice * 100).toFixed(1) : 0}%
                </span>
                <span className={`detail-item col-gain ${diffInEur >= 0 ? 'positive' : 'negative'}`}>
                  {diffInEur > 0 ? '+' : ''}{formatValue(diffInEur)}
                  {hasRealTimePrice && <span className="live-indicator" title="Prix en temps réel">•</span>}
                </span>
              </>
            )}
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

  const renderPrecautionarySavingsChart = () => {
    if (category !== 'savings' || monthlyExpenses <= 0) return null;

    const totalSavings = assets.reduce((sum, a) => sum + a.valueInEur, 0);
    const minTarget = monthlyExpenses * 3;
    const maxTarget = monthlyExpenses * 6;
    
    // To center the recommended zone (3-6 months), we set the scale to 9 months (midpoint 4.5 is 50%)
    const maxScale = monthlyExpenses * 9;
    
    // Calculate percentages for the bar
    const minPercent = (minTarget / maxScale) * 100;
    const maxPercent = (maxTarget / maxScale) * 100;
    const currentPercent = Math.min((totalSavings / maxScale) * 100, 100);

    return (
      <div className="precautionary-savings-section">
        <div className="section-header">
          <h3>Épargne de Précaution</h3>
          <div className="info-tooltip-container">
            <span className="info-icon">ℹ️</span>
            <div className="info-tooltip">
              Basé sur vos dépenses mensuelles de {formatValue(monthlyExpenses)}.
              <br />
              Modifiable dans les paramètres.
            </div>
          </div>
        </div>
        
        <div className="savings-gauge-container">
          <div className="savings-gauge-bar">
            {/* Zones */}
            <div 
              className="gauge-zone zone-red" 
              style={{ width: `${minPercent}%` }} 
              title="Insuffisant (< 3 mois)"
            />
            <div 
              className="gauge-zone zone-green" 
              style={{ width: `${maxPercent - minPercent}%`, left: `${minPercent}%` }} 
              title="Idéal (3-6 mois)"
            />
            <div 
              className="gauge-zone zone-orange" 
              style={{ width: `${100 - maxPercent}%`, left: `${maxPercent}%` }} 
              title="Elevé (> 6 mois)"
            />
            
            {/* Markers */}
            <div className="gauge-marker" style={{ left: `${minPercent}%` }}>
              <span className="marker-label">3 mois</span>
              <span className="marker-value">{formatValue(minTarget)}</span>
            </div>
            <div className="gauge-marker" style={{ left: `${maxPercent}%` }}>
              <span className="marker-label">6 mois</span>
              <span className="marker-value">{formatValue(maxTarget)}</span>
            </div>

            {/* Current Value Indicator */}
            <div 
              className="current-value-indicator" 
              style={{ left: `${currentPercent}%` }}
            >
              <div className="indicator-line" />
              <div className="indicator-bubble">
                {formatValue(totalSavings)}
              </div>
            </div>
          </div>
          
          <div className="gauge-legend">
            <span className="legend-item"><span className="dot red"></span>Insuffisant</span>
            <span className="legend-item"><span className="dot green"></span>Recommandé</span>
            <span className="legend-item"><span className="dot orange"></span>Elevé</span>
          </div>
        </div>
      </div>
    );
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

      {renderPrecautionarySavingsChart()}

      <div className="assets-list">
        {Object.entries(groupedAssets).map(([groupName, groupAssets]) => {
          // Calculate total using real-time prices if available
          const groupTotal = groupAssets.reduce((sum, a) => {
            const price = getPriceInEur(a);
            const quantity = 'quantity' in a ? (a as any).quantity : 1;
            // If it's not an investment with quantity, use valueInEur
            if (!['stocks', 'crypto'].includes(a.category)) return sum + a.valueInEur;
            return sum + (price * quantity);
          }, 0);
          
          return (
            <div key={groupName} className="asset-group">
              <div className="group-header">
                <h3>{groupName}</h3>
                <span className="group-total">{formatValue(groupTotal)}</span>
              </div>
              
              <div className="group-items">
                {groupAssets.map((asset) => {
                  const price = getPriceInEur(asset);
                  const quantity = 'quantity' in asset ? (asset as any).quantity : 1;
                  const value = ['stocks', 'crypto'].includes(asset.category) ? price * quantity : asset.valueInEur;
                  
                  const getTicker = (a: Asset) => {
                    if (a.category === 'stocks') return (a as any).ticker;
                    if (a.category === 'crypto') return (a as any).symbol;
                    return null;
                  };
                  const ticker = getTicker(asset);
                  // Use metadata longName if available, otherwise fallback to asset name
                  const displayName = metadata?.[asset.id]?.longName || asset.name;

                  return (
                    <div key={asset.id} className="asset-item">
                      <div className="asset-main-info">
                        <div className="asset-name">
                          {displayName}
                          {ticker && displayName !== ticker && <span className="asset-ticker-suffix"> - {ticker}</span>}
                        </div>
                        {asset.note && <div className="asset-note">{asset.note}</div>}
                      </div>
                      <div className="asset-details">{renderAssetDetails(asset)}</div>
                      <div className="asset-value">{formatValue(value)}</div>
                      <div className="asset-actions">
                        <button 
                          className="action-button edit" 
                          onClick={() => setEditingAsset(asset)}
                          aria-label="Modifier"
                        >
                          ✏️
                        </button>
                        <button 
                          className="action-button delete" 
                          onClick={() => handleDelete(asset.id)}
                          aria-label="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="category-total">
        <span>Total</span>
        <span>{formatValue(assets.reduce((sum, a) => {
            const price = getPriceInEur(a);
            const quantity = 'quantity' in a ? (a as any).quantity : 1;
            if (!['stocks', 'crypto'].includes(a.category)) return sum + a.valueInEur;
            return sum + (price * quantity);
        }, 0))}</span>
      </div>

      <AddAssetModal 
        isOpen={!!editingAsset} 
        onClose={() => setEditingAsset(null)} 
        initialAsset={editingAsset}
      />
    </div>
  );
}
