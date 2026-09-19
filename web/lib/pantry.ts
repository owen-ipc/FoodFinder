import fs from "node:fs";
import path from "node:path";

export type Item = {
  name: string;
  category: string;
  unit: string;
  price: number;
  source: string;
};

export type Match = {
  ingredient: string;
  item: Item | null;
  score: number;
};

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

let cache: Item[] | null = null;

export function loadPantry(): Item[] {
  if (cache) return cache;

  const file = path.join(
    process.cwd(),
    "data",
    "target_grocery_prices_verified.csv"
  );
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  const [header, ...body] = rows;
  const idx = (n: string) => header.indexOf(n);
  const iN = idx("item_name");
  const iC = idx("category");
  const iU = idx("unit");
  const iP = idx("price");
  const iS = idx("source");

  cache = body
    .filter((r) => r[iN] && r[iP])
    .map((r) => ({
      name: r[iN].trim(),
      category: (r[iC] ?? "").trim(),
      unit: (r[iU] ?? "").trim(),
      price: Number.parseFloat(r[iP]),
      source: (r[iS] ?? "").trim(),
    }))
    .filter((i) => Number.isFinite(i.price));

  return cache;
}

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

// Words that carry no identifying information for an ingredient.
const STOP = new Set([
  "a","an","the","of","and","or","with","without","fresh","freshly","large",
  "small","medium","whole","chopped","minced","peeled",
  "grated","crushed","cooked","raw","dried",
  "canned","jar","can","package","pkg","optional","taste","to","for",
  "your","favorite","any","plus","more","extra","good","gather","pantry",
  "market","brand","style","organic","natural","all","pure","classic",
  "original","lightly","unsalted","salted","low","reduced","free","oz",
  "lb","lbs","ct","fl","count","ounce","ounces","pound","pounds","cup",
  "cups","tbsp","tsp","tablespoon","teaspoon","clove","cloves","bunch",
  "sprig","sprigs","pinch","dash","inch","piece","pieces","thinly","finely",
  "each","per","bag","size","varies","value","pack","bottle","box","bunch",
  "spice","world","favorite","day","simply","balance","essentials",
]);

// Maps what a recipe calls something to words that appear in Target names.
const SYNONYMS: Record<string, string[]> = {
  scallion: ["green", "onion"],
  scallions: ["green", "onion"],
  "green onions": ["green", "onion"],
  cilantro: ["cilantro"],
  coriander: ["cilantro"],
  aubergine: ["eggplant"],
  courgette: ["zucchini"],
  capsicum: ["pepper"],
  garbanzo: ["chickpea"],
  "garbanzo beans": ["chickpeas"],
  passata: ["tomato", "sauce"],
  "tomato puree": ["tomato", "sauce"],
  "chicken stock": ["chicken", "broth"],
  "beef stock": ["beef", "broth"],
  "vegetable stock": ["vegetable", "broth"],
  "heavy cream": ["heavy", "whipping", "cream"],
  "double cream": ["heavy", "whipping", "cream"],
  "confectioners sugar": ["powdered", "sugar"],
  "icing sugar": ["powdered", "sugar"],
  "caster sugar": ["granulated", "sugar"],
  "bicarbonate of soda": ["baking", "soda"],
  "corn flour": ["corn", "starch"],
  cornstarch: ["corn", "starch"],
  "corn starch": ["corn", "starch"],
  sugar: ["granulated", "sugar"],
  "white sugar": ["granulated", "sugar"],
  "granulated sugar": ["granulated", "sugar"],
  "diced tomatoes": ["diced", "tomato"],
  "canned tomatoes": ["diced", "tomato"],
  "crushed tomatoes": ["crushed", "tomato"],
  "all purpose flour": ["purpose", "flour"],
  "bacon": ["bacon"],
  cornflour: ["corn", "starch"],
  "spring onion": ["green", "onion"],
  "bell pepper": ["bell", "pepper"],
  "red pepper flakes": ["crushed", "red", "pepper"],
  "chili flakes": ["crushed", "red", "pepper"],
  "soy sauce": ["soy", "sauce"],
  "light soy sauce": ["soy", "sauce"],
  "dark soy sauce": ["soy", "sauce"],
  "olive oil": ["olive", "oil"],
  "vegetable oil": ["vegetable", "oil"],
  "sesame oil": ["sesame", "oil"],
  mozzarella: ["mozzarella"],
  parmesan: ["parmesan"],
  "parmigiano reggiano": ["parmesan"],
  "pecorino": ["parmesan"],
  "greek yogurt": ["greek", "yogurt"],
  "plain yogurt": ["yogurt"],
  "spaghetti": ["spaghetti"],
  "penne": ["penne"],
  "linguine": ["linguine"],
  "egg noodles": ["egg", "noodles"],
  "rice noodles": ["rice", "noodles"],
  "tortillas": ["tortillas"],
  "corn tortillas": ["corn", "tortillas"],
  "flour tortillas": ["flour", "tortillas"],
  "chicken thighs": ["chicken", "thighs"],
  "chicken breast": ["chicken", "breast"],
  "chicken breasts": ["chicken", "breast"],
  "ground beef": ["ground", "beef"],
  "ground turkey": ["ground", "turkey"],
  "eggs": ["eggs"],
  "egg": ["eggs"],
  "butter": ["butter"],
  "milk": ["milk"],
  "salt": ["salt"],
  "black pepper": ["black", "pepper"],
  "pepper": ["black", "pepper"],
  "garlic": ["garlic"],
  "onion": ["onion"],
  "onions": ["onion"],
  "flour": ["flour"],
  "rice": ["rice"],
  "water": [],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Crude singularisation so "onions" matches "Onion" and vice versa.
function stem(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("oes")) return w.slice(0, -2);
  if (/(s|x|ch|sh)es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith("ss")) return w;
  if (w.endsWith("s")) return w.slice(0, -1);
  return w;
}

