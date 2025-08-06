import { useEffect, useState } from "react";
import PlantForm from "./components/PlantForm";
import PlantCard from "./components/PlantCard";
import type { Plant } from "./types/plant";
import { loadFromStorage, saveToStorage } from "./utils/localStorage";

function App() {
  const [plants, setPlants] = useState<Plant[]>(() => loadFromStorage("plants", []));

  useEffect(() => {
    saveToStorage("plants", plants);
  }, [plants]);

  const handleAdd = (plant: Plant) => {
    setPlants(prev => [...prev, plant]);
  };

  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">🌿 SuccSeed</h1>
      <PlantForm onAdd={handleAdd} />
      <div className="mt-6">
        {plants.map(p => <PlantCard key={p.id} plant={p} />)}
      </div>
    </main>
  );
}

export default App;
