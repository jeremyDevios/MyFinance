import { useState, useEffect } from 'react';
import { useAssets } from '../hooks/useAssets';
import { priceService, type SearchResult } from '../services/priceService';
import { useSettings } from '../contexts/SettingsContext';
import { CATEGORIES, CURRENCIES } from '../types';
import type { AssetCategory, Currency, Asset } from '../types';
import './AddAssetModal.css';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAsset?: Asset | null;
}

export function AddAssetModal({ isOpen, onClose, initialAsset }: AddAssetModalProps) {
  const { addAsset, updateAsset, getSubGroupsByCategory } = useAssets();
  const { finnhubApiKey } = useSettings();
  
  // Form State
  const [category, setCategory] = useState<AssetCategory>('current_account');
  const [subGroup, setSubGroup] = useState('');
  const [ticker, setTicker] = useState(''); // Ticker/Symbol only
  const [name, setName] = useState(''); // Display Name
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState(''); // Purchase Price
  const [currentPriceInput, setCurrentPriceInput] = useState(''); // Current Price (for unlisted)
  const [geography, setGeography] = useState('Inconnue');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [isListed, setIsListed] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingSubGroups, setExistingSubGroups] = useState<string[]>([]);

  // Autocomplete State
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Update existing subgroups when category changes
  useEffect(() => {
    if (isOpen) {
      setExistingSubGroups(getSubGroupsByCategory(category));
    }
  }, [category, isOpen, getSubGroupsByCategory]);

  // Search effect for autocomplete
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (ticker.length < 2 || !['stocks', 'crypto'].includes(category)) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      let results: SearchResult[] = [];
      if (category === 'crypto') {
        results = await priceService.searchCrypto(ticker);
      } else if (category === 'stocks') {
        results = await priceService.searchStocks(ticker, finnhubApiKey);
      }
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [ticker, category, finnhubApiKey]);

  const handleSelectSuggestion = (suggestion: SearchResult) => {
    setTicker(suggestion.symbol);
    setName(suggestion.name); // Auto-fill name with description
    setShowSuggestions(false);
  };

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      if (initialAsset) {
        // Edit mode
        setCategory(initialAsset.category);
        setSubGroup(initialAsset.subGroup || (initialAsset as any).institution || '');
        setName(initialAsset.name || '');
        
        // Handle Ticker/Symbol
        if ('ticker' in initialAsset) {
          setTicker((initialAsset as any).ticker);
        } else if ('symbol' in initialAsset) {
          setTicker((initialAsset as any).symbol);
        } else {
          setTicker('');
        }
        
        // Handle quantity
        if ('quantity' in initialAsset) {
          setQuantity(String(initialAsset.quantity));
        } else {
          setQuantity('');
        }

        // Handle price/value
        if ('purchasePrice' in initialAsset) {
          setPrice(String(initialAsset.purchasePrice));
          // For unlisted stocks, we also need current price
          if ('currentPrice' in initialAsset) {
            setCurrentPriceInput(String(initialAsset.currentPrice));
          } else {
            setCurrentPriceInput(String(initialAsset.purchasePrice));
          }
        } else if ('originalValue' in initialAsset) {
          setPrice(String(initialAsset.originalValue));
          setCurrentPriceInput(String(initialAsset.originalValue));
        } else if ('currentValue' in initialAsset) {
          setPrice(String(initialAsset.currentValue)); // For real estate
          setCurrentPriceInput(String(initialAsset.currentValue));
        } else {
          setPrice(String(initialAsset.valueInEur)); // Fallback
          setCurrentPriceInput(String(initialAsset.valueInEur));
        }

        // Handle currency
        if ('currency' in initialAsset) {
          setCurrency(initialAsset.currency as Currency);
        } else if ('originalCurrency' in initialAsset) {
          setCurrency(initialAsset.originalCurrency as Currency);
        } else {
          setCurrency('EUR');
        }

        // Handle interest rate
        if ('interestRate' in initialAsset) {
          setInterestRate(String(initialAsset.interestRate));
        } else {
          setInterestRate('');
        }

        // Handle isListed
        if ('isListed' in initialAsset) {
          setIsListed((initialAsset as any).isListed);
        } else {
          setIsListed(true);
        }

        // Handle geography
        if ('geography' in initialAsset) {
          setGeography((initialAsset as any).geography);
        } else {
          setGeography('Automatique');
        }

        // Handle date
        if (initialAsset.purchaseDate) {
          // Check if it's a Firestore Timestamp (has toDate) or Date object
          const dateObj = (initialAsset.purchaseDate as any).toDate 
            ? (initialAsset.purchaseDate as any).toDate() 
            : new Date(initialAsset.purchaseDate);
            
          if (!isNaN(dateObj.getTime())) {
             setDate(dateObj.toISOString().split('T')[0]);
          }
        } else {
           setDate(new Date().toISOString().split('T')[0]);
        }

        setNote(initialAsset.note || '');
      } else {
        // Create mode
        setCategory('current_account');
        setSubGroup('');
        setTicker('');
        setName('');
        setQuantity('');
        setPrice('');
        setCurrentPriceInput('');
        setCurrency('EUR');
        setDate(new Date().toISOString().split('T')[0]);
        setNote('');
        setInterestRate('');
        setIsListed(true);
        setGeography('Automatique');
      }
      setError(null);
    }
  }, [isOpen, initialAsset]);

  if (!isOpen) return null;

  const isInvestment = ['stocks', 'crypto'].includes(category);
  const isRealEstate = category === 'real_estate';

  const getLabelForSubGroup = () => {
    switch (category) {
      case 'stocks': return 'Courtier / Enveloppe (ex: PEA, CTO)';
      case 'crypto': return 'Plateforme / Wallet (ex: Binance, Ledger)';
      case 'savings': return 'Banque';
      case 'current_account': return 'Banque';
      default: return 'Groupe';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const priceNum = parseFloat(price);
      const quantityNum = isInvestment ? parseFloat(quantity) : 1;
      const interestRateNum = parseFloat(interestRate) || 0;
      
      // Determine current price
      let currentPriceNum = priceNum;
      if (!isListed && category === 'stocks' && currentPriceInput) {
        currentPriceNum = parseFloat(currentPriceInput);
      }
      
      // Simple conversion rate mock (should be real API)
      const rates: Record<string, number> = { EUR: 1, USD: 0.92, GBP: 1.17, CHF: 1.05, JPY: 0.006 };
      const rate = rates[currency] || 1;
      const valueInEur = currentPriceNum * quantityNum * rate;

      // Use provided name or fallback to ticker/symbol if empty
      const finalName = name.trim() || ticker.toUpperCase();

      const baseAsset = {
        name: finalName,
        category,
        subGroup,
        note,
        purchaseDate: new Date(date),
        originalCurrency: currency,
        lastUpdated: new Date(),
        valueInEur,
      };

      let assetData: any = { ...baseAsset };

      if (category === 'stocks') {
        assetData = {
          ...assetData,
          ticker: isListed ? ticker.toUpperCase() : '',
          quantity: quantityNum,
          purchasePrice: priceNum,
          currentPrice: currentPriceNum,
          type: 'stock', // Default
          isListed: isListed,
          geography: geography !== 'Automatique' ? geography : undefined,
        };
      } else if (category === 'crypto') {
        assetData = {
          ...assetData,
          symbol: ticker.toUpperCase(),
          quantity: quantityNum,
          purchasePrice: priceNum,
          currentPrice: priceNum,
        };
      } else if (category === 'real_estate') {
        assetData = {
          ...assetData,
          address: '', // Optional in this quick form
          purchasePrice: priceNum,
          currentValue: priceNum,
          propertyType: 'apartment',
        };
      } else if (category === 'savings') {
        // Savings
        assetData = {
          ...assetData,
          institution: subGroup,
          currency: currency,
          originalValue: priceNum,
          interestRate: interestRateNum,
        };
      } else {
        // Current Account
        assetData = {
          ...assetData,
          institution: subGroup,
          currency: currency,
          originalValue: priceNum,
        };
      }

      if (initialAsset) {
        await updateAsset(initialAsset.id, assetData);
      } else {
        await addAsset(assetData);
      }
      onClose();
    } catch (error: any) {
      console.error("Error saving asset:", error);
      setError(error.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{initialAsset ? 'Modifier la transaction' : 'Ajouter une transaction'}</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        {error && (
          <div style={{ 
            backgroundColor: 'rgba(220, 38, 38, 0.1)', 
            color: '#ef4444', 
            padding: '1rem', 
            borderRadius: '6px',
            marginBottom: '1rem',
            border: '1px solid rgba(220, 38, 38, 0.2)'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Category */}
          <div className="form-group">
            <label>Catégorie</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value as AssetCategory)}
            >
              {Object.values(CATEGORIES).map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Sub Group (Datalist) */}
          <div className="form-group">
            <label>{getLabelForSubGroup()}</label>
            <input
              list="subgroups"
              value={subGroup}
              onChange={(e) => setSubGroup(e.target.value)}
              placeholder="Sélectionner ou créer..."
              required
            />
            <datalist id="subgroups">
              {existingSubGroups.map((group) => (
                <option key={group} value={group} />
              ))}
            </datalist>
          </div>

          {/* Listed Option (Only for stocks) */}
          {category === 'stocks' && (
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isListed}
                  onChange={(e) => setIsListed(e.target.checked)}
                />
                Actif coté en bourse (Ticker automatique)
              </label>
            </div>
          )}

          {/* Ticker / Symbol (Only for investments) */}
          {isInvestment && isListed ? (
            <div className="form-group">
              <label>{category === 'stocks' ? 'Ticker (ex: AAPL)' : 'Symbole (ex: BTC)'}</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  value={ticker} 
                  onChange={(e) => setTicker(e.target.value)} 
                  placeholder={category === 'stocks' ? 'AAPL' : 'BTC'}
                  required={isListed}
                  autoComplete="off"
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onFocus={() => ticker.length >= 2 && setShowSuggestions(true)}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="suggestions-list">
                    {suggestions.map((s, index) => (
                      <li 
                        key={index} 
                        className="suggestion-item"
                        onClick={() => handleSelectSuggestion(s)}
                      >
                        {s.symbol} <span style={{ opacity: 0.7, fontSize: '0.9em' }}>({s.name})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}

          {/* Name */}
          <div className="form-group">
            <label>Nom de l'actif</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Nom descriptif"
              required 
            />
          </div>

          {/* Quantity (Only for investments) */}
          {isInvestment && (
            <div className="form-group">
              <label>{!isListed && category === 'stocks' ? 'Nombre de parts' : 'Quantité'}</label>
              <input 
                type="number" 
                value={quantity} 
                onChange={(e) => setQuantity(e.target.value)} 
                placeholder="0.00"
                step="any"
                required 
              />
            </div>
          )}

          {/* Price / Value */}
          <div className="form-group">
            <label>
              {isInvestment || isRealEstate ? "Prix d'achat (unitaire)" : "Montant / Solde"}
            </label>
            <div className="value-input-group">
              <input 
                type="number" 
                value={price} 
                onChange={(e) => setPrice(e.target.value)} 
                placeholder="0.00"
                step="any"
                required 
              />
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                {Object.values(CURRENCIES).map((curr) => (
                  <option key={curr.code} value={curr.code}>{curr.code}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Current Price (Only for unlisted stocks) */}
          {!isListed && category === 'stocks' && (
            <div className="form-group">
              <label>Valeur liquidative (actuelle)</label>
              <div className="value-input-group">
                <input 
                  type="number" 
                  value={currentPriceInput} 
                  onChange={(e) => setCurrentPriceInput(e.target.value)} 
                  placeholder="0.00"
                  step="any"
                  required 
                />
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '0 1rem', 
                  backgroundColor: '#2b2b40', 
                  border: '1px solid #3a3a4e', 
                  borderRadius: '6px',
                  color: '#a0a0b0'
                }}>
                  {currency}
                </div>
              </div>
            </div>
          )}

          {/* Geography (For all stocks) */}
          {category === 'stocks' && (
            <div className="form-group">
              <label>Zone Géographique</label>
              <select 
                value={geography} 
                onChange={(e) => setGeography(e.target.value)}
              >
                <option value="Automatique">Automatique (Selon métadonnées)</option>
                <option value="Monde">Monde</option>
                <option value="Etats Unis">Etats Unis</option>
                <option value="Europe">Europe</option>
                <option value="Asie">Asie</option>
                <option value="Emergents">Emergents</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          )}

          {/* Interest Rate (Only for savings) */}
          {category === 'savings' && (
            <div className="form-group">
              <label>Taux d'intérêt (%)</label>
              <input 
                type="number" 
                value={interestRate} 
                onChange={(e) => setInterestRate(e.target.value)} 
                placeholder="3.00"
                step="0.01"
              />
            </div>
          )}

          {/* Date */}
          <div className="form-group">
            <label>Date de transaction</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              required 
            />
          </div>

          {/* Note */}
          <div className="form-group">
            <label>Remarque (Optionnel)</label>
            <textarea 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              rows={2}
              placeholder="Note particulière..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Enregistrement...' : (initialAsset ? 'Modifier' : 'Ajouter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
