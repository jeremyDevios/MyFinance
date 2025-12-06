import { useMemo, useState, useEffect } from 'react';
import type { AssetCategory, Asset } from '../types';
import { CATEGORIES } from '../types';
import { useAssets } from '../hooks/useAssets';
import { usePrices } from '../hooks/usePrices';
import { useCurrency } from '../hooks/useCurrency';
import { useSettings } from '../contexts/SettingsContext';
import { priceService } from '../services/priceService';
import { AddAssetModal } from './AddAssetModal';
import { exchangeRates } from '../data/sampleData';
import './CategoryDetail.css';

interface CategoryDetailProps {
  category: AssetCategory;
  onClose: () => void;
}

export function CategoryDetail({ category, onClose }: CategoryDetailProps) {
  const { assets: allAssets, deleteAsset } = useAssets();
  const { formatValue } = useCurrency();
  const { finnhubApiKey, monthlyExpenses } = useSettings();
  const categoryInfo = CATEGORIES[category];
  
  // Memoize filtered assets to prevent infinite loops in usePrices
  const assets = useMemo(() => {
    return allAssets.filter(asset => asset.category === category);
  }, [allAssets, category]);

  const { prices, metadata, errors } = usePrices(assets);
  
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [currentExchangeRates, setCurrentExchangeRates] = useState(exchangeRates);

  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        // Fetch EURUSD=X (1 EUR = x USD) -> We want 1 USD = y EUR
        const usdResult = await priceService.getYahooPrice('EURUSD=X');
        if (usdResult.price) {
          setCurrentExchangeRates(prev => ({
            ...prev,
            USD: 1 / usdResult.price!
          }));
        }
      } catch (e) {
        console.warn('Failed to fetch live exchange rates', e);
      }
    };
    fetchExchangeRates();
  }, []);

  // Helper to get the effective price in EUR
  const getPriceInEur = (asset: Asset) => {
    let price = prices[asset.id] ?? ('currentPrice' in asset ? (asset as any).currentPrice : 0);
    const meta = metadata?.[asset.id];
    
    // If we have metadata and the currency is not EUR, convert it
    if (meta?.currency && meta.currency !== 'EUR') {
      const rate = currentExchangeRates[meta.currency];
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
        return (
          <>
            <span className="detail-item">{asset.quantity} parts</span>
            <span className="detail-item price-tag">
              {currentPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </span>
            {priceError ? (
              <span className="detail-item error" title={`${priceError} - Vérifiez le symbole sur Finnhub.io`}>!</span>
            ) : (
              <span className={`detail-item ${currentPrice >= asset.purchasePrice ? 'positive' : 'negative'}`}>
                {((currentPrice - asset.purchasePrice) / asset.purchasePrice * 100).toFixed(1)}%
                {hasRealTimePrice && <span className="live-indicator" title="Prix en temps réel">•</span>}
              </span>
            )}
          </>
        );
      case 'crypto':
        return (
          <>
            <span className="detail-item">{asset.quantity} unités</span>
            <span className="detail-item price-tag">
              {currentPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </span>
            {priceError ? (
              <span className="detail-item error" title={priceError}>!</span>
            ) : (
              <span className={`detail-item ${currentPrice >= asset.purchasePrice ? 'positive' : 'negative'}`}>
                {((currentPrice - asset.purchasePrice) / asset.purchasePrice * 100).toFixed(1)}%
                {hasRealTimePrice && <span className="live-indicator" title="Prix en temps réel">•</span>}
              </span>
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
