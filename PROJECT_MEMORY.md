# Project Memory - FinanceFlow

## Deployment
- Script principal: `bash ./scripts/deploy-smart.sh`
- Forcer Prisma: `bash ./scripts/deploy-smart.sh --force-prisma`
- Mode Prisma sans migrations: `bash ./scripts/deploy-smart.sh --force-prisma --prisma-mode=push`
- Mode Prisma avec migrations: `bash ./scripts/deploy-smart.sh --force-prisma --prisma-mode=deploy`

## Prisma strategy
- En production actuelle, la base n'a pas de baseline migrations Prisma.
- Utiliser `--prisma-mode=push` tant que `prisma/migrations` n'est pas en place.
- Si un historique de migrations est ajouté, basculer en `deploy`.

## MCP / API / AI sync reminders
- Toute nouvelle action IA doit être exposée via endpoint API clair.
- Toute action “opérable” par IA devra avoir une route MCP interne dédiée (v2).
- Maintenir la compatibilité entre:
  - `src/app/api/**`
  - endpoints IA (`/api/ai/**`)
  - règles marchands (`/api/recurring/rules`)

## Merchant data policy
- `merchantPattern` (normalisé) est la clé stable.
- Alias, image et notes vivent dans `merchant_rules`.
- Afficher `displayName` partout où un marchand est visible.

## UI consistency
- Dropdown de catégorie identique entre transactions et recurring.
- Catégories: toujours proposer vue tableau + vue arborescence.
- Maintenir `/guide` à jour à chaque nouvelle fonctionnalité (concept, usage, FAQ, exemples).
- Maintenir la recherche rapide `Ctrl+K` avec:
  - sections de la sidebar,
  - marchands (alias/displayName inclus),
  - navigation directe.
