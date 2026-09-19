"use client";

import { useMemo, useState } from "react";
import type { Item } from "./page";

export default function PriceSearch({
  items,
  categories,
}: {
  items: Item[];
  categories: string[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => category === "All" || i.category === category)
      .filter((i) => q === "" || i.name.toLowerCase().includes(q))
      .sort((a, b) => a.price - b.price)
      .slice(0, 60);
  }, [items, query, category]);

  return (
    <section>
      <div className="controls">
        <label className="field">
          <span className="fieldLabel">Search ingredients</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="chicken, rice, tortillas…"
            className="input"
          />
        </label>

        <label className="field">
          <span className="fieldLabel">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input"
          >
            <option value="All">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="count">
        {results.length === 0
          ? "Nothing matched. Try a shorter word."
          : `Showing ${results.length} cheapest match${
              results.length === 1 ? "" : "es"
            }`}
      </p>

      <ul className="list">
        {results.map((item) => (
          <li key={`${item.name}-${item.price}`} className="row">
            <div className="rowMain">
              <span className="rowName">{item.name}</span>
              <span className="rowMeta">
                {item.category} · {item.unit}
              </span>
            </div>
            <span className="rowPrice">${item.price.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
