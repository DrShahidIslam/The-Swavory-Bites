# The Swavory Bites — Master Recipe Topics Catalog & Board Map

> **Deduplication Policy**: Each recipe topic is assigned a unique Post ID and Slug. 
> The automation engine pins 3 distinct visual variants per topic spaced across 7 days, and enforces 100% deduplication to prevent re-pinning the same recipe.

---

## 📌 Board Architecture & Topic Distribution

### Board 1: `Easy Dessert Recipes` (ID: `419397852738939911`)
| Post ID | Topic / Recipe Title | Target Keywords | Status |
|---|---|---|---|
| `4844` | Classic Homemade Peach Crisp Recipe | `easy peach crisp recipe`, `peach crisp oat topping` | ✅ Published (`419397784072947977`) |
| `4835` | The Art of Peach Desserts: Seasonal Classics | `peach dessert recipes`, `summer peach desserts` | ✅ Published (`419397784072948110`) |
| `4828` | The Ultimate Fresh Peach Cobbler Recipe | `fresh peach cobbler`, `easy cobbler recipe` | ⏳ Scheduled |
| `4825` | Homemade Fresh Peach Ice Cream Recipe | `peach ice cream recipe`, `no churn ice cream` | ⏳ Scheduled |
| `4804` | Classic Cherry Almond Clafoutis Recipe | `cherry clafoutis recipe`, `french cherry dessert` | ⏳ Scheduled |
| `4789` | Classic Raspberry Frangipane Tart | `raspberry frangipane tart`, `almond tart recipe` | ⏳ Scheduled |

---

### Board 2: `Baking Recipes — Breads & Cakes` (ID: `419397852738939912`)
| Post ID | Topic / Recipe Title | Target Keywords | Status |
|---|---|---|---|
| `4841` | Classic Moist Zucchini Bread Recipe | `moist zucchini bread recipe`, `easy quick bread` | ✅ Published (`419397784072948033`) |
| `4819` | Understanding the Lobster Cake: A Culinary Guide | `lobster cake recipe`, `baking guides` | ⏳ Scheduled |
| `4771` | The Rise of Zucchini Cake: A Modern Essential | `zucchini cake recipe`, `vegetable bakes` | ⏳ Scheduled |
| `4052` | Homemade Chocolate Rolls: Express Dough | `chocolate rolls recipe`, `express dough recipe` | ✅ Published (`419397784072948206`) |
| `2959` | Artisan Croissant Recipe: Master French Pastry | `artisan croissant recipe`, `french pastry baking` | ⏳ Scheduled |

---

### Board 3: `Drink Recipes — Cocktails & Mocktails` (ID: `419397852738939913`)
| Post ID | Topic / Recipe Title | Target Keywords | Status |
|---|---|---|---|
| `4870` | The Classic Mojito: A Refreshing Masterclass | `classic mojito recipe`, `easy summer cocktail` | ✅ Published (`419397784072948035`) |
| `4801` | Refreshing Piña Colada Recipe: Tropical Classic | `pina colada recipe`, `rum cocktails` | ⏳ Scheduled |
| `4740` | Watermelon Mint Sparkling Mocktail | `watermelon mocktail`, `non alcoholic summer drinks` | ⏳ Scheduled |

---

### Board 4: `Fruit Desserts & Summer Recipes` (ID: `419397852738939915`)
| Post ID | Topic / Recipe Title | Target Keywords | Status |
|---|---|---|---|
| `4832` | Refreshing Peach Salsa Recipe: Summer Favorite | `fresh peach salsa`, `fruit salsa recipe` | ⏳ Scheduled |
| `4822` | Simple Roasted Honey and Thyme Peaches | `roasted peaches honey`, `baked peach dessert` | ⏳ Scheduled |
| `4780` | The Perfect Peach Crumble Recipe | `peach crumble recipe`, `golden oat crumble` | ⏳ Scheduled |
| `4786` | Traditional Homemade Raspberry Jam Recipe | `homemade raspberry jam`, `small batch jam` | ⏳ Scheduled |

---

### Board 5: `Quick & Easy Recipes` (ID: `419397852738939917`)
| Post ID | Topic / Recipe Title | Target Keywords | Status |
|---|---|---|---|
| `4838` | How to Make Vibrant Basil Salt at Home | `basil salt recipe`, `seasoning ideas` | ✅ Published (`419397784072948034`) |
| `4816` | Homemade Bread and Butter Pickle Recipe | `bread and butter pickles`, `quick pickle recipe` | ⏳ Scheduled |
| `4813` | Refreshing Watermelon Feta Salad with Mint | `watermelon feta salad`, `summer side dishes` | ⏳ Scheduled |
| `4810` | Classic Genovese Pesto: Definitive Basil Recipe | `classic basil pesto`, `homemade pesto recipe` | ⏳ Scheduled |
| `4795` | Simple Zucchini Fritters: Quick Weeknight Staple | `zucchini fritters recipe`, `easy 30 min meals` | ⏳ Scheduled |
| `4768` | Classic Cucumber Sandwiches: Refined Tea Time | `cucumber sandwich recipe`, `tea sandwiches` | ⏳ Scheduled |

---

## 🚫 Filtered / Excluded Posts (Zero Pins Created)

These posts match brand/news exclusion filters and are strictly blocked from Pinterest pinning:

- `4765`: *El Mordjene: The Algerian Spread Taking France by Storm* ❌ (Excluded Brand)
- `4762`: *Banned Algerian Hazelnut Spread: What You Need to Know* ❌ (Excluded News)
- `2974`: *North African Sweets: Trending News* ❌ (Excluded News)

---

## 🔒 Automated Deduplication Mechanism
1. **Single Entry Guard**: Before queueing any post, the engine checks `state.hasPost(postId)` AND `state.hasPostSlug(slug)`.
2. **State Synchronization**: `data/state.json` is committed back to GitHub on every 4-hour run (`auto: update pinterest queue state`).
3. **Queue Lock**: Once 3 variants for a post are queued or published, the post is locked in state and will never be queued again.
