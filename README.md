# Eurodesign Pro - B2B Platform

Plateforme B2B dédiée aux professionnels du mobilier et de l'agencement. Permet aux utilisateurs de parcourir un catalogue de produits, de les sélectionner et de les importer automatiquement dans leur boutique Shopify.

## 🚀 Technologies

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Rate Limiting**: Upstash Redis
- **Validation**: Zod
- **Icons**: Lucide React

## 📋 Fonctionnalités

### Utilisateurs
- ✅ Inscription avec validation admin
- ✅ Connexion sécurisée
- ✅ Gestion du profil
- ✅ Configuration Shopify (token chiffré)

### Catalogue
- ✅ Recherche et filtrage de produits
- ✅ Pagination
- ✅ Prix selon catégorie utilisateur
- ✅ Sélection multiple

### Panier & Import
- ✅ Ajout/suppression de produits
- ✅ Import vers Shopify
- ✅ Suivi des produits importés

### Administration
- ✅ Validation des comptes
- ✅ Gestion des utilisateurs
- ✅ Attribution des rôles admin

## 🔐 Sécurité

- **Token Shopify**: Chiffré AES-256-GCM côté serveur, jamais exposé au client
- **Validation**: Tous les inputs validés avec Zod
- **RLS**: Row Level Security Supabase pour isolation des données
- **Rate Limiting**: Protection contre les abus via Redis
- **CORS**: Origines autorisées configurables
- **Headers**: CSP, X-Frame-Options, etc.

## 📁 Structure du projet

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── admin/         # Endpoints admin
│   │   ├── cart/          # Gestion panier
│   │   ├── categories/    # Catégories
│   │   ├── products/      # Produits
│   │   ├── profile/       # Profil utilisateur
│   │   └── shopify/       # Intégration Shopify
│   ├── admin/             # Pages admin
│   ├── products/          # Pages catalogue
│   ├── shopping-cart/     # Page panier
│   └── user/              # Pages auth/profil
├── components/            # Composants React
│   ├── layout/            # Layout (Navbar, Footer)
│   ├── products/          # Composants produits
│   └── ui/                # Composants UI (Button, Input)
├── lib/                   # Utilitaires
│   ├── api/               # Helpers API
│   ├── ratelimit/         # Rate limiting
│   ├── schemas/           # Schémas Zod
│   ├── security/          # Chiffrement, logs
│   ├── services/          # Services métier
│   └── supabase/          # Clients Supabase
└── types/                 # Types TypeScript
```

## ⚙️ Installation

### Prérequis
- Node.js 18+
- npm ou yarn
- Compte Supabase
- Compte Upstash Redis (optionnel, pour rate limiting)

### 1. Cloner et installer

```bash
git clone <repository>
cd eurodesign-pro
npm install
```

### 2. Configuration environnement

Copier `.env.example` vers `.env.local` et remplir les variables :

```bash
cp .env.example .env.local
```

Variables requises :
- `NEXT_PUBLIC_SUPABASE_URL` - URL Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Clé anonyme Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Clé service role
- `SHOPIFY_TOKEN_ENCRYPTION_KEY` - Clé 32 bytes hex pour chiffrement

### 3. Base de données

Exécuter les migrations dans l'ordre :

```bash
# Via Supabase CLI
supabase db push

# Ou manuellement dans l'éditeur SQL Supabase
# 1. supabase/migrations/001_initial_schema.sql
# 2. supabase/migrations/002_rls_policies.sql
```

### 4. Lancer le serveur

```bash
npm run dev
```

Ouvrir http://localhost:3000

## 🔧 Scripts

```bash
npm run dev      # Développement
npm run build    # Build production
npm run start    # Serveur production
npm run lint     # Linting
npm run test     # Tests
```

## 📊 Schéma base de données

### Tables principales

| Table | Description |
|-------|-------------|
| `profiles` | Profils utilisateurs (extension auth.users) |
| `shopify_config` | Configuration Shopify (token chiffré) |
| `panier_dropshipping` | Panier utilisateur |
| `shopify_listings` | Produits importés vers Shopify |
| `PRODUITS` | Catalogue produits |
| `CATEGORIES` | Catégories produits |
| `PRIX` | Prix par catégorie |
| `IMAGES_PRODUITS` | Images produits |

### Relations

```
auth.users (Supabase)
    └── profiles (1:1)
            ├── shopify_config (1:1)
            ├── panier_dropshipping (1:N)
            └── shopify_listings (1:N)

CATEGORIES
    └── PRODUITS (1:N)
            ├── IMAGES_PRODUITS (1:N)
            ├── PRIX (1:N par catégorie)
            ├── CONF_PRODUITS (1:1)
            └── COLIS (1:N)
```

## 🔄 Flux d'authentification

1. **Inscription** → Compte créé en attente de validation
2. **Validation admin** → Compte confirmé
3. **Connexion** → Vérification statut confirmed/rejected
4. **Session** → Middleware vérifie session + statut à chaque requête

## 🛒 Flux d'import Shopify

1. Utilisateur configure son token Shopify (chiffré côté serveur)
2. Ajoute des produits au panier
3. Lance l'import
4. Backend déchiffre le token, appelle l'API Shopify
5. Produits créés dans Shopify, mappings sauvegardés
6. Produits retirés du panier

## 📝 API Endpoints

### Authentification
- `POST /api/profile/create` - Créer profil après inscription
- `GET /api/profile/me` - Récupérer profil
- `PUT /api/profile/me` - Mettre à jour profil

### Catalogue
- `GET /api/categories` - Liste catégories
- `POST /api/products/search` - Recherche produits
- `GET /api/products/[id]` - Détail produit

### Panier
- `GET /api/cart` - Récupérer panier
- `POST /api/cart` - Ajouter au panier
- `DELETE /api/cart` - Retirer du panier

### Shopify
- `GET /api/shopify/config` - Récupérer config
- `POST /api/shopify/config` - Sauvegarder config
- `POST /api/shopify/validate` - Tester connexion
- `POST /api/shopify/import` - Importer produits
- `GET /api/shopify/listings` - Produits importés

### Admin
- `GET /api/admin/pending-profiles` - Comptes en attente
- `POST /api/admin/confirm-profile` - Confirmer compte
- `POST /api/admin/reject-profile` - Rejeter compte
- `GET /api/admin/users` - Liste utilisateurs
- `POST /api/admin/set-admin` - Gérer rôle admin
- `POST /api/admin/toggle-account` - Activer/désactiver compte


## 📄 License

Propriétaire - Eurodesign France
