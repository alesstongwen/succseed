import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, subMonths, addMonths } from 'date-fns';
import { supabase } from '../lib/supabaseClient';

type Props = { userId: string };

type DayActivity = {
  date: Date;
  plantPhotos: string[];
  propPhotos: string[];
  hasPlantActivity: boolean;
  hasPropActivity: boolean;
};

type DayDetail = {
  date: Date;
  items: { type: 'plant' | 'prop'; label: string; photo?: string; note?: string; time: string }[];
};

export default function Journal({ userId }: Props) {
  const [month, setMonth] = useState(new Date());
  const [activity, setActivity] = useState<Map<string, DayActivity>>(new Map());
  const [selected, setSelected] = useState<DayDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const start = startOfMonth(month).toISOString();
      const end = endOfMonth(month).toISOString();

      const [watering, fertilize, care, propUpdates] = await Promise.all([
        supabase.from('watering_logs').select('plant_id, watered_at, notes, plants(species, nickname)').gte('watered_at', start).lte('watered_at', end),
        supabase.from('fertilize_logs').select('plant_id, fertilized_at, fertilizer_name, plants(species, nickname)').gte('fertilized_at', start).lte('fertilized_at', end),
        supabase.from('care_logs').select('plant_id, logged_at, note, care_type, plants(species, nickname)').gte('logged_at', start).lte('logged_at', end),
        supabase.from('propagation_updates').select('propagation_id, logged_at, notes, photo_url, stage, propagations(plant_id, plants(species, nickname))').gte('logged_at', start).lte('logged_at', end),
      ]);

      const map = new Map<string, DayActivity>();

      function getOrCreate(date: Date): DayActivity {
        const key = format(date, 'yyyy-MM-dd');
        if (!map.has(key)) map.set(key, { date, plantPhotos: [], propPhotos: [], hasPlantActivity: false, hasPropActivity: false });
        return map.get(key)!;
      }

      for (const w of (watering.data ?? []) as any[]) {
        const d = getOrCreate(new Date(w.watered_at));
        d.hasPlantActivity = true;
      }
      for (const f of (fertilize.data ?? []) as any[]) {
        const d = getOrCreate(new Date(f.fertilized_at));
        d.hasPlantActivity = true;
      }
      for (const c of (care.data ?? []) as any[]) {
        const d = getOrCreate(new Date(c.logged_at));
        d.hasPlantActivity = true;
      }
      for (const u of (propUpdates.data ?? []) as any[]) {
        const d = getOrCreate(new Date(u.logged_at));
        d.hasPropActivity = true;
        if (u.photo_url) d.propPhotos.push(u.photo_url);
      }

      setActivity(map);
      setLoading(false);
    }
    load();
  }, [month, userId]);

  async function selectDay(date: Date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);

    const [watering, fertilize, care, propUpdates] = await Promise.all([
      supabase.from('watering_logs').select('watered_at, notes, amount_ml, plants(species, nickname)').gte('watered_at', start.toISOString()).lte('watered_at', end.toISOString()),
      supabase.from('fertilize_logs').select('fertilized_at, fertilizer_name, plants(species, nickname)').gte('fertilized_at', start.toISOString()).lte('fertilized_at', end.toISOString()),
      supabase.from('care_logs').select('logged_at, note, care_type, plants(species, nickname)').gte('logged_at', start.toISOString()).lte('logged_at', end.toISOString()),
      supabase.from('propagation_updates').select('logged_at, notes, photo_url, stage, propagations(plants(species, nickname))').gte('logged_at', start.toISOString()).lte('logged_at', end.toISOString()),
    ]);

    const items: DayDetail['items'] = [];

    for (const w of (watering.data ?? []) as any[]) {
      const name = w.plants?.nickname ?? w.plants?.species ?? 'Plant';
      const intensity = w.amount_ml <= 50 ? 'misting' : w.amount_ml <= 150 ? 'light' : w.amount_ml <= 300 ? 'normal' : 'soaked';
      items.push({ type: 'plant', label: `Watered ${name}`, note: intensity, time: format(new Date(w.watered_at), 'h:mm a') });
    }
    for (const f of (fertilize.data ?? []) as any[]) {
      const name = f.plants?.nickname ?? f.plants?.species ?? 'Plant';
      items.push({ type: 'plant', label: `Fertilized ${name}`, note: f.fertilizer_name ?? undefined, time: format(new Date(f.fertilized_at), 'h:mm a') });
    }
    for (const c of (care.data ?? []) as any[]) {
      const name = c.plants?.nickname ?? c.plants?.species ?? 'Plant';
      items.push({ type: 'plant', label: `${c.care_type ?? 'Care'} — ${name}`, note: c.note, time: format(new Date(c.logged_at), 'h:mm a') });
    }
    for (const u of (propUpdates.data ?? []) as any[]) {
      const name = u.propagations?.plants?.nickname ?? u.propagations?.plants?.species ?? 'Cutting';
      items.push({ type: 'prop', label: `${name} — ${u.stage}`, note: u.notes ?? undefined, photo: u.photo_url ?? undefined, time: format(new Date(u.logged_at), 'h:mm a') });
    }

    setSelected({ date, items });
  }

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startPad = getDay(startOfMonth(month));

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      <div className="bg-white border-b border-stone-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => setMonth(m => subMonths(m, 1))} className="p-2 text-stone-400 hover:text-stone-600">←</button>
          <h1 className="text-lg font-bold text-stone-800">{format(month, 'MMMM yyyy')}</h1>
          <button onClick={() => setMonth(m => addMonths(m, 1))} className="p-2 text-stone-400 hover:text-stone-600">→</button>
        </div>
        <div className="flex justify-center gap-4 mt-2">
          <span className="flex items-center gap-1 text-xs text-stone-500"><span className="w-2 h-2 rounded-full bg-leaf-500 inline-block" /> Plant</span>
          <span className="flex items-center gap-1 text-xs text-stone-500"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Propagation</span>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-center text-xs text-stone-400 py-1">{d}</div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-leaf-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map(day => {
              const key = format(day, 'yyyy-MM-dd');
              const act = activity.get(key);
              const photo = act?.propPhotos[0];
              const isToday = isSameDay(day, new Date());

              return (
                <button key={key} onClick={() => selectDay(day)}
                  className={`aspect-square rounded-full flex flex-col items-center justify-center relative overflow-hidden transition-transform hover:scale-105 ${isToday ? 'ring-2 ring-stone-400' : ''}`}>
                  {photo ? (
                    <>
                      <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 rounded-full ring-2 ring-purple-500" />
                      <span className="relative text-xs font-bold text-white drop-shadow">{format(day, 'd')}</span>
                    </>
                  ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center rounded-full ${act ? 'bg-stone-100' : ''}`}>
                      <span className={`text-sm font-medium ${isToday ? 'text-stone-800' : 'text-stone-600'}`}>{format(day, 'd')}</span>
                      {act && (
                        <div className="flex gap-0.5 mt-0.5">
                          {act.hasPlantActivity && <span className="w-1.5 h-1.5 rounded-full bg-leaf-500" />}
                          {act.hasPropActivity && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Day detail sheet */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-full bg-white rounded-t-2xl p-5 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-stone-800">{format(selected.date, 'MMMM d, yyyy')}</h2>
              <button onClick={() => setSelected(null)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>
            {selected.items.length === 0 ? (
              <p className="text-stone-400 text-sm text-center py-4">No activity this day</p>
            ) : (
              <div className="space-y-3">
                {selected.items.map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className={`w-2 rounded-full flex-shrink-0 ${item.type === 'prop' ? 'bg-purple-400' : 'bg-leaf-400'}`} />
                    <div className="flex-1">
                      {item.photo && <img src={item.photo} alt="" className="w-full h-32 object-cover rounded-xl mb-2" />}
                      <p className="text-sm font-medium text-stone-700">{item.label}</p>
                      {item.note && <p className="text-xs text-stone-400 mt-0.5">{item.note}</p>}
                      <p className="text-xs text-stone-300 mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
