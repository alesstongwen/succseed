import { useState } from "react";
import type {Plant} from "../types/plant";
import { v4 as uuidv4 } from "uuid";

interface PlantFormProps {
  onAdd: (plant: Plant) => void;
}

export default function PlantForm({ onAdd }: PlantFormProps) {
  const [name, setName] = useState("");
  const [height, setHeight] = useState("");
  const [lastWatered, setLastWatered] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      id: uuidv4(),
      name,
      height: Number(height),
      lastWatered,
    });
    setName("");
    setHeight("");
    setLastWatered("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input className="w-full p-2 border rounded" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
      <input className="w-full p-2 border rounded" type="number" placeholder="Height (cm)" value={height} onChange={e => setHeight(e.target.value)} />
      <input className="w-full p-2 border rounded" type="date" value={lastWatered} onChange={e => setLastWatered(e.target.value)} />
      <button className="w-full p-2 bg-green-600 text-white rounded">Add Plant</button>
    </form>
  );
}