function tokens(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter((w) => w.length > 1 && !/^\d/.test(w))
    .map(stem)
    .filter((w) => !STOP.has(w) && w.length > 1);
}

/**
 * Words that change WHAT a product is, not just how it is described.
 * Onion vs onion powder. Lime vs lime crema. Milk vs almond milk.
 * These are only penalised when the recipe did NOT ask for them, so
 * "almond milk" still matches Almond Milk while "milk" does not.
 */
const TYPE_SHIFT = new Set([
  // Product "head nouns" -- if the recipe didn't ask for these, the item
  // is a different thing entirely. Peanut vs peanut OIL, onion vs onion POWDER.
  "powder","oil","sauce","paste","soup","mix","seasoning","juice","syrup",
  "jam","jelly","extract","vinegar","broth","stock","flour","dressing",
  "crema","spread","dip","chip","cracker","cookie","bar","kit","meal",
  "sausage","cutlet","nugget","patty","burger","jerky","pie","cake",
  "sandwich","wrap","bowl","pizza","dumpling","roll","pudding","frosting",
  "drink","soda","tea","coffee","candy","bread","crumb","stuffing",
  // Plant milks and processed forms, penalised only when not requested
  "almond","soy","oat","coconut","cashew","evaporated","condensed",
  "instant","dehydrated","concentrate","puree","smoked","breaded",
  "spray","nonstick","spread","stick","cube","flake","crunch","crisp",
  "mustard","canadian","tortilla","bun","cracker","waffle","pancake",
  "ham","wing","bbq","graham","sandwich","deli","slice",
]);

/**
 * Where a given ingredient is expected to live. A match inside the
 * expected aisle outranks any match outside it, which is what stops
 * "onion" resolving to onion powder in Seasonings.
 */
const CATEGORY_HINTS: Array<[string[], string[]]> = [
  [["onion","garlic","tomato","lettuce","lime","lemon","potato","carrot",
    "celery","cucumber","avocado","spinach","kale","broccoli",
    "cauliflower","mushroom","zucchini","cabbage","apple","banana","bell",
    "strawberry","blueberry","grape","orange","cilantro","parsley","basil",
    "ginger","scallion","jalapeno","corn","asparagus","squash"],
   ["Produce"]],
  [["milk","egg","cream","yogurt","buttermilk"], ["Dairy & Eggs"]],
  [["butter"], ["Butter","Dairy & Eggs"]],
  [["cheddar","mozzarella","parmesan","cheese","ricotta","feta","provolone",
    "swiss","gouda","monterey","asiago"], ["Cheese","Dairy & Eggs"]],
  [["chicken","beef","pork","turkey","shrimp","salmon","steak","bacon",
    "sausage","ham","lamb","tilapia","cod"], ["Meat & Seafood","Deli Meat"]],
  [["rice","quinoa","oat","barley","couscous"], ["Rice & Grains"]],
  [["spaghetti","penne","macaroni","linguine","lasagna","noodle","pasta",
    "rigatoni","fettuccine","ziti","rotini"], ["Pasta","Ramen & Noodles"]],
  [["peanut","walnut","pecan","almond","cashew","pistachio"], ["Nuts & Seeds"]],
  [["bread","bun","bagel","tortilla","muffin","roll"], ["Bakery & Bread"]],
  [["honey","molasses","nutella"], ["Pantry"]],
  [["oil","vinegar"], ["Oils & Vinegar"]],
  [["sauce"], ["Sauces"]],
  [["salsa"], ["Sauces"]],
  [["mayonnaise","mayo","ketchup","mustard","relish","hotsauce"], ["Condiments"]],
  [["cinnamon","paprika","cumin","oregano","thyme","turmeric","nutmeg",
    "chili","curry","cayenne","salt","peppercorn","bay","clove","seasoning"],
   ["Seasonings & Spices"]],
  [["sugar","yeast","cocoa","vanilla","starch","shortening","frosting",
    "flour","granulated","powder","soda"],
   ["Baking"]],
];

