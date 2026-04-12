import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  {
    name: "Alimentation",
    icon: "utensils",
    color: "#ef4444",
    type: "expense",
    children: [
      { name: "Courses", icon: "shopping-cart", color: "#f87171" },
      { name: "Restaurants", icon: "chef-hat", color: "#fb923c" },
      { name: "Livraison", icon: "truck", color: "#fbbf24" },
      { name: "Café & Snacks", icon: "coffee", color: "#a16207" },
    ],
  },
  {
    name: "Logement",
    icon: "home",
    color: "#3b82f6",
    type: "expense",
    children: [
      { name: "Loyer", icon: "key", color: "#60a5fa" },
      { name: "Charges", icon: "zap", color: "#38bdf8" },
      { name: "Assurance habitation", icon: "shield", color: "#818cf8" },
      { name: "Travaux & Entretien", icon: "wrench", color: "#a78bfa" },
    ],
  },
  {
    name: "Transport",
    icon: "car",
    color: "#22c55e",
    type: "expense",
    children: [
      { name: "Carburant", icon: "fuel", color: "#4ade80" },
      { name: "Transports en commun", icon: "train-front", color: "#34d399" },
      { name: "Assurance auto", icon: "shield-check", color: "#2dd4bf" },
      { name: "Entretien véhicule", icon: "settings", color: "#a3e635" },
      { name: "Parking & Péages", icon: "circle-parking", color: "#84cc16" },
    ],
  },
  {
    name: "Loisirs",
    icon: "gamepad-2",
    color: "#a855f7",
    type: "expense",
    children: [
      { name: "Sorties", icon: "ticket", color: "#c084fc" },
      { name: "Sport", icon: "dumbbell", color: "#e879f9" },
      { name: "Voyages", icon: "plane", color: "#f472b6" },
      { name: "Culture", icon: "book-open", color: "#fb7185" },
      { name: "Jeux & Divertissement", icon: "gamepad", color: "#d946ef" },
    ],
  },
  {
    name: "Santé",
    icon: "heart-pulse",
    color: "#ec4899",
    type: "expense",
    children: [
      { name: "Médecin", icon: "stethoscope", color: "#f472b6" },
      { name: "Pharmacie", icon: "pill", color: "#fb923c" },
      { name: "Mutuelle", icon: "shield-plus", color: "#e879f9" },
      { name: "Optique & Dentaire", icon: "eye", color: "#c084fc" },
    ],
  },
  {
    name: "Shopping",
    icon: "shopping-bag",
    color: "#f97316",
    type: "expense",
    children: [
      { name: "Vêtements", icon: "shirt", color: "#fb923c" },
      { name: "Électronique", icon: "smartphone", color: "#fbbf24" },
      { name: "Maison & Déco", icon: "lamp", color: "#f59e0b" },
      { name: "Cadeaux", icon: "gift", color: "#ef4444" },
    ],
  },
  {
    name: "Abonnements",
    icon: "repeat",
    color: "#06b6d4",
    type: "expense",
    children: [
      { name: "Streaming", icon: "tv", color: "#22d3ee" },
      { name: "Téléphone & Internet", icon: "wifi", color: "#38bdf8" },
      { name: "Logiciels", icon: "app-window", color: "#818cf8" },
      { name: "Presse", icon: "newspaper", color: "#67e8f9" },
    ],
  },
  {
    name: "Éducation",
    icon: "graduation-cap",
    color: "#8b5cf6",
    type: "expense",
    children: [
      { name: "Formations", icon: "book", color: "#a78bfa" },
      { name: "Livres", icon: "library", color: "#c4b5fd" },
      { name: "Frais de scolarité", icon: "school", color: "#7c3aed" },
    ],
  },
  {
    name: "Impôts & Taxes",
    icon: "landmark",
    color: "#64748b",
    type: "expense",
    children: [
      { name: "Impôt sur le revenu", icon: "file-text", color: "#94a3b8" },
      { name: "Taxe foncière", icon: "building", color: "#cbd5e1" },
      { name: "Taxes diverses", icon: "receipt", color: "#475569" },
    ],
  },
  {
    name: "Revenus",
    icon: "wallet",
    color: "#10b981",
    type: "income",
    children: [
      { name: "Salaire", icon: "banknote", color: "#34d399" },
      { name: "Freelance", icon: "laptop", color: "#6ee7b7" },
      { name: "Investissements", icon: "trending-up", color: "#a7f3d0" },
      { name: "Aides & Allocations", icon: "hand-heart", color: "#2dd4bf" },
      { name: "Remboursements", icon: "undo", color: "#5eead4" },
      { name: "Autres revenus", icon: "plus-circle", color: "#99f6e4" },
    ],
  },
  {
    name: "Épargne & Investissement",
    icon: "piggy-bank",
    color: "#14b8a6",
    type: "expense",
    children: [
      { name: "Livret A / LDD", icon: "landmark", color: "#2dd4bf" },
      { name: "Assurance vie", icon: "shield", color: "#5eead4" },
      { name: "PEA / Bourse", icon: "bar-chart-3", color: "#99f6e4" },
      { name: "Crypto", icon: "bitcoin", color: "#fbbf24" },
    ],
  },
  {
    name: "Divers",
    icon: "layers",
    color: "#78716c",
    type: "expense",
    children: [
      { name: "Frais bancaires", icon: "credit-card", color: "#a8a29e" },
      { name: "Dons", icon: "heart", color: "#f472b6" },
      { name: "Amendes", icon: "alert-triangle", color: "#ef4444" },
      { name: "Non catégorisé", icon: "help-circle", color: "#d6d3d1" },
    ],
  },
];

async function main() {
  console.log("Seeding categories...");

  for (const cat of categories) {
    const parent = await prisma.category.create({
      data: {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type,
      },
    });

    if (cat.children) {
      for (const child of cat.children) {
        await prisma.category.create({
          data: {
            name: child.name,
            icon: child.icon,
            color: child.color,
            type: cat.type,
            parentId: parent.id,
          },
        });
      }
    }
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
