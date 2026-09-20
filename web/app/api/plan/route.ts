import { NextResponse } from "next/server";
import { loadPantry, buildShoppingList } from "@/lib/pantry";

type Recipe = {
  title: string;
  servings: number;
  time: string;
  ingredients: string[];
  steps: string[];
};

const SYSTEM = `You plan cheap meals that a college student can cook in a dorm or small apartment kitchen.

Always return this exact JSON shape, no prose and no markdown fences:
{
  "recipes": [
    { "title": string, "servings": number, "time": string, "ingredients": string[], "steps": string[] }
  ]
}

How many recipes to put in the array:
- If the request describes ONE dish or craving, return exactly one recipe.
- If the request asks for several separate items ("3 breakfast ideas", "2 dinner options", "5 snacks"), return that many DISTINCT recipes -- each a complete, different dish with its own ingredients and steps, not one recipe that mashes several ideas together.
- Never return an empty array, and never leave "ingredients" or "steps" empty for any recipe in it.

Rules for each recipe's "ingredients":
- Write each one as a quantity plus a plain supermarket name: "1 lb ground beef", "2 cups white rice", "3 cloves garlic".
- Use names you would see on a US grocery shelf. Say "green onion" not "scallion", "cilantro" not "coriander".
- Keep it to 10 ingredients or fewer per recipe.
- Do not list water, or equipment.
- Prefer cheap staples. This is for someone on a tight budget.

Rules for each recipe's "steps": 4 to 8 short imperative sentences.`;

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

  const plans = recipes.map((recipe) => {
    const { matches, total, missing, savings } = buildShoppingList(
      recipe.ingredients,
      pantry
    );
    const perServing = recipe.servings > 0 ? total / recipe.servings : total;

    return {
      recipe: {
        title: recipe.title ?? craving,
        servings: recipe.servings ?? 2,
        time: recipe.time ?? "",
        steps: Array.isArray(recipe.steps) ? recipe.steps : [],
      },
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
      perServing: Number(perServing.toFixed(2)),
      savings: Number(savings.toFixed(2)),
      missing,
    };
  });

  return NextResponse.json({ plans });
}
