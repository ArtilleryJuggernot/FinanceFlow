export const ACTION_DEFINITIONS = [
  {
    key: "dashboard.summary",
    description: "Retourne un résumé des dépenses et revenus du mois courant",
  },
  {
    key: "transactions.latest",
    description: "Retourne les 10 dernières transactions",
  },
  {
    key: "merchant.top",
    description: "Retourne les 5 marchands les plus dépensiers",
  },
] as const;
