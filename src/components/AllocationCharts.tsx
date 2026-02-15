import { useMemo, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useCurrency } from '../hooks/useCurrency';
import type { Asset } from '../types';
import type { StockMetadata } from '../services/priceService';
import './AllocationCharts.css';

interface AllocationChartsProps {
  assets: Asset[];
  prices: Record<string, number | null>;
  metadata?: Record<string, StockMetadata>;
}

export function AllocationCharts({ assets, prices, metadata = {} }: AllocationChartsProps) {
  const { formatValue, exchangeRates } = useCurrency();
  const [shouldAnimate, setShouldAnimate] = useState(true);

  useEffect(() => {
    // Disable animation after initial render animation completes
    const timer = setTimeout(() => {
      setShouldAnimate(false);
    }, 1500); // Recharts default animation is usually ~1s-1.5s
    return () => clearTimeout(timer);
  }, []);
  
  // Helper to get price in EUR
  const getPriceInEur = (assetId: string, price: number) => {
    const meta = metadata?.[assetId];
    if (meta?.currency && meta.currency !== 'EUR') {
      const rate = exchangeRates[meta.currency];
      if (rate) return price * rate;
    }
    return price;
  };

  // Helper to get current value of an asset
  const getAssetValue = (asset: Asset) => {
    if (['stocks', 'crypto'].includes(asset.category) && prices[asset.id]) {
      const quantity = 'quantity' in asset ? (asset as any).quantity : 0;
      const eurPrice = getPriceInEur(asset.id, prices[asset.id]!);
      return quantity * eurPrice;
    }
    return asset.valueInEur;
  };

  // 1. Allocation by Asset Class (Type)
  const typeData = useMemo(() => {
    const distribution: Record<string, { value: number; assets: string[] }> = {
      'Cash': { value: 0, assets: [] },
      'Actions/ETF': { value: 0, assets: [] },
      'Immobilier': { value: 0, assets: [] },
      'Crypto': { value: 0, assets: [] }
    };

    assets.forEach(asset => {
      const value = getAssetValue(asset);
      let key = '';
      switch (asset.category) {
        case 'savings':
        case 'current_account':
          key = 'Cash';
          break;
        case 'stocks':
          key = 'Actions/ETF';
          break;
        case 'real_estate':
          key = 'Immobilier';
          break;
        case 'crypto':
          key = 'Crypto';
          break;
      }
      if (key && distribution[key]) {
        distribution[key].value += value;
        distribution[key].assets.push(asset.name);
      }
    });

    return Object.entries(distribution)
      .filter(([_, data]) => data.value > 0)
      .map(([name, data]) => ({ name, value: data.value, assets: data.assets }));
  }, [assets, prices]);

  // 2. Allocation by Instrument (Risk/Nature)
  const instrumentData = useMemo(() => {
    const distribution: Record<string, { value: number; assets: string[] }> = {
      'Obligation': { value: 0, assets: [] }, // Livrets (if rate > 0), Fonds Euros, Bonds
      'Action': { value: 0, assets: [] },     // Stocks, Equity ETFs
      'Matière Première': { value: 0, assets: [] }, // Gold, Silver
      'Cash': { value: 0, assets: [] },       // Current accounts, Livrets (if rate 0)
      'Crypto': { value: 0, assets: [] }
    };

    assets.forEach(asset => {
      const value = getAssetValue(asset);
      const nameLower = asset.name.toLowerCase();
      let key = '';

      if (asset.category === 'savings') {
        // Livrets -> Obligation if rate > 0, else Cash
        const rate = 'interestRate' in asset ? (asset as any).interestRate : 0;
        if (rate > 0) {
          key = 'Obligation';
        } else {
          key = 'Cash';
        }
      } else if (asset.category === 'current_account') {
        // Compte courant -> Cash
        key = 'Cash';
      } else if (asset.category === 'crypto') {
        key = 'Crypto';
      } else if (asset.category === 'stocks') {
        // Heuristic for Commodities
        if (nameLower.includes('gold') || nameLower.includes(' or ') || nameLower.includes('silver') || nameLower.includes('physical') || nameLower.includes('commodity')) {
          key = 'Matière Première';
        } else if (nameLower.includes('bond') || nameLower.includes('oblig') || nameLower.includes('treasury')) {
          // Heuristic for Bond ETFs
          key = 'Obligation';
        } else {
          // Default to Action
          key = 'Action';
        }
      }

      if (key && distribution[key]) {
        distribution[key].value += value;
        distribution[key].assets.push(asset.name);
      }
    });

    return Object.entries(distribution)
      .filter(([_, data]) => data.value > 0)
      .map(([name, data]) => ({ name, value: data.value, assets: data.assets }));
  }, [assets, prices]);

  // 3. Allocation by Geography
  const geoData = useMemo(() => {
    const distribution: Record<string, { value: number; assets: string[] }> = {
      'Monde': { value: 0, assets: [] },
      'Etats Unis': { value: 0, assets: [] },
      'Europe': { value: 0, assets: [] },
      'Asie': { value: 0, assets: [] },
      'Emergents': { value: 0, assets: [] },
      'Autre': { value: 0, assets: [] },
      'Inconnue': { value: 0, assets: [] }
    };

    assets.forEach(asset => {
      // Only consider Stocks/ETFs for Geography
      if (asset.category !== 'stocks') return;

      const value = getAssetValue(asset);
      
      // Use manual geography or default to 'Monde'
      let region = (asset as any).geography || 'Monde';
      
      // Handle legacy value
      if (region === 'Automatique') {
        region = 'Monde';
      }

      if ((distribution as any)[region]) {
        (distribution as any)[region].value += value;
        (distribution as any)[region].assets.push(asset.name);
      } else {
        // Fallback
        distribution['Autre'].value += value;
        distribution['Autre'].assets.push(asset.name);
      }
    });

    return Object.entries(distribution)
      .filter(([_, data]) => data.value > 0)
      .map(([name, data]) => ({ name, value: data.value, assets: data.assets }));
  }, [assets, prices]);

  const COLORS = {
    'Cash': ['#4CAF50', '#81C784'],
    'Actions/ETF': ['#2196F3', '#64B5F6'],
    'Immobilier': ['#795548', '#A1887F'],
    'Crypto': ['#FF9800', '#FFB74D'],
    
    'Obligation': ['#9C27B0', '#BA68C8'],
    'Action': ['#2196F3', '#64B5F6'],
    'Matière Première': ['#FFD700', '#FFE082'],
    
    'Monde': ['#00BCD4', '#4DD0E1'],
    'Etats Unis': ['#E91E63', '#F06292'],
    'Europe': ['#3F51B5', '#7986CB'],
    'Asie': ['#F44336', '#E57373'],
    'Emergents': ['#FF5722', '#FF8A65'],
    'Autre': ['#9E9E9E', '#BDBDBD'],
    'Inconnue': ['#607D8B', '#90A4AE'],
    'Pas de secteur': ['#607D8B', '#90A4AE']
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '10px' }}>
          <p style={{ color: '#fff', fontWeight: 'bold', marginBottom: '5px' }}>{data.name}</p>
          <p style={{ color: '#ccc', marginBottom: '10px' }}>{formatValue(data.value)}</p>
          {data.assets && data.assets.length > 0 && (
            <div style={{ borderTop: '1px solid #444', paddingTop: '5px' }}>
              <p style={{ color: '#888', fontSize: '0.8em', marginBottom: '2px' }}>Actifs:</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#aaa', fontSize: '0.8em', maxHeight: '150px', overflowY: 'auto' }}>
                {data.assets.map((assetName: string, idx: number) => (
                  <li key={idx}>{assetName}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const ChartSection = ({ title, data }: { title: string, data: any[] }) => (
    <div className="allocation-card">
      <h3>{title}</h3>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <defs>
              {data.map((entry) => (
                <linearGradient key={`gradient-${entry.name}`} id={`gradient-${entry.name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={(COLORS as any)[entry.name]?.[0] || '#888'} />
                  <stop offset="100%" stopColor={(COLORS as any)[entry.name]?.[1] || '#aaa'} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
              isAnimationActive={shouldAnimate}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`url(#gradient-${entry.name})`} />
              ))}
            </Pie>
            <Tooltip 
              content={<CustomTooltip />} 
              wrapperStyle={{ zIndex: 1000 }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              formatter={(value) => <span style={{ color: '#ccc', fontSize: '0.8rem' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  if (assets.length === 0) return null;

  return (
    <div className="allocation-charts-container">
      <ChartSection title="Types" data={typeData} />
      <ChartSection title="Instrument" data={instrumentData} />
      <ChartSection title="Géographie" data={geoData} />
    </div>
  );
}
