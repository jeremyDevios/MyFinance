// Currency types
export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'JPY';

export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
}

export const CURRENCIES: Record<Currency, CurrencyInfo> = {
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
};

// Asset category types
export type AssetCategory = 
  | 'savings' 
  | 'current_account' 
  | 'stocks' 
  | 'crypto' 
  | 'real_estate';

export interface CategoryInfo {
  id: AssetCategory;
  name: string;
  icon: string;
  color: string;
}

export const CATEGORIES: Record<AssetCategory, CategoryInfo> = {
  savings: { 
    id: 'savings', 
    name: 'Livrets Épargne', 
    icon: '💰', 
    color: '#4CAF50' 
  },
  current_account: { 
    id: 'current_account', 
    name: 'Comptes Courants', 
    icon: '🏦', 
    color: '#2196F3' 
  },
  stocks: { 
    id: 'stocks', 
    name: 'Bourse (Actions / ETF)', 
    icon: '📈', 
    color: '#9C27B0' 
  },
  crypto: { 
    id: 'crypto', 
    name: 'Crypto', 
    icon: '🪙', 
    color: '#FF9800' 
  },
  real_estate: { 
    id: 'real_estate', 
    name: 'Immobilier', 
    icon: '🏠', 
    color: '#795548' 
  },
};

// Asset models
export interface BaseAsset {
  id: string;
  name: string;
  category: AssetCategory;
  valueInEur: number;
  lastUpdated: Date;
}

export interface SavingsAccount extends BaseAsset {
  category: 'savings';
  institution: string;
  interestRate: number;
}

export interface CurrentAccount extends BaseAsset {
  category: 'current_account';
  institution: string;
  currency: Currency;
  originalValue: number;
}

export interface StockAsset extends BaseAsset {
  category: 'stocks';
  ticker: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  type: 'stock' | 'etf';
}

export interface CryptoAsset extends BaseAsset {
  category: 'crypto';
  symbol: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
}

export interface RealEstateAsset extends BaseAsset {
  category: 'real_estate';
  address: string;
  purchasePrice: number;
  currentValue: number;
  propertyType: 'apartment' | 'house' | 'commercial' | 'land';
}

export type Asset = 
  | SavingsAccount 
  | CurrentAccount 
  | StockAsset 
  | CryptoAsset 
  | RealEstateAsset;

// Portfolio summary
export interface CategorySummary {
  category: AssetCategory;
  totalValue: number;
  assetCount: number;
  percentageOfTotal: number;
}

export interface PortfolioSummary {
  totalValue: number;
  categories: CategorySummary[];
  lastUpdated: Date;
}
