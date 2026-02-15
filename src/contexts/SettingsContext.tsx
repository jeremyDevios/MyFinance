import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';

interface SettingsContextType {
  finnhubApiKey: string;
  setFinnhubApiKey: (key: string) => Promise<void>;
  monthlyExpenses: number;
  setMonthlyExpenses: (amount: number) => Promise<void>;
  patrimonyGoal: number;
  setPatrimonyGoal: (amount: number) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Simple obfuscation key
const XOR_KEY = import.meta.env.VITE_APP_SECRET_KEY || "DefaultSecretKey";

const encrypt = (text: string) => {
  if (!text) return '';
  const chars = text.split('');
  const xor = chars.map((c, i) => {
    return c.charCodeAt(0) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length);
  });
  return btoa(String.fromCharCode(...xor));
};

const decrypt = (encoded: string) => {
  if (!encoded) return '';
  try {
    const text = atob(encoded);
    const chars = text.split('');
    const xor = chars.map((c, i) => {
      return String.fromCharCode(c.charCodeAt(0) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length));
    });
    return xor.join('');
  } catch (e) {
    console.error("Error decrypting key", e);
    return '';
  }
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [finnhubApiKey, setFinnhubApiKeyState] = useState('');
  const [monthlyExpenses, setMonthlyExpensesState] = useState(0);
  const [patrimonyGoal, setPatrimonyGoalState] = useState(100000);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          const docRef = doc(db, `users/${user.uid}/settings/config`);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.finnhubApiKey) {
              const decrypted = decrypt(data.finnhubApiKey);
              setFinnhubApiKeyState(decrypted);
            }
            if (data.monthlyExpenses) {
              setMonthlyExpensesState(Number(data.monthlyExpenses));
            }
            if (data.patrimonyGoal) {
              setPatrimonyGoalState(Number(data.patrimonyGoal));
            }
          } else {
            // If not in DB, check localStorage (migration)
            const storedKey = localStorage.getItem('finnhub_api_key');
            if (storedKey) {
              setFinnhubApiKeyState(storedKey);
              // Sync to DB immediately
              await setDoc(doc(db, `users/${user.uid}/settings/config`), {
                finnhubApiKey: encrypt(storedKey),
                updatedAt: new Date()
              }, { merge: true });
            }
          }
        } catch (error) {
          console.error("Error fetching settings:", error);
        }
      } else {
        setUserId(null);
        setFinnhubApiKeyState('');
        setMonthlyExpensesState(0);
        setPatrimonyGoalState(100000);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setFinnhubApiKey = async (key: string) => {
    const trimmedKey = key.trim();
    setFinnhubApiKeyState(trimmedKey);
    
    // Update localStorage for offline/backup
    localStorage.setItem('finnhub_api_key', trimmedKey);

    if (userId) {
      try {
        const encryptedKey = encrypt(trimmedKey);
        await setDoc(doc(db, `users/${userId}/settings/config`), {
          finnhubApiKey: encryptedKey,
          updatedAt: new Date()
        }, { merge: true });
      } catch (error) {
        console.error("Error saving settings:", error);
      }
    }
  };

  const setMonthlyExpenses = async (amount: number) => {
    setMonthlyExpensesState(amount);
    
    if (userId) {
      try {
        await setDoc(doc(db, `users/${userId}/settings/config`), {
          monthlyExpenses: amount,
          updatedAt: new Date()
        }, { merge: true });
      } catch (error) {
        console.error("Error saving monthly expenses:", error);
      }
    }
  };

  const setPatrimonyGoal = async (amount: number) => {
    setPatrimonyGoalState(amount);
    
    if (userId) {
      try {
        await setDoc(doc(db, `users/${userId}/settings/config`), {
          patrimonyGoal: amount,
          updatedAt: new Date()
        }, { merge: true });
      } catch (error) {
        console.error("Error saving patrimony goal:", error);
      }
    }
  };

  return (
    <SettingsContext.Provider value={{ finnhubApiKey, setFinnhubApiKey, monthlyExpenses, setMonthlyExpenses, patrimonyGoal, setPatrimonyGoal, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
