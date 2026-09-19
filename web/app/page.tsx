import fs from "node:fs";
import path from "node:path";
import PriceSearch from "./PriceSearch";

export type Item = {
  name: string;
  category: string;
  unit: string;
  price: number;
  source: string;
};

// Minimal CSV parser that handles quoted fields containing commas.
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
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function loadItems(): Item[] {
  const file = path.join(
    process.cwd(),
    "data",
    "target_grocery_prices_verified.csv"
  );
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  const [header, ...body] = rows;

  const col = (name: string) => header.indexOf(name);
  const iName = col("item_name");
  const iCat = col("category");
  const iUnit = col("unit");
  const iPrice = col("price");
  const iSource = col("source");

  return body
    .filter((r) => r[iName] && r[iPrice])
    .map((r) => ({
      name: r[iName].trim(),
      category: r[iCat]?.trim() ?? "",
      unit: r[iUnit]?.trim() ?? "",
      price: Number.parseFloat(r[iPrice]),
      source: r[iSource]?.trim() ?? "",
    }))
    .filter((it) => Number.isFinite(it.price));
}

export default function Home() {
  const items = loadItems();

  const categories = [...new Set(items.map((i) => i.category))].sort();
  const cheapest = items.reduce((a, b) => (b.price < a.price ? b : a));
  const verified = items.filter((i) => i.source === "target_live").length;

  return (
    <main className="wrap">
      <header className="head">
        <h1 className="title">Food Finder</h1>
        <p className="sub">
          Every price below was pulled from Target and checked by hand. Search
          an ingredient to see what it actually costs.
        </p>
      </header>

      <dl className="stats">
        <div className="stat">
          <dt>Items priced</dt>
          <dd className="num">{items.length.toLocaleString()}</dd>
        </div>
        <div className="stat">
          <dt>Categories</dt>
          <dd className="num">{categories.length}</dd>
        </div>
        <div className="stat">
          <dt>Pulled live from Target</dt>
          <dd className="num">{verified.toLocaleString()}</dd>
        </div>
        <div className="stat">
          <dt>Cheapest item</dt>
          <dd className="num">${cheapest.price.toFixed(2)}</dd>
        </div>
      </dl>

      <PriceSearch items={items} categories={categories} />
    </main>
  );
}

