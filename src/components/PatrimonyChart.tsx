import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useCurrency } from '../hooks/useCurrency';
import type { Asset } from '../types';
import './PatrimonyChart.css';

interface PatrimonyChartProps {
  assets: Asset[];
  prices: Record<string, number | null>;
}

export function PatrimonyChart({ assets, prices }: PatrimonyChartProps) {
  const { formatValue } = useCurrency();

  const chartData = useMemo(() => {
    if (assets.length === 0) return [];

    // 1. Find the earliest date
    let minDate = new Date();
    let hasValidDate = false;

    assets.forEach(asset => {
      if (asset.purchaseDate) {
        const d = new Date(asset.purchaseDate);
        if (d < minDate) {
          minDate = d;
          hasValidDate = true;
        }
      }
    });

    if (!hasValidDate) {
      // Fallback to 30 days ago if no dates found
      minDate = new Date();
      minDate.setDate(minDate.getDate() - 30);
    }

    // Ensure minDate is not in the future
    if (minDate > new Date()) minDate = new Date();

    // 2. Generate daily points
    const dataPoints = [];
    const today = new Date();
    // Reset time to noon to avoid DST issues
    today.setHours(12, 0, 0, 0);
    
    const startDate = new Date(minDate);
    startDate.setHours(12, 0, 0, 0);

    const oneDay = 24 * 60 * 60 * 1000;
    const totalDuration = today.getTime() - startDate.getTime();

    // If duration is very short (e.g. same day), show at least 2 points
    if (totalDuration < oneDay) {
       // Just show today
    }

    for (let d = startDate.getTime(); d <= today.getTime(); d += oneDay) {
      const currentDate = new Date(d);
      let dailyTotal = 0;

      assets.forEach(asset => {
        const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : new Date();
        purchaseDate.setHours(12, 0, 0, 0);

        if (currentDate >= purchaseDate) {
          // Calculate interpolated value
          let startValue = 0;
          let endValue = 0;

          // Determine Start Value (at purchase)
          if (asset.category === 'stocks' || asset.category === 'crypto') {
            const q = (asset as any).quantity || 0;
            const p = (asset as any).purchasePrice || 0;
            startValue = q * p;
          } else if ('originalValue' in asset) {
            startValue = (asset as any).originalValue || asset.valueInEur;
          } else if ('purchasePrice' in asset) {
            startValue = (asset as any).purchasePrice || asset.valueInEur;
          } else {
            startValue = asset.valueInEur;
          }

          // Determine End Value (today)
          if ((asset.category === 'stocks' || asset.category === 'crypto') && prices[asset.id]) {
             const q = (asset as any).quantity || 0;
             endValue = q * prices[asset.id]!;
          } else {
             endValue = asset.valueInEur;
          }

          // Interpolate
          const assetDuration = today.getTime() - purchaseDate.getTime();
          const timeSincePurchase = currentDate.getTime() - purchaseDate.getTime();
          
          let ratio = 0;
          if (assetDuration > 0) {
            ratio = timeSincePurchase / assetDuration;
          } else {
            ratio = 1; // Bought today
          }
          
          // Clamp ratio
          if (ratio > 1) ratio = 1;
          if (ratio < 0) ratio = 0;

          const interpolated = startValue + (endValue - startValue) * ratio;
          dailyTotal += interpolated;
        }
      });

      dataPoints.push({
        date: currentDate.toISOString(),
        timestamp: d,
        value: dailyTotal
      });
    }

    return dataPoints;
  }, [assets, prices]);

  if (chartData.length === 0) return null;

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#646cff" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#646cff" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
          <XAxis 
            dataKey="timestamp" 
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
            stroke="#666"
            fontSize={12}
            tickMargin={10}
            minTickGap={30}
          />
          <YAxis 
            hide={true} 
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
            labelFormatter={(label) => new Date(label).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            formatter={(value: number) => [formatValue(value), 'Valeur']}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#646cff" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorValue)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
