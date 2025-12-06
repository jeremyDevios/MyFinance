# MyFinance 💎

Dashboard personnel de suivi financier, entièrement sous ton contrôle.

## Fonctionnalités

- **Vue d'ensemble du patrimoine total** : Affichage en temps réel de la valeur totale de votre patrimoine
- **Changement de devise** : Possibilité de changer la devise d'affichage dans les paramètres (EUR, USD, GBP, CHF, JPY)
- **Catégories d'actifs** :
  - 💰 **Livrets Épargne** : Livret A, LDDS, PEL, etc.
  - 🏦 **Comptes Courants** : Multi-devises (EUR, USD, GBP, etc.)
  - 📈 **Bourse** : Actions et ETF avec suivi des performances
  - 🪙 **Crypto** : Bitcoin, Ethereum, Solana, etc.
  - 🏠 **Immobilier** : Appartements, maisons, locaux commerciaux

## Aperçu

### Dashboard Général
![Dashboard](images/Dashboard.png)

### Détail des Livrets (Épargne de précaution)
![Livrets](images/Livrets.png)

### Détail de la Bourse
![Bourse](images/Bourse.png)

## Technologies

- React 19
- TypeScript
- Vite 7

## Démarrage

```bash
# Installation des dépendances
npm install

# Lancement en développement
npm run dev

# Build de production
npm run build

# Linting
npm run lint
```

## Structure du projet

```
src/
├── components/       # Composants React
│   ├── Dashboard.tsx
│   ├── CategoryCard.tsx
│   ├── CategoryDetail.tsx
│   ├── Header.tsx
│   └── Settings.tsx
├── contexts/         # Contextes React (CurrencyContext)
├── hooks/            # Hooks personnalisés (useAssets, useCurrency)
├── types/            # Types TypeScript
├── data/             # Données d'exemple
└── App.tsx           # Composant principal
```
