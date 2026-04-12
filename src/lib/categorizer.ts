import prisma from "./prisma";
import OpenAI from "openai";

const MERCHANT_PATTERNS: Record<string, string[]> = {
  Courses: [
    "carrefour", "leclerc", "auchan", "lidl", "aldi", "intermarche",
    "monoprix", "franprix", "casino", "picard", "biocoop", "naturalia",
    "super u", "hyper u", "simply market", "match", "cora", "spar",
    "super market", "supermarche", "epicerie", "primeur",
  ],
  Restaurants: [
    "mcdonald", "burger king", "kfc", "subway", "domino", "pizza hut",
    "flunch", "quick", "five guys", "sushi", "restaurant", "brasserie",
    "bistro", "traiteur", "rest univ", "resto u", "crous",
    "campanile", "les gourmandise", "apollo",
  ],
  Livraison: [
    "uber eats", "uber *eats", "deliveroo", "just eat", "ubereats",
  ],
  "Café & Snacks": [
    "starbucks", "paul", "boulangerie", "patisserie", "cafe",
    "ivs france", "cup service", "distributeur boisson",
  ],
  Carburant: [
    "total", "shell", "bp", "esso", "elf", "station", "carburant",
    "essence", "gazole", "totalenergies",
  ],
  "Transports en commun": [
    "ratp", "sncf", "tgv", "navigo", "ter", "bus", "tramway", "metro",
    "ouigo", "thalys", "eurostar", "flixbus", "blablacar",
    "tcl", "relation usagers tcl", "keolis",
  ],
  Streaming: [
    "netflix", "spotify", "disney", "amazon prime", "apple music",
    "deezer", "canal+", "hbo", "youtube premium", "twitch",
    "google play apps",
  ],
  "Téléphone & Internet": [
    "orange", "sfr", "bouygues", "free mobile", "free telecom",
    "sosh", "red by sfr", "b&you",
  ],
  Loyer: ["loyer", "bail", "bailleur", "loyer edf"],
  Salaire: ["salaire", "paie", "virement employeur", "remuneration"],
  "Autres revenus": ["virement en votre faveur"],
  "Assurance habitation": ["assurance habitation", "maif", "macif", "matmut", "axa", "groupama"],
  "Assurance auto": ["assurance auto", "assurance vehicule"],
  Sport: ["salle de sport", "fitness", "gym", "basic fit", "neoness", "ask villeurbanne"],
  Pharmacie: ["pharmacie", "parapharmacie"],
  "Frais bancaires": [
    "frais bancaires", "commission intervention", "cotisation carte",
    "retrait au distributeur",
  ],
  Vêtements: [
    "zara", "h&m", "uniqlo", "decathlon", "kiabi", "primark", "celio",
    "jules", "la halle", "vinted",
  ],
  Électronique: [
    "fnac", "darty", "boulanger", "amazon", "cdiscount", "ldlc",
    "apple store",
  ],
  "Jeux & Divertissement": [
    "shotgun", "skinzp", "sumup",
  ],
};

function matchMerchantPattern(
  description: string,
  merchantName: string | null
): string | null {
  const text = `${description} ${merchantName || ""}`.toLowerCase();

  for (const [categoryName, patterns] of Object.entries(MERCHANT_PATTERNS)) {
    for (const pattern of patterns) {
      if (text.includes(pattern)) {
        return categoryName;
      }
    }
  }

  return null;
}

async function findCategoryByName(name: string): Promise<string | null> {
  const category = await prisma.category.findFirst({
    where: { name },
  });
  return category?.id || null;
}

async function categorizeWithAI(
  description: string,
  merchantName: string | null,
  amount: number
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith("your-")) {
    return null;
  }

  try {
    const categories = await prisma.category.findMany({
      where: { parentId: { not: null } },
      select: { name: true },
    });

    const categoryNames = categories.map((c) => c.name).join(", ");

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es un assistant qui catégorise les transactions bancaires. Réponds UNIQUEMENT avec le nom exact de la catégorie, sans explication. Catégories disponibles : ${categoryNames}`,
        },
        {
          role: "user",
          content: `Catégorise cette transaction :\nDescription : ${description}\nMarchand : ${merchantName || "N/A"}\nMontant : ${amount}€`,
        },
      ],
      max_tokens: 50,
      temperature: 0,
    });

    const categoryName = response.choices[0]?.message?.content?.trim();
    if (categoryName) {
      return findCategoryByName(categoryName);
    }
  } catch (e) {
    console.error("AI categorization error:", e);
  }

  return null;
}

export async function categorizeTransaction(
  userId: string,
  description: string,
  merchantName: string | null,
  amount: number
): Promise<string | null> {
  // Level 1: User-defined rules
  const userRules = await prisma.categoryRule.findMany({
    where: { userId },
    orderBy: { priority: "desc" },
  });

  const text = `${description} ${merchantName || ""}`.toLowerCase();

  for (const rule of userRules) {
    if (text.includes(rule.pattern.toLowerCase())) {
      return rule.categoryId;
    }
  }

  // Level 2: Built-in pattern matching
  const matchedCategory = matchMerchantPattern(description, merchantName);
  if (matchedCategory) {
    const categoryId = await findCategoryByName(matchedCategory);
    if (categoryId) return categoryId;
  }

  // Level 3: AI categorization (fallback)
  const aiCategoryId = await categorizeWithAI(description, merchantName, amount);
  if (aiCategoryId) return aiCategoryId;

  // Fallback: "Non catégorisé"
  const uncategorized = await prisma.category.findFirst({
    where: { name: "Non catégorisé" },
  });
  return uncategorized?.id || null;
}
