import type { 
  Asset, 
  SavingsAccount, 
  CurrentAccount, 
  StockAsset, 
  CryptoAsset, 
  RealEstateAsset 
} from '../types';

// Sample savings accounts
const savingsAccounts: SavingsAccount[] = [
  {
    id: 'sav-1',
    name: 'Livret A',
    category: 'savings',
    institution: 'BNP Paribas',
    valueInEur: 22950,
    interestRate: 3.0,
    lastUpdated: new Date('2024-01-15'),
  },
  {
    id: 'sav-2',
    name: 'LDDS',
    category: 'savings',
    institution: 'Crédit Agricole',
    valueInEur: 12000,
    interestRate: 3.0,
    lastUpdated: new Date('2024-01-15'),
  },
  {
    id: 'sav-3',
    name: 'PEL',
    category: 'savings',
    institution: 'Société Générale',
    valueInEur: 45000,
    interestRate: 2.25,
    lastUpdated: new Date('2024-01-10'),
  },
];

// Sample current accounts (multi-currency)
const currentAccounts: CurrentAccount[] = [
  {
    id: 'acc-1',
    name: 'Compte Principal',
    category: 'current_account',
    institution: 'BNP Paribas',
    currency: 'EUR',
    originalValue: 5420,
    valueInEur: 5420,
    lastUpdated: new Date('2024-01-20'),
  },
  {
    id: 'acc-2',
    name: 'Compte USD',
    category: 'current_account',
    institution: 'Wise',
    currency: 'USD',
    originalValue: 2500,
    valueInEur: 2295, // Converted at ~0.918
    lastUpdated: new Date('2024-01-20'),
  },
  {
    id: 'acc-3',
    name: 'Compte GBP',
    category: 'current_account',
    institution: 'Revolut',
    currency: 'GBP',
    originalValue: 1000,
    valueInEur: 1165, // Converted at ~1.165
    lastUpdated: new Date('2024-01-20'),
  },
];

// Sample stocks/ETFs
const stockAssets: StockAsset[] = [
  {
    id: 'stk-1',
    name: 'Apple Inc.',
    category: 'stocks',
    ticker: 'AAPL',
    quantity: 15,
    purchasePrice: 145,
    currentPrice: 185,
    type: 'stock',
    valueInEur: 2550, // 15 * 185 * 0.918
    lastUpdated: new Date('2024-01-20'),
  },
  {
    id: 'stk-2',
    name: 'MSCI World ETF',
    category: 'stocks',
    ticker: 'IWDA',
    quantity: 50,
    purchasePrice: 75,
    currentPrice: 82,
    type: 'etf',
    valueInEur: 4100,
    lastUpdated: new Date('2024-01-20'),
  },
  {
    id: 'stk-3',
    name: 'Total Energies',
    category: 'stocks',
    ticker: 'TTE',
    quantity: 30,
    purchasePrice: 52,
    currentPrice: 58,
    type: 'stock',
    valueInEur: 1740,
    lastUpdated: new Date('2024-01-20'),
  },
  {
    id: 'stk-4',
    name: 'CAC 40 ETF',
    category: 'stocks',
    ticker: 'CAC',
    quantity: 25,
    purchasePrice: 65,
    currentPrice: 72,
    type: 'etf',
    valueInEur: 1800,
    lastUpdated: new Date('2024-01-20'),
  },
];

// Sample crypto assets
const cryptoAssets: CryptoAsset[] = [
  {
    id: 'cry-1',
    name: 'Bitcoin',
    category: 'crypto',
    symbol: 'BTC',
    quantity: 0.5,
    purchasePrice: 35000,
    currentPrice: 42000,
    valueInEur: 19278, // 0.5 * 42000 * 0.918
    lastUpdated: new Date('2024-01-20'),
  },
  {
    id: 'cry-2',
    name: 'Ethereum',
    category: 'crypto',
    symbol: 'ETH',
    quantity: 3,
    purchasePrice: 2000,
    currentPrice: 2400,
    valueInEur: 6609, // 3 * 2400 * 0.918
    lastUpdated: new Date('2024-01-20'),
  },
  {
    id: 'cry-3',
    name: 'Solana',
    category: 'crypto',
    symbol: 'SOL',
    quantity: 20,
    purchasePrice: 60,
    currentPrice: 95,
    valueInEur: 1744, // 20 * 95 * 0.918
    lastUpdated: new Date('2024-01-20'),
  },
];

// Sample real estate
const realEstateAssets: RealEstateAsset[] = [
  {
    id: 'rel-1',
    name: 'Appartement Paris 11ème',
    category: 'real_estate',
    address: '25 Rue Oberkampf, 75011 Paris',
    purchasePrice: 380000,
    currentValue: 420000,
    propertyType: 'apartment',
    valueInEur: 420000,
    lastUpdated: new Date('2024-01-01'),
  },
  {
    id: 'rel-2',
    name: 'Studio Lyon',
    category: 'real_estate',
    address: '15 Rue de la République, 69001 Lyon',
    purchasePrice: 120000,
    currentValue: 145000,
    propertyType: 'apartment',
    valueInEur: 145000,
    lastUpdated: new Date('2024-01-01'),
  },
];

// All assets combined
export const sampleAssets: Asset[] = [
  ...savingsAccounts,
  ...currentAccounts,
  ...stockAssets,
  ...cryptoAssets,
  ...realEstateAssets,
];

// Exchange rates (to EUR)
export const exchangeRates: Record<string, number> = {
  EUR: 1,
  USD: 0.918,
  GBP: 1.165,
  CHF: 1.045,
  JPY: 0.00548,
};
