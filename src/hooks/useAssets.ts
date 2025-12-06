import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import type { Asset, AssetCategory, CategorySummary, PortfolioSummary } from '../types';
import { CATEGORIES } from '../types';

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Clean up previous subscription if exists
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = undefined;
      }

      if (!user) {
        setAssets([]);
        setLoading(false);
        return;
      }

      const q = query(collection(db, `users/${user.uid}/assets`));
      unsubscribeSnapshot = onSnapshot(q, (querySnapshot) => {
        const assetsData: Asset[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Convert Firestore Timestamp to Date if needed
          const lastUpdated = data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date(data.lastUpdated);
          const purchaseDate = data.purchaseDate?.toDate ? data.purchaseDate.toDate() : (data.purchaseDate ? new Date(data.purchaseDate) : undefined);
          
          assetsData.push({
            ...data,
            id: doc.id,
            lastUpdated,
            purchaseDate,
          } as Asset);
        });
        setAssets(assetsData);
        setLoading(false);
      }, (error) => {
        // Ignore permission-denied errors that happen during logout
        if (error.code === 'permission-denied') {
          return;
        }
        console.error("Error fetching assets:", error);
        setLoading(false);
      });
    });

    return () => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      unsubscribeAuth();
    };
  }, []);

  const addAsset = useMemo(() => async (asset: Omit<Asset, 'id'>) => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    await addDoc(collection(db, `users/${user.uid}/assets`), {
      ...asset,
      lastUpdated: new Date()
    });
  }, []);

  const deleteAsset = useMemo(() => async (assetId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    await deleteDoc(doc(db, `users/${user.uid}/assets`, assetId));
  }, []);

  const updateAsset = useMemo(() => async (assetId: string, asset: Partial<Asset>) => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    // Remove id from asset object if present to avoid overwriting it in Firestore
    const { id, ...assetData } = asset as any;
    
    await updateDoc(doc(db, `users/${user.uid}/assets`, assetId), {
      ...assetData,
      lastUpdated: new Date()
    });
  }, []);

  const getAssetsByCategory = useMemo(() => (category: AssetCategory): Asset[] => {
    return assets.filter((asset) => asset.category === category);
  }, [assets]);

  const getSubGroupsByCategory = useMemo(() => (category: AssetCategory): string[] => {
    const groups = new Set<string>();
    assets.filter(a => a.category === category).forEach(a => {
      if (a.subGroup) groups.add(a.subGroup);
      // Also check institution for legacy/compatibility
      if ('institution' in a && (a as any).institution) groups.add((a as any).institution);
    });
    return Array.from(groups).sort();
  }, [assets]);

  const portfolioSummary: PortfolioSummary = useMemo(() => {
    const totalValue = assets.reduce((sum, asset) => sum + asset.valueInEur, 0);

    const categoryTotals = Object.keys(CATEGORIES).reduce(
      (acc, cat) => {
        const category = cat as AssetCategory;
        const categoryAssets = assets.filter((a) => a.category === category);
        const categoryTotal = categoryAssets.reduce((sum, a) => sum + a.valueInEur, 0);
        
        acc[category] = {
          category,
          totalValue: categoryTotal,
          assetCount: categoryAssets.length,
          percentageOfTotal: totalValue > 0 ? (categoryTotal / totalValue) * 100 : 0,
        };
        return acc;
      },
      {} as Record<AssetCategory, CategorySummary>
    );

    return {
      totalValue,
      categories: Object.values(categoryTotals),
      lastUpdated: new Date(),
    };
  }, [assets]);

  return {
    assets,
    loading,
    addAsset,
    deleteAsset,
    updateAsset,
    getAssetsByCategory,
    getSubGroupsByCategory,
    portfolioSummary,
  };
}
