"use client";

import { useState } from "react";

type RecipeMeta = {
  title: string;
  servings: number;
  time: string;
  steps: string[];
};

type Row = {
  ingredient: string;
  product: string | null;
  price: number | null;
  unit: string | null;
  category: string | null;
  saved: number;
  altBrand: string | null;
};

type ShoppingList = {
  list: Row[];
  total: number;
  perServing: number | null;
  savings: number;
  missing: string[];
};

type Props = {
  totalItems: number;
  exactItems: number;
};

const EXAMPLES = [
  "something cheap with chicken",
  "comfort food for a cold night",
  "tacos for four people",
  "quick breakfast, no oven",
];

const CHIP_ACCENTS: Record<number, string> = {
  1: "chip cOrange",
  3: "chip cGrape",
};

function PhotoIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="22" fill="none" stroke="#f2ead8" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="13" fill="none" stroke="#f2ead8" strokeWidth="2" />
      <line x1="10" y1="10" x2="10" y2="26" stroke="#f2ead8" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="10" x2="6" y2="20" stroke="#f2ead8" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="10" x2="14" y2="20" stroke="#f2ead8" strokeWidth="2" strokeLinecap="round" />
      <path d="M54 10c4 4 4 12 0 16v20" stroke="#f2ead8" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function ChopCorner() {
  return (
    <div className="chopCorner">
      <svg width="90" height="60" viewBox="0 0 90 60">
        <circle cx="24" cy="38" r="5" fill="#ff9f45" className="chopBit" style={{ animationDelay: "0.05s" }} />
        <circle cx="34" cy="36" r="5" fill="#ff9f45" className="chopBit" style={{ animationDelay: "0.2s" }} />
        <circle cx="28" cy="46" r="4" fill="#ff9f45" className="chopBit" style={{ animationDelay: "0.35s" }} />
        <ellipse cx="10" cy="40" rx="14" ry="7" fill="#e2873d" />
        <g className="knifeGroup">
          <rect x="66" y="16" width="30" height="6" rx="2" fill="#c9a24a" />
          <path d="M66 16 L14 38 L18 46 L66 22 Z" fill="#d9d9d9" />
        </g>
      </svg>
    </div>
  );
}

