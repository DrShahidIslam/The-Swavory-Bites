export const PINTEREST_HIGH_SEARCH_TOPICS = [
  {
    category: "Easy Dinners",
    topic: "30-Minute One-Pan Honey Garlic Chicken",
    searchKeywords: ["easy 30 minute dinner", "one pan chicken recipe", "honey garlic chicken", "quick weeknight meals"],
    suggestedSlug: "30-minute-honey-garlic-chicken-recipe",
    pinHook: "The 30-Minute Dinner Everyone Is Saving 🍯",
    targetBoard: "Quick & Easy Recipes"
  },
  {
    category: "High-Protein Breakfast",
    topic: "High-Protein Fluffy Cottage Cheese Pancakes",
    searchKeywords: ["high protein breakfast", "cottage cheese pancakes", "healthy breakfast ideas", "easy meal prep"],
    suggestedSlug: "high-protein-cottage-cheese-pancakes",
    pinHook: "Stop Buying Protein Powder. Make THIS Instead! 🥞",
    targetBoard: "Baking Recipes — Breads & Cakes"
  },
  {
    category: "No-Bake Desserts",
    topic: "5-Minute No-Bake Strawberry Cheesecake Cups",
    searchKeywords: ["no bake dessert", "strawberry cheesecake", "easy dessert in a jar", "5 minute desserts"],
    suggestedSlug: "no-bake-strawberry-cheesecake-cups",
    pinHook: "5-Minute No-Bake Strawberry Cheesecake 🍓",
    targetBoard: "Easy Dessert Recipes"
  },
  {
    category: "Refreshing Drinks",
    topic: "Classic Iced Vanilla Oat Milk Shaken Espresso",
    searchKeywords: ["iced coffee recipe", "starbucks copycat", "vanilla oat milk latte", "summer drink recipes"],
    suggestedSlug: "iced-vanilla-oat-milk-shaken-espresso",
    pinHook: "Better Than Starbucks! Save $7 Every Morning ☕",
    targetBoard: "Drink Recipes — Cocktails & Mocktails"
  },
  {
    category: "Viral Baking",
    topic: "Copycat Crumbl Milk Chocolate Chip Cookies",
    searchKeywords: ["copycat crumbl cookie", "bakery style chocolate chip cookies", "thick chewy cookie recipe"],
    suggestedSlug: "copycat-crumbl-chocolate-chip-cookies",
    pinHook: "The Secret to Bakery-Thick Cookies Revealed 🍪",
    targetBoard: "Baking Recipes — Breads & Cakes"
  },
  {
    category: "Fruit Desserts",
    topic: "Golden Homemade Peach Crisp with Oat Topping",
    searchKeywords: ["peach crisp recipe", "fruit desserts", "summer fruit recipes", "peach cobbler"],
    suggestedSlug: "golden-homemade-peach-crisp-recipe",
    pinHook: "Summer in a Bowl 🍑 Golden Peach Crisp",
    targetBoard: "Fruit Desserts & Summer Recipes"
  }
];

export function printTrendIdeas() {
  console.log("\n==========================================================================");
  console.log("🔥 HIGH-SEARCH PINTEREST TREND RECIPE TOPICS FOR WORDPRESS & PINTEREST");
  console.log("==========================================================================\n");

  PINTEREST_HIGH_SEARCH_TOPICS.forEach((item, index) => {
    console.log(`${index + 1}. [${item.category}] ${item.topic}`);
    console.log(`   📌 Pin Hook: "${item.pinHook}"`);
    console.log(`   🎯 Keywords: ${item.searchKeywords.join(", ")}`);
    console.log(`   🔗 Suggested WP Slug: /${item.suggestedSlug}/`);
    console.log(`   📋 Target Pinterest Board: ${item.targetBoard}\n`);
  });

  console.log("==========================================================================");
}
