import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User, signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { PriceProvider } from './contexts/PriceContext';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { CategoryDetail } from './components/CategoryDetail';
import { Settings } from './components/Settings';
import { Login } from './components/Login';
import type { AssetCategory } from './types';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    console.log("App mounted, initializing auth listener...");
    try {
      const unsubscribe = onAuthStateChanged(auth, 
        (currentUser) => {
          console.log("Auth state changed:", currentUser ? "User logged in" : "User logged out");
          setUser(currentUser);
          setLoading(false);
        },
        (authError) => {
          console.error("Auth error:", authError);
          setError(authError.message);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch (err: any) {
      console.error("Error setting up auth listener:", err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      setTimeout(() => {
        const element = document.getElementById('category-detail-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [selectedCategory]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (error) {
    return (
      <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>
        <h2>Application Error</h2>
        <p>{error}</p>
        <p>Check your console for more details.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'white' 
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <SettingsProvider>
      <CurrencyProvider>
        <PriceProvider>
          <div className="app">
            <Header 
              onSettingsClick={() => setSettingsOpen(true)} 
              onLogout={handleLogout}
              userEmail={user.email}
            />
            <main className="main-content">
              <Dashboard
                onCategorySelect={setSelectedCategory}
                selectedCategory={selectedCategory}
              />
              <div id="category-detail-section">
                {selectedCategory && (
                  <CategoryDetail
                    category={selectedCategory}
                    onClose={() => setSelectedCategory(null)}
                  />
                )}
              </div>
            </main>
            <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
          </div>
        </PriceProvider>
      </CurrencyProvider>
    </SettingsProvider>
  );
}

export default App;
