import { useState } from 'react';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { CategoryDetail } from './components/CategoryDetail';
import { Settings } from './components/Settings';
import type { AssetCategory } from './types';
import './App.css';

function App() {
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <CurrencyProvider>
      <div className="app">
        <Header onSettingsClick={() => setSettingsOpen(true)} />
        <main className="main-content">
          <Dashboard
            onCategorySelect={setSelectedCategory}
            selectedCategory={selectedCategory}
          />
          {selectedCategory && (
            <CategoryDetail
              category={selectedCategory}
              onClose={() => setSelectedCategory(null)}
            />
          )}
        </main>
        <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </CurrencyProvider>
  );
}

export default App;
