import { NextResponse } from "next/server";
import { loadPantry, buildCombinedShoppingList } from "@/lib/pantry";

type Recipe = {
  title: string;
  servings: number;
  time: string;
  ingredients: string[];
  steps: string[];
  photoQuery?: string;
};

const SYSTEM = `You plan cheap meals that a college student can cook in a dorm or small apartment kitchen.

Always return this exact JSON shape, no prose and no markdown fences:
{
  "recipes": [
    { "title": string, "servings": number, "time": string, "ingredients": string[], "steps": string[], "photoQuery": string }
  ]
}

How many recipes to put in the array:
- If the request describes ONE dish or craving, return exactly one recipe.
- If the request asks for several separate items ("3 breakfast ideas", "2 dinner options", "5 snacks"), return that many DISTINCT recipes -- each a complete, different dish with its own ingredients and steps, not one recipe that mashes several ideas together.
- Never return an empty array, and never leave "ingredients" or "steps" empty for any recipe in it.

Rules for each recipe's "servings":
- Set it to how many people the listed ingredient quantities actually feed. Don't default to 1 out of habit -- if the quantities you listed are enough for two or more people, say so honestly.
- Only use 1 when the dish is genuinely a single portion by nature (e.g. a single sandwich, a personal smoothie).

Rules for each recipe's "ingredients":
- Write each one as a quantity plus a plain supermarket name: "1 lb ground beef", "2 cups white rice", "3 cloves garlic".
- Use names you would see on a US grocery shelf. Say "green onion" not "scallion", "cilantro" not "coriander".
- Keep it to 10 ingredients or fewer per recipe.
- Do not list water, or equipment.
- Prefer cheap staples. This is for someone on a tight budget.

Rules for each recipe's "steps": 4 to 8 short imperative sentences.

Rules for each recipe's "photoQuery":
- This is separate from "title" -- "title" can be creative ("Fluffy Scrambled Eggs on Toast"), but "photoQuery" must be the plainest, most common English name for the dish, 2-4 words, the way you'd search for a photo of it ("scrambled eggs", "banana pancakes", "chicken fried rice", "grilled cheese sandwich").
- No adjectives like "fluffy", "cheesy", "quick", "easy" -- just the dish itself.`;

// Looks up a photo for a dish name against Wikipedia's free, keyless
// summary API. Tries the exact term first; if that page doesn't exist,
// falls back to Wikipedia's own search to find the closest real article
// and retries with that title. Returns null (never throws) if nothing
// usable turns up, so a missing photo never breaks the recipe itself.
async function findDishPhoto(
  query: string
): Promise<{ url: string; pageTitle: string } | null> {
  const headers = {
    "user-agent": "FoodFinder/1.0 (SteelHacks XIII student project)",
  };

  async function trySummary(title: string) {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        title.trim().replace(/\s+/g, "_")
      )}?redirect=true`,
      { headers }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.type === "disambiguation") return null;
    const src = data?.thumbnail?.source;
    return src ? { url: src as string, pageTitle: data.title as string } : null;
  }

  try {
    const direct = await trySummary(query);
    if (direct) return direct;

    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&limit=1&search=${encodeURIComponent(
        query
      )}`,
      { headers }
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const bestTitle = searchData?.[1]?.[0];
    if (!bestTitle) return null;

    return await trySummary(bestTitle);
  } catch (err) {
    console.error("Wikipedia photo lookup failed", query, err);
    return null;
  }
}

export async function POST(req: Request) {
  let craving = "";
  try {
    const body = await req.json();
    craving = String(body?.craving ?? "").slice(0, 200);
  } catch {
    return NextResponse.json({ error: "Bad request body." }, { status: 400 });
  }

  if (!craving.trim()) {
    return NextResponse.json(
      { error: "Tell us what you feel like eating." },
      { status: 400 }
    );
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  let recipes: Recipe[];
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 2400,
        system: SYSTEM,
        messages: [{ role: "user", content: craving }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Anthropic error", res.status, detail);
      return NextResponse.json(
        { error: "Recipe service is unavailable right now." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text = (data.content ?? [])
      .map((b: { type: string; text?: string }) =>
        b.type === "text" ? b.text ?? "" : ""
      )
      .join("")
      .trim();

    const clean = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(clean);

    // Defensive unwrap: accept a few shapes the model might still return
    // despite the system prompt, instead of failing outright.
    let list: unknown = parsed?.recipes;
    if (!Array.isArray(list)) {
      if (Array.isArray(parsed)) list = parsed;
      else if (Array.isArray(parsed?.items)) list = parsed.items;
      else if (Array.isArray(parsed?.meals)) list = parsed.meals;
      else if (parsed && Array.isArray(parsed.ingredients)) list = [parsed];
      else list = [];
    }

    recipes = (list as Recipe[]).filter(
      (r) => r && Array.isArray(r.ingredients) && r.ingredients.length > 0
    );
  } catch (err) {
    console.error("Recipe parse failed", err);
    return NextResponse.json(
      { error: "Could not read the recipe. Try rephrasing." },
      { status: 502 }
    );
  }

  if (recipes.length === 0) {
    return NextResponse.json(
      { error: "That recipe came back empty. Try again." },
      { status: 502 }
    );
  }

  const pantry = loadPantry();

  // One combined grocery list for everything the recipes need together --
  // if two recipes both call for milk, that's one carton, not two.
  const allIngredients = recipes.flatMap((r) => r.ingredients);
  const { matches, total, missing, savings } = buildCombinedShoppingList(
    allIngredients,
    pantry
  );

  // "Per serving" only means something when there's exactly one dish --
  // averaging cost-per-serving across several unrelated recipes would be
  // a made-up number, so it's left out (null) whenever there's more than one.
  const perServing =
    recipes.length === 1 && recipes[0].servings > 0
      ? total / recipes[0].servings
      : null;

  // Photo lookups run in parallel across all recipes -- a miss on one
  // never blocks or breaks the others, and never blocks the recipe text.
  const photos = await Promise.all(
    recipes.map((r) => findDishPhoto(r.photoQuery || r.title))
  );

  return NextResponse.json({
    recipes: recipes.map((recipe, i) => ({
      title: recipe.title ?? craving,
      servings: recipe.servings ?? 2,
      time: recipe.time ?? "",
      steps: Array.isArray(recipe.steps) ? recipe.steps : [],
      photoUrl: photos[i]?.url ?? null,
    })),
    shoppingList: {
      list: matches.map((m) => ({
        ingredient: m.ingredient,
        product: m.item?.name ?? null,
        price: m.item?.price ?? null,
        unit: m.item?.unit ?? null,
        category: m.item?.category ?? null,
        saved: m.saved > 0 ? Number(m.saved.toFixed(2)) : 0,
        altBrand: m.altBrand?.name ?? null,
      })),
      total: Number(total.toFixed(2)),
      perServing: perServing === null ? null : Number(perServing.toFixed(2)),
      savings: Number(savings.toFixed(2)),
      missing,
    },
  });
}
