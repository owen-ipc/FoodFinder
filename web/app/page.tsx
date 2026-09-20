import { loadPantry } from "@/lib/pantry";
import Planner from "./Planner";
import KitchenBackdrop from "./KitchenBackdrop";

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
      <KitchenBackdrop />
      <Planner totalItems={items.length} exactItems={exact} />
    </main>
  );
}
