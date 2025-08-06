import type { Plant } from "../types/plant";
import { useReminder } from "../hooks/useReminder";

export default function PlantCard({ plant }: { plant: Plant }) {
  const { daysSince, needsWater } = useReminder(plant);

  return (
    <div className={`p-4 border rounded shadow-sm ${needsWater ? 'bg-yellow-100' : 'bg-green-100'} mb-3`}>
      <h2 className="text-xl font-bold">{plant.name}</h2>
      <p>Height: {plant.height} cm</p>
      <p>Last watered: {plant.lastWatered}</p>
      <p>{needsWater ? `🌵 Time to water! (${daysSince} days)` : `✅ No need yet (${daysSince} days)`}</p>
    </div>
  );
}
