"use client";

import { useState } from "react";

type Row = {
  ingredient: string;
  product: string | null;
  price: number | null;
  unit: string | null;
  category: string | null;
  saved: number;
  altBrand: string | null;
};

type Plan = {
  recipe: { title: string; servings: number; time: string; steps: string[] };
  list: Row[];
  total: number;
  perServing: number;
  savings: number;
  missing: string[];
};

const EXAMPLES = [
  "something cheap with chicken",
  "comfort food for a cold night",
  "tacos for four people",
  "quick breakfast, no oven",
];

export default function Planner() {
  const [craving, setCraving] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(text: string) {
    const q = text.trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ craving: q }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong.");
      else setPlan(data);
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="ask">
        <label className="field">
          <span className="fieldLabel">What do you feel like eating?</span>
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
        {EXAMPLES.map((e) => (
          <button
            key={e}
            className="chip"
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

      {plan && (
        <article className="plan">
          <header className="planHead">
            <h2 className="planTitle">{plan.recipe.title}</h2>
            <p className="planMeta">
              Serves {plan.recipe.servings}
              {plan.recipe.time ? ` · ${plan.recipe.time}` : ""}
            </p>
          </header>

          <div className="priceBar">
            <div>
              <span className="priceLabel">Total at Target</span>
              <span className="priceBig">${plan.total.toFixed(2)}</span>
            </div>
            <div>
              <span className="priceLabel">Per serving</span>
              <span className="priceBig">${plan.perServing.toFixed(2)}</span>
            </div>
          </div>

          {plan.savings > 0 && (
            <p className="savingsLine">
              Saved ${plan.savings.toFixed(2)} buying store brand over name
              brand on this list.
            </p>
          )}

          <h3 className="sectionHead">Shopping list</h3>
          <ul className="list">
            {plan.list.map((r, i) => (
              <li key={i} className="row">
                <div className="rowMain">
                  <span className={r.saved > 0 ? "rowName rowSaved" : "rowName"}>
                    {r.ingredient}
                  </span>
                  <span className="rowMeta">
                    {r.product ? `${r.product} · ${r.unit}` : "Not sold at Target"}
                  </span>
                  {r.saved > 0 && (
                    <span className="rowSavedNote">
                      Saved ${r.saved.toFixed(2)} vs {r.altBrand}
                    </span>
                  )}
                </div>
                <span className={r.price === null ? "rowNone" : "rowPrice"}>
                  {r.price === null ? "—" : `$${r.price.toFixed(2)}`}
                </span>
              </li>
            ))}
          </ul>

          {plan.missing.length > 0 && (
            <p className="note">
              No Target match for: {plan.missing.join(", ")}. Those are left out
              of the total.
            </p>
          )}

          {plan.recipe.steps.length > 0 && (
            <>
              <h3 className="sectionHead">How to make it</h3>
              <ol className="steps">
                {plan.recipe.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </>
          )}
        </article>
      )}
    </section>
  );
}
