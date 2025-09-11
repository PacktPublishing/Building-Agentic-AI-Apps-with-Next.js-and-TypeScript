# MCP Amadeus Server

Un serveur MCP (Model Context Protocol) pour l'API Amadeus, permettant la recherche de vols, d'hôtels, d'aéroports et d'informations sur les compagnies aériennes.

## Fonctionnalités

- **Recherche de vols** : Recherche de vols avec filtres avancés (classe, prix, escales, etc.)
- **Analyse des prix** : Analyse des prix et prédictions pour des routes spécifiques
- **Recherche d'aéroports** : Recherche d'aéroports par nom, ville ou code IATA
- **Informations compagnies** : Récupération d'informations sur les compagnies aériennes
- **Recherche d'hôtels** : Recherche d'hôtels par ville avec dates et nombre d'invités

## Configuration

1. Copiez le fichier `env.example` vers `.env.local` :
```bash
cp env.example .env.local
```

2. Configurez vos identifiants Amadeus dans `.env.local` :
```env
AMADEUS_CLIENT_ID=your_amadeus_client_id_here
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret_here
AMADEUS_HOSTNAME=test
```

3. Obtenez vos identifiants sur [Amadeus for Developers](https://developers.amadeus.com/)

## Installation

```bash
pnpm install
```

## Développement

```bash
pnpm dev
```

Le serveur sera disponible sur [http://localhost:3000](http://localhost:3000).

## Outils MCP disponibles

### 1. search_flights
Recherche de vols entre deux aéroports avec filtres.

**Paramètres :**
- `origin` : Code IATA de l'aéroport de départ (3 lettres)
- `destination` : Code IATA de l'aéroport d'arrivée (3 lettres)
- `departureDate` : Date de départ (YYYY-MM-DD)
- `returnDate` : Date de retour optionnelle (YYYY-MM-DD)
- `adults` : Nombre d'adultes (1-9, défaut: 1)
- `children` : Nombre d'enfants (0-9, défaut: 0)
- `infants` : Nombre de bébés (0-9, défaut: 0)
- `travelClass` : Classe de voyage (ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST)
- `nonStop` : Vols directs uniquement (boolean, défaut: false)
- `maxPrice` : Prix maximum (optionnel)
- `currency` : Code devise (défaut: EUR)

### 2. analyze_flight_prices
Analyse des prix et prédictions pour une route.

**Paramètres :**
- `origin` : Code IATA de l'aéroport de départ
- `destination` : Code IATA de l'aéroport d'arrivée
- `departureDate` : Date de départ (YYYY-MM-DD)
- `currency` : Code devise (défaut: EUR)

### 3. search_airports
Recherche d'aéroports par nom, ville ou code IATA.

**Paramètres :**
- `keyword` : Nom d'aéroport, ville ou code IATA
- `countryCode` : Code pays pour filtrer (optionnel)

### 4. get_airline_info
Informations sur les compagnies aériennes.

**Paramètres :**
- `airlineCodes` : Codes IATA des compagnies séparés par des virgules (ex: "AF,KL,LH")

### 5. search_hotels
Recherche d'hôtels dans une ville.

**Paramètres :**
- `cityCode` : Code IATA de la ville
- `checkInDate` : Date d'arrivée (YYYY-MM-DD)
- `checkOutDate` : Date de départ (YYYY-MM-DD)
- `adults` : Nombre d'adultes (1-9, défaut: 1)
- `roomQuantity` : Nombre de chambres (1-8, défaut: 1)
- `currency` : Code devise (défaut: EUR)
- `bestRateOnly` : Meilleur tarif uniquement (défaut: true)

## Architecture

```
├── app/
│   ├── api/
│   │   └── [transport]/
│   │       └── route.ts          # Handler MCP principal
│   └── page.tsx                  # Page d'accueil
├── lib/
│   ├── tools/
│   │   └── amadeus.ts           # Client Amadeus
│   ├── types/
│   │   └── amadeus.ts           # Types et schémas Zod
│   └── usage/
│       └── logger.ts            # Logger pour les usages
├── types/
│   └── amadeus.d.ts             # Déclarations TypeScript pour Amadeus
└── env.example                  # Variables d'environnement exemple
```

## Technologies utilisées

- **Next.js 15** : Framework React
- **TypeScript** : Typage statique
- **Zod** : Validation des schémas
- **mcp-handler** : Gestion du protocole MCP
- **Amadeus SDK** : API Amadeus
- **pnpm** : Gestionnaire de paquets

## Déploiement

Le projet peut être déployé sur Vercel, Netlify ou tout autre plateforme supportant Next.js.

```bash
pnpm build
pnpm start
```
