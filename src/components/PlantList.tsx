import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Plant, WateringLog } from '../types/plant';
import PlantCard from './PlantCard';
import AddEditPlant from './AddEditPlant';

type Props = {
  userId: string;
  userName: string | null;
  onSelect: (plantId: string) => void;
  onSignOut: () => void;
};

export default function PlantList({ userId, userName, onSelect, onSignOut }: Props) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [lastWaterings, setLastWaterings] = useState<Record<string, WateringLog>>({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const loadPlants = useCallback(async () => {
    const { data } = await supabase
      .from('plant_caretakers')
      .select(`plant_id, plants(*, plant_caretakers(user_id, profiles(id, full_name, email, avatar_url)))`)
      .eq('user_id', userId);

    if (!data) { setLoading(false); return; }

    const plantList: Plant[] = (data as any[])
      .map((row) => {
        if (!row.plants) return null;
        const p = row.plants;
        const caretakers = (p.plant_caretakers ?? []).map((pc: any) => ({
          id: pc.profiles?.id ?? pc.user_id,
          name: pc.profiles?.full_name ?? null,
          email: pc.profiles?.email ?? null,
          avatar_url: pc.profiles?.avatar_url ?? null,
        }));
        return { ...p, caretakers };
      })
      .filter(Boolean) as Plant[];

    setPlants(plantList);

    // Fetch last watering for each plant
    if (plantList.length > 0) {
      const ids = plantList.map((p) => p.id);
      const { data: wData } = await supabase
        .from('watering_logs')
        .select('*')
        .in('plant_id', ids)
        .order('watered_at', { ascending: false });

      const map: Record<string, WateringLog> = {};
      for (const log of (wData ?? []) as WateringLog[]) {
        if (!map[log.plant_id]) map[log.plant_id] = log;
      }
      setLastWaterings(map);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadPlants();

    const sub = supabase
      .channel('plant-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plants' }, loadPlants)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'watering_logs' }, loadPlants)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plant_caretakers' }, loadPlants)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [loadPlants]);

  const greeting = userName ? `Hi, ${userName.split(' ')[0]} 👋` : 'Your plants 🌱';

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-stone-800">🌱 Succseed</h1>
          <p className="text-xs text-stone-400">{greeting}</p>
        </div>
        <button
          onClick={onSignOut}
          className="text-xs text-stone-400 hover:text-stone-600 border border-stone-200 rounded-lg px-3 py-1.5"
        >
          Sign out
        </button>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="text-4xl animate-pulse">🌱</span>
          </div>
        ) : plants.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🪴</div>
            <p className="text-stone-500 font-medium">No plants yet</p>
            <p className="text-stone-400 text-sm mt-1">Add your first plant to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {plants.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                lastWatering={lastWaterings[plant.id]}
                onClick={() => onSelect(plant.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setAdding(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-leaf-600 hover:bg-leaf-700 text-white rounded-full shadow-lg text-2xl flex items-center justify-center transition-colors"
        title="Add plant"
      >
        +
      </button>

      {adding && (
        <AddEditPlant
          userId={userId}
          onSaved={(plant) => {
            setPlants((prev) => [plant, ...prev]);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}
    </div>
  );
}
