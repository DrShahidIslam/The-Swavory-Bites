const CATEGORY_SLUGS = {
  recipes_en: new Set(["recipes"]),
  recipes_fr: new Set(["recettes"]),
  spreads_en: new Set(["spreads"]),
  spreads_fr: new Set(["pates-a-tartiner"]),
  trends: new Set(["trends"]),
  sweets: new Set(["sweets"]),
  foodNews: new Set(["food-news", "food-news-fr"]),
  theswavorybites: new Set(["the-swavory-bites-exclusive", "the-swavory-bites-exclusive-fr"])
};

const DRINK_KEYWORDS = [
  "mojito", "cocktail", "drink recipe", "beverage", "rum", "mocktail", "lemonade", "smoothie", "punch", "highball", "drink"
];

const BAKING_KEYWORDS = [
  "baking", "bread", "quick bread", "zucchini bread", "banana bread", "muffins", "loaf", "cake", "cookies", "biscuit", "pie", "dough"
];

const FRUIT_KEYWORDS = [
  "peach", "crisp", "cobbler", "crumble", "fruit desserts", "summer recipes", "berry", "strawberry", "apple", "peach crisp", "peach crumble", "stone fruit"
];

const SPREAD_KEYWORDS = [
  "hazelnut spread", "chocolate spread", "nutella", "homemade spread", "pate a tartiner"
];

const QUICK_KEYWORDS = [
  "30 minute", "quick", "easy", "5 minute", "fast", "no bake", "simple"
];

const DESSERT_KEYWORDS = [
  "dessert", "sweet", "ice cream", "chocolate", "pastry", "croissant", "candy", "treat"
];

// EXCLUDED FROM PINTEREST: The Swavory Bites brand posts, legal news, recalls
const EXCLUDED_PIN_KEYWORDS = [
  "the-swavory-bites", "The Swavory Bites", "cebon", "recall", "lawsuit", "ban", "banned", "regulation", "food safety", "nationwide recall"
];

export function classifyPost(post, boards = {}) {
  const tagsStr = (post.tags || []).join(" ").toLowerCase();
  const catsStr = (post.categories || []).map((c) => `${c.name} ${c.slug}`).join(" ").toLowerCase();
  const primaryHaystack = [post.title, post.excerpt, post.slug, tagsStr, catsStr].join(" ").toLowerCase();
  const categorySlugs = new Set((post.categories || []).map((c) => c.slug.toLowerCase()));

  const isFrench = post.language === "fr" || primaryHaystack.includes("-fr") || catsStr.includes("fr");
  const isFoodNews = [...CATEGORY_SLUGS.foodNews].some((slug) => categorySlugs.has(slug));
  const istheswavorybitesCategory = [...CATEGORY_SLUGS.theswavorybites].some((slug) => categorySlugs.has(slug));

  const isExcluded = istheswavorybitesCategory || isFoodNews || EXCLUDED_PIN_KEYWORDS.some((kw) => primaryHaystack.includes(kw));

  if (isExcluded) {
    return {
      shouldPin: false,
      contentType: "excluded",
      boardKey: "none",
      boardName: "None",
      language: isFrench ? "fr" : "en",
      pinWorthinessScore: -100
    };
  }

  let contentType = "recipe";
  let boardKey = "desserts_en";

  const isDrink = DRINK_KEYWORDS.some((kw) => primaryHaystack.includes(kw));
  const isBaking = BAKING_KEYWORDS.some((kw) => primaryHaystack.includes(kw));
  const isFruit = FRUIT_KEYWORDS.some((kw) => primaryHaystack.includes(kw));
  const isSpread = SPREAD_KEYWORDS.some((kw) => primaryHaystack.includes(kw));
  const isQuick = QUICK_KEYWORDS.some((kw) => primaryHaystack.includes(kw));
  const isTrend = [...CATEGORY_SLUGS.trends].some((s) => categorySlugs.has(s)) || primaryHaystack.includes("viral") || primaryHaystack.includes("trend");

  if (isFrench) {
    if (isSpread) {
      contentType = "spread";
      boardKey = "spreads_fr";
    } else if (isTrend) {
      contentType = "trend";
      boardKey = "trends_fr";
    } else {
      contentType = "recipe";
      boardKey = "recipes_fr";
    }
  } else {
    if (isDrink) {
      contentType = "drink";
      boardKey = "drinks_en";
    } else if (isSpread) {
      contentType = "spread";
      boardKey = "spreads_en";
    } else if (isFruit) {
      contentType = "fruit";
      boardKey = "fruit_en";
    } else if (isBaking) {
      contentType = "baking";
      boardKey = "baking_en";
    } else if (isQuick && !isBaking) {
      contentType = "quick";
      boardKey = "quick_en";
    } else if (isTrend) {
      contentType = "trend";
      boardKey = "trends_en";
    } else {
      contentType = "recipe";
      boardKey = "desserts_en";
    }
  }

  const resolvedBoardName = boards[boardKey] || boards[boardKey.toUpperCase()] || boards.desserts_en || "Easy Dessert Recipes";

  return {
    shouldPin: true,
    contentType,
    boardKey,
    boardName: resolvedBoardName,
    language: isFrench ? "fr" : "en",
    pinWorthinessScore: 5
  };
}
