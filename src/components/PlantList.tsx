import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInCalendarDays } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import type { Plant, WateringLog } from '../types/plant';
import PlantCard from './PlantCard';
import AddEditPlant from './AddEditPlant';
import NotificationsBell from './NotificationsBell';

type Props = {
  userId: string;
  userName: string | null;
  onSignOut: () => void;
};

export default function PlantList({ userId, userName, onSignOut }: Props) {
  const navigate = useNavigate();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [lastWaterings, setLastWaterings] = useState<Record<string, WateringLog>>({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const loadPlants = useCallback(async () => {
    const { data: myRows } = await supabase
      .from('plant_caretakers')
      .select('plant_id, plants(*)')
      .eq('user_id', userId);

    if (!myRows) { setLoading(false); return; }

    const plantList: Plant[] = (myRows as any[])
      .map((row) => row.plants)
      .filter(Boolean) as Plant[];

    if (plantList.length === 0) { setPlants([]); setLoading(false); return; }

    // Fetch all caretakers for these plants in one query (avoids nested
    // self-referential RLS join that caused only the current user's row to show)
    const plantIds = plantList.map((p) => p.id);
    const { data: allCaretakers } = await supabase
      .from('plant_caretakers')
      .select('plant_id, user_id, profiles(id, full_name, email, avatar_url)')
      .in('plant_id', plantIds);

    const caretakersByPlant: Record<string, any[]> = {};
    for (const pc of (allCaretakers ?? []) as any[]) {
      if (!caretakersByPlant[pc.plant_id]) caretakersByPlant[pc.plant_id] = [];
      caretakersByPlant[pc.plant_id].push({
        id: pc.profiles?.id ?? pc.user_id,
        name: pc.profiles?.full_name ?? null,
        email: pc.profiles?.email ?? null,
        avatar_url: pc.profiles?.avatar_url ?? null,
      });
    }

    const plantListWithCaretakers = plantList.map((p) => ({
      ...p,
      caretakers: caretakersByPlant[p.id] ?? [],
    }));

    setPlants(plantListWithCaretakers);

    // Fetch last watering for each plant
    if (plantListWithCaretakers.length > 0) {
      const ids = plantListWithCaretakers.map((p) => p.id);
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

  const greeting = userName ? `Hi, ${userName.split(' ')[0]}!` : 'Your plants';

  function urgencyScore(plant: Plant): number {
    const log = lastWaterings[plant.id];
    if (!log) return 0; // never watered — neutral, sits at bottom
    const daysSince = differenceInCalendarDays(new Date(), new Date(log.watered_at));
    if (plant.watering_interval_days) {
      // negative = overdue (more negative = more urgent), positive = days remaining
      return plant.watering_interval_days - daysSince;
    }
    // No interval: sort by days since (more days = more urgent = lower score)
    return daysSince * -1;
  }

  const sortedPlants = [...plants].sort((a, b) => urgencyScore(a) - urgencyScore(b));

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-stone-800">Succseed</h1>
          <p className="text-xs text-stone-400">{greeting}</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsBell userId={userId} />
          <button
            onClick={onSignOut}
            className="text-xs text-stone-400 hover:text-stone-600 border border-stone-200 rounded-lg px-3 py-1.5"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-leaf-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : plants.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 text-leaf-300">✿</div>
            <p className="text-stone-500 font-medium">No plants yet</p>
            <p className="text-stone-400 text-sm mt-1">Add your first plant to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sortedPlants.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                lastWatering={lastWaterings[plant.id]}
                onClick={() => navigate(`/plants/${plant.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setAdding(true)}
        className="fixed bottom-20 right-6 w-14 h-14 bg-leaf-600 hover:bg-leaf-700 text-white rounded-full shadow-lg text-2xl flex items-center justify-center transition-colors"
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