export default function Planner({ totalItems, exactItems }: Props) {
  const [craving, setCraving] = useState("");
  const [recipes, setRecipes] = useState<RecipeMeta[] | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(text: string) {
    const q = text.trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);
    setRecipes(null);
    setShoppingList(null);

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ craving: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setRecipes(Array.isArray(data.recipes) ? data.recipes : null);
        setShoppingList(data.shoppingList ?? null);
      }
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  const recipeCount = recipes?.length ?? 0;
  const hasResults = recipeCount > 0 && shoppingList;

  // Grid row bookkeeping -- kept in one place so the receipt column, the
  // photo column, and the paper backdrop all agree on where things land.
  const HEAD_ROW = 2;
  const firstRecipeRow = HEAD_ROW + 1; // 3
  const shoppingRow = firstRecipeRow + recipeCount; // right after the last recipe
  const metaRow = hasResults ? shoppingRow + 1 : firstRecipeRow;
  const notchBottomRow = metaRow + 1;
  const backdropSpan = `2 / ${notchBottomRow}`;

  return (
    <div className="stage">
      <div className="notchTop" style={{ gridRow: 1 }} />
      <div className="paperBackdrop" style={{ gridRow: backdropSpan }} />

      <div className="paperCell headCell" style={{ gridRow: HEAD_ROW }}>
        <div className="wordmark">
          <span className="food">Food</span>
          <span className="finder">Finder</span>
        </div>
        <p className="tagline">What do you want to eat?</p>

        <div className="ask">
          <label className="field">
            <input
              value={craving}
              onChange={(e) => setCraving(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit(craving)}
              placeholder="something cheap with chicken"
              className="input"
              disabled={loading}
            />
          </label>
          <button
            onClick={() => submit(craving)}
            disabled={loading || !craving.trim()}
            className="go"
          >
            {loading ? "Planning…" : "Plan it"}
          </button>
        </div>

        <div className="examples">
          {EXAMPLES.map((e, i) => (
            <button
              key={e}
              className={CHIP_ACCENTS[i] ?? "chip"}
              disabled={loading}
              onClick={() => {
                setCraving(e);
                submit(e);
              }}
            >
              {e}
            </button>
          ))}
        </div>

        {error && <p className="error">{error}</p>}
      </div>

      {recipes &&
        recipes.map((recipe, i) => (
          <div
            className="paperCell recipeCell"
            style={{ gridRow: firstRecipeRow + i }}
            key={i}
          >
            <div className="recipeCard">
              <h2 className="planTitle">{recipe.title}</h2>
              <p className="planMeta">
                Serves {recipe.servings}
                {recipe.time ? ` · ${recipe.time}` : ""}
              </p>
              {recipe.steps.length > 0 && (
                <ol className="steps">
                  {recipe.steps.map((s, si) => (
                    <li key={si}>{s}</li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        ))}

      {hasResults && (
        <div className="paperCell shoppingCell" style={{ gridRow: shoppingRow }}>
          <div className="divider" />
          <div className="priceBar">
            <div>
              <span className="priceLabel">
                {recipeCount > 1 ? "Total to make all of this" : "Total at Target"}
              </span>
              <span className="priceBig">${shoppingList!.total.toFixed(2)}</span>
            </div>
            {shoppingList!.perServing !== null && (
              <div>
                <span className="priceLabel">Per serving</span>
                <span className="priceBig">
                  ${shoppingList!.perServing.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {shoppingList!.savings > 0 && (
            <p className="savingsLine">
              saved ${shoppingList!.savings.toFixed(2)} buying store brand
              over name brand on this list
            </p>
          )}

          <h3 className="sectionHead">
            {recipeCount > 1 ? "Combined shopping list" : "Shopping list"}
          </h3>
          <ul className="list">
            {shoppingList!.list.map((r, i) => (
              <li key={i} className="row">
                <div className="rowTop">
                  <span className={r.saved > 0 ? "rowName rowSaved" : "rowName"}>
                    {r.ingredient}
                  </span>
                  <span className="rowFill" />
                  <span className={r.price === null ? "rowNone" : "rowPrice"}>
                    {r.price === null ? "—" : `$${r.price.toFixed(2)}`}
                  </span>
                </div>
                <div className="rowSub">
                  <span className="rowMeta">
                    {r.product ? `${r.product} · ${r.unit}` : "Not sold at Target"}
                  </span>
                  {r.saved > 0 && (
                    <span className="rowSavedNote">
                      saved ${r.saved.toFixed(2)} vs {r.altBrand}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {shoppingList!.missing.length > 0 && (
            <p className="note">
              No Target match for: {shoppingList!.missing.join(", ")}. Those
              are left out of the total.
            </p>
          )}
        </div>
      )}

      <div className="paperCell lastCell" style={{ gridRow: metaRow }}>
        <p className="meta">
          {totalItems.toLocaleString()} items priced · {exactItems.toLocaleString()}{" "}
          confirmed against a live Target listing · Pittsburgh stores,
          September 2026
        </p>
      </div>

      <div className="notchBottom" style={{ gridRow: notchBottomRow }} />

      {recipes ? (
        recipes.map((recipe, i) => (
          <div className="board" style={{ gridRow: firstRecipeRow + i }} key={i}>
            <div className="photoFrame">
              <PhotoIcon />
              <div className="photoLabel">recipe photo goes here</div>
            </div>
            <div className="boardCaption">{recipe.title}</div>
            <ChopCorner />
          </div>
        ))
      ) : (
        <div className="board" style={{ gridRow: HEAD_ROW }}>
          <div className="photoFrame">
            <PhotoIcon />
            <div className="photoLabel">your recipe photo will show up here</div>
          </div>
          <ChopCorner />
        </div>
      )}

      <p className="credit" style={{ gridRow: metaRow }}>
        Made for SteelHacks XIII by Ranjan D., Owen A., &amp; Caleb W.
      </p>
    </div>
  );
}
