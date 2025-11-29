import { useCurrency } from '../hooks/useCurrency';
import './Header.css';

interface HeaderProps {
  onSettingsClick: () => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  const { currency, getSymbol } = useCurrency();

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo">
          <span className="logo-icon">💎</span>
          <h1>MyFinance</h1>
        </div>
        <div className="header-actions">
          <button className="currency-badge" onClick={onSettingsClick}>
            {getSymbol()} {currency}
          </button>
          <button className="settings-button" onClick={onSettingsClick} aria-label="Paramètres">
            ⚙️
          </button>
        </div>
      </div>
    </header>
  );
}
