import { useCurrency } from '../hooks/useCurrency';
import { CURRENCIES } from '../types';
import type { Currency } from '../types';
import './Settings.css';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Settings({ isOpen, onClose }: SettingsProps) {
  const { currency, setCurrency } = useCurrency();

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
        </div>
      </div>
    </div>
  );
}
