// Cache to avoid hitting API limits
const priceCache: Record<string, { price: number; timestamp: number; metadata?: StockMetadata }> = {};
const CACHE_DURATION = 10 * 1000; // 10 seconds

export interface StockMetadata {
  currency?: string;
  exchangeTimezoneName?: string;
  exchangeName?: string;
  instrumentType?: string;
  longName?: string;
}

interface PriceResult {
  price: number | null;
  error?: string;
  metadata?: StockMetadata;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type?: string;
}

const fetchWithProxy = async (targetUrl: string) => {
  // Try direct first
  try {
    const res = await fetch(targetUrl);
    if (res.ok) return await res.json();
  } catch (e) {
    // Ignore
  }

  // Try corsproxy.io
  try {
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
    if (res.ok) return await res.json();
  } catch (e) {
    // Ignore
  }

  // Try allorigins
  try {
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`);
    if (res.ok) return await res.json();
  } catch (e) {
    // Ignore
  }

  throw new Error('All proxies failed');
};

export const priceService = {
  // Search Crypto (CoinGecko)
  async searchCrypto(query: string): Promise<SearchResult[]> {
    if (query.length < 2) return [];
    try {
      const data = await fetchWithProxy(`https://api.coingecko.com/api/v3/search?query=${query}`);
      return (data.coins || []).slice(0, 10).map((coin: any) => ({
        symbol: coin.symbol,
        name: coin.name,
        type: 'crypto'
      }));
    } catch (error) {
      console.error('Error searching crypto:', error);
      return [];
    }
  },

  // Search Stocks (Finnhub)
  async searchStocks(query: string, apiKey: string): Promise<SearchResult[]> {
    if (!apiKey || query.length < 2) return [];
    try {
      const res = await fetch(`https://finnhub.io/api/v1/search?q=${query}&token=${apiKey}`);
      const data = await res.json();
      return (data.result || []).slice(0, 10).map((item: any) => ({
        symbol: item.symbol,
        name: item.description,
        type: 'stock'
      }));
    } catch (error) {
      console.error('Error searching stocks:', error);
      return [];
    }
  },

  // Crypto prices using Multiple Sources (CryptoCompare -> Coinbase -> CoinGecko)
  async getCryptoPrice(symbol: string): Promise<PriceResult> {
    const cleanSymbol = symbol.toUpperCase();
    const cacheKey = `crypto_${cleanSymbol}`;
    
    if (priceCache[cacheKey] && Date.now() - priceCache[cacheKey].timestamp < CACHE_DURATION) {
      return { 
        price: priceCache[cacheKey].price,
        metadata: priceCache[cacheKey].metadata
      };
    }

    // 1. Try CryptoCompare (Fast, CORS friendly, supports EUR)
    try {
      const res = await fetch(`https://min-api.cryptocompare.com/data/price?fsym=${cleanSymbol}&tsyms=EUR`);
      const data = await res.json();
      if (data.EUR) {
        const price = data.EUR;
        const metadata: StockMetadata = { currency: 'EUR', instrumentType: 'CRYPTOCURRENCY' };
        priceCache[cacheKey] = { price, timestamp: Date.now(), metadata };
        return { price, metadata };
      }
    } catch (e) {
      console.warn('CryptoCompare failed, trying Coinbase...', e);
    }

    // 2. Try Coinbase (Reliable, USD)
    try {
      const res = await fetch(`https://api.coinbase.com/v2/prices/${cleanSymbol}-USD/spot`);
      const data = await res.json();
      if (data.data && data.data.amount) {
        const price = parseFloat(data.data.amount);
        const metadata: StockMetadata = { currency: 'USD', instrumentType: 'CRYPTOCURRENCY' };
        priceCache[cacheKey] = { price, timestamp: Date.now(), metadata };
        return { price, metadata };
      }
    } catch (e) {
      console.warn('Coinbase failed, trying CoinGecko...', e);
    }

    // 3. Fallback to CoinGecko (Rate limited, needs proxy)
    try {
      // First, we need to find the CoinGecko ID for the symbol
      const idMap: Record<string, string> = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'SOL': 'solana',
        'XRP': 'ripple',
        'ADA': 'cardano',
        'DOT': 'polkadot',
        'DOGE': 'dogecoin',
        'AVAX': 'avalanche-2',
        'MATIC': 'matic-network',
        'USDT': 'tether',
        'USDC': 'usd-coin',
        'BNB': 'binancecoin'
      };

      let id = idMap[cleanSymbol];
      
      // If not in map, try to search (this might be rate limited)
      if (!id) {
        const searchData = await fetchWithProxy(`https://api.coingecko.com/api/v3/search?query=${cleanSymbol}`);
        if (searchData.coins && searchData.coins.length > 0) {
          id = searchData.coins[0].id;
        }
      }

      if (!id) return { price: null, error: 'Symbol not found' };

      const data = await fetchWithProxy(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=eur`);
      
      if (data[id] && data[id].eur) {
        const price = data[id].eur;
        const metadata: StockMetadata = { currency: 'EUR', instrumentType: 'CRYPTOCURRENCY' };
        priceCache[cacheKey] = { price, timestamp: Date.now(), metadata };
        return { price, metadata };
      }
      
      return { price: null, error: 'Price not found' };
    } catch (error) {
      console.error('Error fetching crypto price:', error);
      return { price: null, error: 'Network error' };
    }
  },

  // Stock prices using Finnhub (Requires API Key) or Yahoo Finance (Fallback)
  async getStockPrice(ticker: string, apiKey: string): Promise<PriceResult> {
    const cleanTicker = ticker.trim().toUpperCase();
    const cacheKey = `stock_${cleanTicker}`;
    
    if (priceCache[cacheKey] && Date.now() - priceCache[cacheKey].timestamp < CACHE_DURATION) {
      return { 
        price: priceCache[cacheKey].price,
        metadata: priceCache[cacheKey].metadata
      };
    }

    // Strategy:
    // 1. If ticker has a suffix (e.g. .DE, .PA) -> Try Yahoo first (Finnhub Free is mostly US only)
    // 2. If no suffix -> Try Finnhub first (more reliable for US), then Yahoo
    // 3. If no API key -> Yahoo only

    const hasSuffix = cleanTicker.includes('.');
    const cleanKey = apiKey?.trim();

    if (hasSuffix || !cleanKey) {
      // Try Yahoo first
      const yahooRes = await this.getYahooPrice(cleanTicker);
      if (yahooRes.price !== null) return yahooRes;
      
      // If Yahoo failed and we have a key, try Finnhub as backup (might work for some)
      if (cleanKey) {
        return this.fetchFinnhub(cleanTicker, cleanKey);
      }
      return yahooRes; // Return the Yahoo error
    } else {
      // Try Finnhub first (US Stocks)
      const finnhubRes = await this.fetchFinnhub(cleanTicker, cleanKey);
      if (finnhubRes.price !== null) return finnhubRes;
      
      // Fallback to Yahoo
      console.warn(`Finnhub failed for ${cleanTicker}, trying Yahoo...`);
      return this.getYahooPrice(cleanTicker);
    }
  },

  async fetchFinnhub(ticker: string, apiKey: string): Promise<PriceResult> {
    try {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`);
      
      if (res.status === 403) {
        // Silent fail for 403, just return error object
        return { price: null, error: 'Finnhub 403 (Restricted)' };
      }

      if (!res.ok) {
        return { price: null, error: `Finnhub Error ${res.status}` };
      }
      
      const data = await res.json();
      if (data.c !== undefined && data.c !== null && data.c !== 0) {
        const price = data.c;
        const cacheKey = `stock_${ticker}`;
        const metadata: StockMetadata = { currency: 'USD' }; // Default assumption for Finnhub US
        priceCache[cacheKey] = { price, timestamp: Date.now(), metadata };
        return { price, metadata };
      }
      return { price: null, error: 'Price not found' };
    } catch (error) {
      console.error('Finnhub fetch error:', error);
      return { price: null, error: 'Network error' };
    }
  },

  // Fallback using Yahoo Finance via CORS Proxy
  async getYahooPrice(ticker: string): Promise<PriceResult> {
    const cacheKey = `yahoo_${ticker}`;
    if (priceCache[cacheKey] && Date.now() - priceCache[cacheKey].timestamp < CACHE_DURATION) {
      return { 
        price: priceCache[cacheKey].price,
        metadata: priceCache[cacheKey].metadata 
      };
    }

    // Helper to fetch from Yahoo Chart API (v8) - Reliable for Price, no crumb needed usually
    const fetchChart = async () => {
      const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
      
      // List of proxies to try
      const proxies = [
        { url: (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`, isRaw: false },
        { url: (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`, isRaw: true },
        { url: (u: string) => `https://thingproxy.freeboard.io/fetch/${u}`, isRaw: false }
      ];

      for (const proxy of proxies) {
        try {
          const url = proxy.url(targetUrl);
          const res = await fetch(url);
          if (!res.ok) continue;
          
          const data = await res.json();
          const json = (data.contents && typeof data.contents === 'string') ? JSON.parse(data.contents) : data;
          
          const result = json.chart?.result?.[0];
          if (!result || !result.meta || !result.meta.regularMarketPrice) continue;

          return {
            price: result.meta.regularMarketPrice,
            currency: result.meta.currency,
            exchangeTimezoneName: result.meta.exchangeTimezoneName,
            exchangeName: result.meta.exchangeName,
            instrumentType: result.meta.instrumentType
          };
        } catch (e) {
          // Try next proxy
        }
      }
      throw new Error('All proxies failed for Yahoo Chart');
    };

    // Helper to fetch from Yahoo Search API (v1) - Reliable for Name, no crumb needed usually
    const fetchSearch = async () => {
      const targetUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${ticker}&quotesCount=1&newsCount=0`;
      
      const proxies = [
        { url: (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`, isRaw: false },
        { url: (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`, isRaw: true }
      ];

      for (const proxy of proxies) {
        try {
          const url = proxy.url(targetUrl);
          const res = await fetch(url);
          if (!res.ok) continue;
          
          const data = await res.json();
          const json = (data.contents && typeof data.contents === 'string') ? JSON.parse(data.contents) : data;
          
          const result = json.quotes?.[0];
          if (result) {
            return {
              longName: result.longname || result.shortname || result.symbol,
              type: result.quoteType
            };
          }
        } catch (e) {
          // Try next proxy
        }
      }
      throw new Error('All proxies failed for Yahoo Search');
    };

    try {
      // 1. Get Price (Essential)
      const priceData = await fetchChart();

      // 2. Get Metadata (Optional but desired for Name)
      let searchData = { longName: ticker, type: '' };
      try {
        searchData = await fetchSearch();
      } catch (e) {
         console.warn('Metadata search failed, using ticker as name');
      }

      const metadata: StockMetadata = {
        currency: priceData.currency,
        exchangeTimezoneName: priceData.exchangeTimezoneName,
        exchangeName: priceData.exchangeName,
        instrumentType: searchData.type || priceData.instrumentType,
        longName: searchData.longName
      };

      priceCache[cacheKey] = { price: priceData.price, timestamp: Date.now(), metadata };
      return { price: priceData.price, metadata };

    } catch (error) {
      console.error('Yahoo Price Fetch failed:', error);
      return { price: null, error: 'Price unavailable (Yahoo)' };
    }
  },

  // Get stock name/description
  async getStockName(ticker: string, apiKey: string): Promise<string | null> {
    const cleanTicker = ticker.trim().toUpperCase();
    
    // 1. Try Finnhub Search if API key exists
    if (apiKey) {
      try {
        const results = await this.searchStocks(cleanTicker, apiKey);
        const match = results.find(r => r.symbol === cleanTicker);
        if (match) return match.name;
        if (results.length > 0) return results[0].name;
      } catch (e) {
        console.warn('Finnhub name search failed', e);
      }
    }

    // 2. Try Yahoo Price (which now fetches Quote with longName)
    try {
      const result = await this.getYahooPrice(cleanTicker);
      if (result.metadata?.longName) {
        return result.metadata.longName;
      }
    } catch (e) {
      console.warn('Yahoo name fetch failed', e);
    }

    return null;
  }
};
