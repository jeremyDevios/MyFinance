import { useMemo } from 'react';
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
  const { formatValue } = useCurrency();

  // Helper to get current value of an asset
  const getAssetValue = (asset: Asset) => {
    if (['stocks', 'crypto'].includes(asset.category) && prices[asset.id]) {
      const quantity = 'quantity' in asset ? (asset as any).quantity : 0;
      return quantity * prices[asset.id]!;
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
      
      // Check for manual geography override first
      if ('geography' in asset && (asset as any).geography && (asset as any).geography !== 'Inconnue') {
        const manualGeo = (asset as any).geography;
        if ((distribution as any)[manualGeo]) {
          (distribution as any)[manualGeo].value += value;
          (distribution as any)[manualGeo].assets.push(asset.name);
          return;
        }
      }

      // For Stocks/ETFs, use Metadata
      const meta = metadata[asset.id];
      let region = 'Inconnue';

      // Try to determine region from Name (Metadata or Asset Name)
      const name = (meta?.longName || asset.name || '').toLowerCase();
      
      if (name.includes('world') || name.includes('monde') || name.includes('msci world') || name.includes('global') || name.includes('acwi') || name.includes('all country')) {
        region = 'Monde';
      } else if (name.includes('asia') || name.includes('asie') || name.includes('pacific') || name.includes('pacifique') || name.includes('japan') || name.includes('japon') || name.includes('china') || name.includes('chine') || name.includes('emerging') || name.includes('émergents') || name.includes(' em ') || name.includes(' ex jap')) {
        region = 'Asie';
      } else if (name.includes('usa') || name.includes('etats-unis') || name.includes('s&p') || name.includes('nasdaq') || name.includes('dow jones') || name.includes('us treasury') || name.includes('russell')) {
        region = 'Etats Unis';
      } else if (name.includes('europe') || name.includes('stoxx') || name.includes('cac 40') || name.includes('cac40') || name.includes('dax') || name.includes('ftse') || name.includes('euro')) {
        region = 'Europe';
      } else {
        // Fallback logic
        let determined = false;

        // Check for Commodities/Precious Metals -> Inconnue
        if (name.includes('gold') || name.includes(' or ') || name.includes('silver') || name.includes('metal') || name.includes('physical') || name.includes('commodity')) {
          region = 'Inconnue';
          determined = true;
        }

        if (!determined && meta) {
          const type = (meta.instrumentType || '').toUpperCase();
          const isEquity = type === 'EQUITY';
          
          // If it's an Equity (Company), we can generally trust the listing location
          if (isEquity) {
            const tz = meta.exchangeTimezoneName || '';
            const curr = meta.currency || '';

            if (tz.includes('New_York') || tz.includes('America') || curr === 'USD') {
              region = 'Etats Unis';
            } else if (tz.includes('Europe') || tz.includes('Paris') || tz.includes('Berlin') || tz.includes('London') || tz.includes('Amsterdam') || curr === 'EUR' || curr === 'GBP' || curr === 'CHF') {
              region = 'Europe';
            } else if (tz.includes('Asia') || tz.includes('Tokyo') || tz.includes('Hong_Kong') || tz.includes('Shanghai') || curr === 'JPY' || curr === 'CNY' || curr === 'HKD') {
              region = 'Asie';
            }
          }
          // If it's an ETF/Fund and we haven't matched a name region yet, default to Inconnue
          // (Avoids classifying Gold ETCs as Europe just because they list in Paris)
        } 
        
        // Final fallback for items without metadata or unmatched Equities
        if (!determined && region === 'Inconnue') {
           // Only guess US if it's very clear
           let ticker = '';
           if ('ticker' in asset) ticker = (asset as any).ticker;
           
           if (ticker.endsWith('.US')) {
             region = 'Etats Unis';
           }
           // Do NOT default to Europe for .PA/.DE etc as it might be an ETF
        }
      }

      if ((distribution as any)[region]) {
        (distribution as any)[region].value += value;
        (distribution as any)[region].assets.push(asset.name);
      }
    });

    return Object.entries(distribution)
      .filter(([_, data]) => data.value > 0)
      .map(([name, data]) => ({ name, value: data.value, assets: data.assets }));
  }, [assets, prices, metadata]);

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
