import { loadPantry } from "@/lib/pantry";
import Planner from "./Planner";

export default function Home() {
  const items = loadPantry();
  const exact = items.filter(
    (i) =>
      i.source === "target_live" ||
      i.source === "user_screenshot" ||
      i.source === "manual_instore"
  ).length;

  return (
    <main className="wrap">
      <header className="head">
        <h1 className="title">Food Finder</h1>
        <p className="sub">
          Say what you want to eat. You get a recipe and the cheapest way to
          buy it at Target, priced from {items.length.toLocaleString()} items we
          checked by hand.
        </p>
      </header>

      <Planner />

      <footer className="foot">
        {items.length.toLocaleString()} items priced · {exact.toLocaleString()}{" "}
        confirmed against a live Target listing · Pittsburgh stores, September
        2026<br /><i>Made for SteelHacks XIII by Ranjan D., Owen A., & Caleb W.</i>
      </footer>
    </main>
  );
}
