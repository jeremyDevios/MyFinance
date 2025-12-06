import { useCurrency } from '../hooks/useCurrency';
import './Header.css';

interface HeaderProps {
  onSettingsClick: () => void;
  onLogout?: () => void;
  userEmail?: string | null;
}

export function Header({ onSettingsClick, onLogout, userEmail }: HeaderProps) {
  const { currency, getSymbol } = useCurrency();

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo">
          <span className="logo-icon">💎</span>
          <h1>MyFinance</h1>
        </div>
        <div className="header-actions">
          {userEmail && <span className="user-email">{userEmail}</span>}
          <button className="currency-badge" onClick={onSettingsClick}>
            {getSymbol()} {currency}
          </button>
          <button className="settings-button" onClick={onSettingsClick} aria-label="Paramètres">
            ⚙️
          </button>
          {onLogout && (
            <button className="logout-button" onClick={onLogout} aria-label="Déconnexion">
              🚪
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
