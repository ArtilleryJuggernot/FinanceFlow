# FinanceFlow - Gestionnaire de Finances Open Banking

Application complète de gestion de finances personnelles avec connexion bancaire Open Banking (GoCardless), catégorisation intelligente des transactions, budgets, détection d'abonnements, objectifs d'épargne et notifications.

## Fonctionnalités

- **Connexion bancaire** via GoCardless (Open Banking PSD2) - Support de 2000+ banques européennes
- **Import CSV/OFX** en fallback pour les banques non supportées
- **Catégorisation automatique** hybride : règles utilisateur → pattern matching → IA (OpenAI)
- **Budgets** par catégorie avec barres de progression et alertes de dépassement
- **Détection automatique des abonnements** avec estimation du coût mensuel
- **Objectifs d'épargne** avec suivi de progression et projection
- **Dashboard** avec graphiques interactifs (camembert, courbes, tendances)
- **Export** CSV des transactions
- **Notifications** in-app et par email
- **Multi-comptes / multi-banques**
- **Mode sombre / clair**

## Stack technique

| Technologie | Rôle |
|---|---|
| Next.js 15+ | Framework full-stack (App Router) |
| TypeScript | Typage statique |
| Tailwind CSS 4 | Styles |
| Prisma | ORM |
| MariaDB | Base de données |
| NextAuth v5 | Authentification |
| GoCardless | API Open Banking |
| OpenAI | Catégorisation IA |
| Recharts | Graphiques |
| TanStack Query | State management côté client |
| Resend | Envoi d'emails |
| Zod | Validation des données |

## Prérequis

- Node.js 18+
- MariaDB 10.6+ (ou MySQL 8+)
- Compte GoCardless (optionnel, pour la connexion bancaire)
- Clé API OpenAI (optionnel, pour la catégorisation IA)

## Installation

```bash
# 1. Cloner le projet
git clone <url> && cd OpenBanking

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# Éditez .env.local avec vos identifiants

# 4. Créer la base de données
mysql -u root -p -e "CREATE DATABASE openbanking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 5. Appliquer le schéma et seeder les catégories
npx prisma db push
npm run db:seed

# 6. Lancer le serveur de développement
npm run dev
```

L'application est disponible sur [http://localhost:3000](http://localhost:3000).

## Configuration des services externes

### GoCardless (Open Banking)
1. Créez un compte sur [GoCardless Bank Account Data](https://bankaccountdata.gocardless.com/)
2. Récupérez votre `secret_id` et `secret_key`
3. Ajoutez-les dans `.env.local`

### OpenAI (Catégorisation IA)
1. Créez une clé API sur [platform.openai.com](https://platform.openai.com/)
2. Ajoutez-la dans `.env.local`
3. Le modèle `gpt-4o-mini` est utilisé (très économique)

### Resend (Emails)
1. Créez un compte sur [resend.com](https://resend.com/)
2. Ajoutez votre clé API dans `.env.local`

## Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production |
| `npm run db:push` | Synchroniser le schéma Prisma |
| `npm run db:migrate` | Créer une migration |
| `npm run db:seed` | Seeder les catégories |
| `npm run db:studio` | Interface Prisma Studio |

## Architecture

```
src/
├── app/                    # Pages et API routes (App Router)
│   ├── (auth)/            # Pages login/register
│   ├── (dashboard)/       # Pages protégées avec sidebar
│   └── api/               # API Routes
├── components/            # Composants React
│   ├── dashboard/         # Graphiques et cartes du dashboard
│   ├── transactions/      # Table, filtres, import
│   ├── layout/            # Sidebar, Header
│   └── ui/                # Composants réutilisables
└── lib/                   # Logique métier
    ├── auth.ts            # Configuration NextAuth
    ├── prisma.ts          # Client Prisma singleton
    ├── gocardless.ts      # Client API GoCardless
    ├── categorizer.ts     # Moteur de catégorisation
    ├── csv-parser.ts      # Parsing CSV/OFX
    ├── recurring-detector.ts  # Détection d'abonnements
    └── notifications.ts   # Service de notifications
```