function hintedCategories(want: string[]): string[] | null {
  for (const [words, cats] of CATEGORY_HINTS) {
    for (const w of want) if (words.includes(w)) return cats;
  }
  return null;
}

function stripQuantity(s: string): string {
  return s
    .replace(/^[\d\s./\u2044\u00bd\u2153\u00bc\u00be\u2154\u215b-]+/, "")
    .replace(
      /^\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|cloves?|cans?|jars?|packages?|pkgs?|sprigs?|bunch(es)?|slices?|heads?|loaves|loaf|sticks?|pinch(es)?|quarts?|pints?|gallons?|grams?|kg|ml)\b\s*/i,
      " "
    )
    .replace(/\bof\b/i, " ")
    .trim();
}

function expand(ingredient: string): string[] {
  const clean = normalize(stripQuantity(ingredient));
  const keys = Object.keys(SYNONYMS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const exact = clean === k;
    // Word-boundary containment only, so "rice" does not swallow
    // "rice vinegar" and silently drop the vinegar.
    const partial =
      !exact && new RegExp(`(^|\\s)${k}($|\\s)`).test(clean);
    if (!exact && !partial) continue;

    const mapped = SYNONYMS[k];
    if (mapped.length === 0) return [];

    if (exact) return [...new Set(tokens(mapped.join(" ")))];

    // Partial: keep the rest of the phrase alongside the mapping.
    const rest = clean.replace(new RegExp(`(^|\\s)${k}($|\\s)`), " ");
    // Leftover modifiers first, mapped head words last: the fallback
    // trims from the front, and English puts the head noun at the end.
    return [...new Set(tokens([rest, ...mapped].join(" ")))];
  }
  return tokens(clean);
}

/**
 * How much to trust each price. Rows tagged range_low only captured the
 * floor of a multi-size listing, so they are not real SKU prices and
 * should lose to any exactly-priced alternative.
 */
const SOURCE_PENALTY: Record<string, number> = {
  target_live: 0,
  user_screenshot: 0,
  manual_instore: 0,
  target_live_article: 50,
  target_delivery_app: 200,
  target_search_snippet: 200,
  target_live_range_low: 5000,
};

function score(want: string[], item: Item, hints: string[] | null): number {
  if (want.length === 0) return 0;

  const itemTokens = tokens(item.name);
  const have = new Set(itemTokens);

  // Every word the recipe asked for must be present.
  for (const w of want) if (!have.has(w)) return 0;

  // Only penalise words that make it a DIFFERENT product. Ordinary extra
  // words (brand, size, "finely shredded") are left alone so that price,
  // not name tidiness, decides the winner.
  let penalty = 0;
  for (const t of itemTokens) {
    if (want.includes(t)) continue;
    if (TYPE_SHIFT.has(t)) penalty += 400;
  }

  // Right aisle beats any amount of name tidiness.
  const aisle = hints && hints.includes(item.category) ? 100000 : 0;
  penalty += SOURCE_PENALTY[item.source] ?? 100;

  return 100000 + aisle - penalty;
}

export function matchIngredient(ingredient: string, pantry: Item[]): Match {
  const want = expand(ingredient);

  // Pantry staples we assume you already own (water, etc).
  if (want.length === 0) {
    return { ingredient, item: null, score: 0 };
  }

  // Try the full phrase, then progressively drop leading modifiers so
  // "red bell pepper" can fall back to "bell pepper" and then "pepper".
  for (let start = 0; start < want.length; start++) {
    const attempt = want.slice(start);
    const hints = hintedCategories(attempt);
    let best: Item | null = null;
    let bestScore = 0;

    for (const item of pantry) {
      const s = score(attempt, item, hints);
      if (s === 0) continue;
      if (
        s > bestScore ||
        (s === bestScore && best !== null && item.price < best.price)
      ) {
        best = item;
        bestScore = s;
      }
    }

    if (best) return { ingredient, item: best, score: bestScore };
  }

  return { ingredient, item: null, score: 0 };
}

export function buildShoppingList(
  ingredients: string[],
  pantry: Item[]
): { matches: Match[]; total: number; missing: string[] } {
  const matches = ingredients.map((i) => matchIngredient(i, pantry));
  const total = matches.reduce((sum, m) => sum + (m.item?.price ?? 0), 0);
  const missing = matches.filter((m) => !m.item).map((m) => m.ingredient);
  return { matches, total, missing };
}
