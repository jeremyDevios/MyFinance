import { useState, useEffect } from 'react';
import { useCurrency } from '../hooks/useCurrency';
import { useSettings } from '../contexts/SettingsContext';
import { CURRENCIES } from '../types';
import type { Currency } from '../types';
import './Settings.css';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Settings({ isOpen, onClose }: SettingsProps) {
  const { currency, setCurrency } = useCurrency();
  const { finnhubApiKey, setFinnhubApiKey, monthlyExpenses, setMonthlyExpenses } = useSettings();
  const [localKey, setLocalKey] = useState(finnhubApiKey);
  const [localExpenses, setLocalExpenses] = useState(String(monthlyExpenses));

  useEffect(() => {
    setLocalKey(finnhubApiKey);
  }, [finnhubApiKey]);

  useEffect(() => {
    setLocalExpenses(String(monthlyExpenses));
  }, [monthlyExpenses]);

  const handleSaveKey = async () => {
    await setFinnhubApiKey(localKey);
    alert('Clé API sauvegardée !');
  };

  const handleSaveExpenses = async () => {
    const amount = parseFloat(localExpenses);
    if (!isNaN(amount) && amount >= 0) {
      await setMonthlyExpenses(amount);
      alert('Dépenses mensuelles sauvegardées !');
    } else {
      alert('Veuillez entrer un montant valide.');
    }
  };

  if (!isOpen) return null;

  const currencies = Object.values(CURRENCIES);

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Paramètres</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="settings-content">
          <div className="setting-group">
            <label className="setting-label">Devise d'affichage</label>
            <p className="setting-description">
              Sélectionnez la devise dans laquelle afficher les valeurs
            </p>
            <div className="currency-options">
              {currencies.map((curr) => (
                <button
                  key={curr.code}
                  className={`currency-option ${currency === curr.code ? 'selected' : ''}`}
                  onClick={() => setCurrency(curr.code as Currency)}
                >
                  <span className="currency-symbol">{curr.symbol}</span>
                  <span className="currency-name">{curr.name}</span>
                  <span className="currency-code">{curr.code}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="setting-group">
            <label className="setting-label">Dépenses Mensuelles Moyennes</label>
            <p className="setting-description">
              Utilisé pour calculer votre épargne de précaution idéale (3 à 6 mois de dépenses).
            </p>
            <div className="api-input-group">
              <input 
                type="number" 
                value={localExpenses} 
                onChange={(e) => setLocalExpenses(e.target.value)}
                placeholder="0.00"
                className="api-key-input"
                min="0"
              />
              <button onClick={handleSaveExpenses} className="save-button">
                Sauvegarder
              </button>
            </div>
          </div>

          <div className="setting-group">
            <label className="setting-label">API Bourse (Finnhub)</label>
            <p className="setting-description">
              Nécessaire pour récupérer les prix des actions en temps réel.
              <br />
              <a href="https://finnhub.io/register" target="_blank" rel="noopener noreferrer" style={{ color: '#646cff' }}>
                Obtenir une clé gratuite
              </a>
            </p>
            <div className="api-input-group">
              <input 
                type="text" 
                value={localKey} 
                onChange={(e) => setLocalKey(e.target.value)}
                placeholder="Entrez votre clé API Finnhub"
                className="api-key-input"
              />
              <button onClick={handleSaveKey} className="save-button">
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
