import { useEffect, useState, useCallback, useRef } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { compressImage } from '../lib/compressImage';
import type { Plant, WateringLog, FertilizeLog, CareLog } from '../types/plant';
import AddEditPlant from './AddEditPlant';
import AddCoParent from './AddCoParentModel';

type Tab = 'overview' | 'watering' | 'fertilize' | 'care';

type Props = {
  plantId: string;
  userId: string;
  onBack: () => void;
  onDeleted: () => void;
};

const CARE_TYPES = ['Observation', 'Repotting', 'Pruning', 'Pest treatment', 'Disease treatment', 'Other'];

export default function PlantDetail({ plantId, userId, onBack, onDeleted }: Props) {
  const [plant, setPlant] = useState<Plant | null>(null);
  const [wateringLogs, setWateringLogs] = useState<WateringLog[]>([]);
  const [fertilizeLogs, setFertilizeLogs] = useState<FertilizeLog[]>([]);
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [editing, setEditing] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [loading, setLoading] = useState(true);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Quick-log state
  const [waterNote, setWaterNote] = useState('');
  const [waterIntensity, setWaterIntensity] = useState<'misting' | 'light' | 'normal' | 'soaked'>('normal');
  const [waterDate, setWaterDate] = useState(todayStr);
  const [fertNote, setFertNote] = useState('');
  const [fertName, setFertName] = useState('');
  const [fertAmount, setFertAmount] = useState('');
  const [fertDate, setFertDate] = useState(todayStr);
  const [careNote, setCareNote] = useState('');
  const [careType, setCareType] = useState(CARE_TYPES[0]);
  const [carePhoto, setCarePhoto] = useState('');
  const [careDate, setCareDate] = useState(todayStr);
  const [careUploading, setCareUploading] = useState(false);
  const [logSaving, setLogSaving] = useState(false);
  const careFileRef = useRef<HTMLInputElement>(null);

  const loadPlant = useCallback(async () => {
    const [plantRes, caretakersRes] = await Promise.all([
      supabase.from('plants').select('*').eq('id', plantId).single(),
      supabase
        .from('plant_caretakers')
        .select('user_id, role, profiles(id, full_name, email, avatar_url)')
        .eq('plant_id', plantId),
    ]);

    if (plantRes.data) {
      const caretakers = (caretakersRes.data ?? []).map((pc: any) => ({
        id: pc.profiles?.id ?? pc.user_id,
        name: pc.profiles?.full_name ?? null,
        email: pc.profiles?.email ?? null,
        avatar_url: pc.profiles?.avatar_url ?? null,
      }));
      setPlant({ ...plantRes.data, caretakers });
    }
    setLoading(false);
  }, [plantId]);

  const loadLogs = useCallback(async () => {
    const [w, f, c] = await Promise.all([
      supabase
        .from('watering_logs')
        .select('*, profiles(full_name, email)')
        .eq('plant_id', plantId)
        .order('watered_at', { ascending: false }),
      supabase
        .from('fertilize_logs')
        .select('*, profiles(full_name, email)')
        .eq('plant_id', plantId)
        .order('fertilized_at', { ascending: false }),
      supabase
        .from('care_logs')
        .select('*, profiles(full_name, email)')
        .eq('plant_id', plantId)
        .order('logged_at', { ascending: false }),
    ]);
    setWateringLogs((w.data ?? []) as WateringLog[]);
    setFertilizeLogs((f.data ?? []) as FertilizeLog[]);
    setCareLogs((c.data ?? []) as CareLog[]);
  }, [plantId]);

  useEffect(() => {
    loadPlant();
    loadLogs();

    // Real-time subscriptions
    const plantSub = supabase
      .channel(`plant-${plantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plants', filter: `id=eq.${plantId}` }, loadPlant)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'watering_logs', filter: `plant_id=eq.${plantId}` }, loadLogs)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fertilize_logs', filter: `plant_id=eq.${plantId}` }, loadLogs)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'care_logs', filter: `plant_id=eq.${plantId}` }, loadLogs)
      .subscribe();

    return () => { supabase.removeChannel(plantSub); };
  }, [plantId, loadPlant, loadLogs]);

  const intensityToMl = { misting: 50, light: 150, normal: 300, soaked: 500 };

  async function logWatering() {
    setLogSaving(true);
    await supabase.from('watering_logs').insert({
      plant_id: plantId,
      watered_by: userId,
      notes: waterNote.trim() || null,
      amount_ml: intensityToMl[waterIntensity],
      watered_at: new Date(waterDate).toISOString(),
    });
    setWaterNote('');
    setWaterIntensity('normal');
    setWaterDate(todayStr);
    await loadLogs();
    setLogSaving(false);
  }

  async function logFertilize() {
    setLogSaving(true);
    await supabase.from('fertilize_logs').insert({
      plant_id: plantId,
      fertilized_by: userId,
      notes: fertNote.trim() || null,
      fertilizer_name: fertName.trim() || null,
      amount_ml: fertAmount ? parseInt(fertAmount) : null,
      fertilized_at: new Date(fertDate).toISOString(),
    });
    setFertNote('');
    setFertName('');
    setFertAmount('');
    setFertDate(todayStr);
    await loadLogs();
    setLogSaving(false);
  }

  async function handleCarePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCareUploading(true);
    const compressed = await compressImage(file);
    const path = `${userId}/care-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('plant-photos').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
    if (!error) {
      const { data } = supabase.storage.from('plant-photos').getPublicUrl(path);
      setCarePhoto(data.publicUrl);
    }
    setCareUploading(false);
  }

  async function logCare() {
    if (!careNote.trim()) return;
    setLogSaving(true);
    await supabase.from('care_logs').insert({
      plant_id: plantId,
      logged_by: userId,
      note: careNote.trim(),
      care_type: careType,
      photo_url: carePhoto || null,
      logged_at: new Date(careDate).toISOString(),
    });
    setCareNote('');
    setCarePhoto('');
    setCareDate(todayStr);
    await loadLogs();
    setLogSaving(false);
  }

  async function deleteWateringLog(id: string) {
    await supabase.from('watering_logs').delete().eq('id', id);
    await loadLogs();
  }

  async function deleteFertilizeLog(id: string) {
    await supabase.from('fertilize_logs').delete().eq('id', id);
    await loadLogs();
  }

  async function deleteCareLog(id: string) {
    await supabase.from('care_logs').delete().eq('id', id);
    await loadLogs();
  }

  async function deletePlant() {
    if (!confirm('Delete this plant? This cannot be undone.')) return;
    await supabase.from('plants').delete().eq('id', plantId);
    onDeleted();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-leaf-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="p-6 text-center text-stone-500">
        Plant not found.
        <button onClick={onBack} className="block mx-auto mt-4 text-leaf-600 underline text-sm">Back</button>
      </div>
    );
  }

  const displayName = plant.nickname || plant.species;
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'watering', label: 'Water' },
    { id: 'fertilize', label: 'Fertilize' },
    { id: 'care', label: 'Care log' },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header photo */}
      <div className="relative h-56 bg-gradient-to-br from-leaf-100 to-leaf-300">
        {plant.photo_url ? (
          <img src={plant.photo_url} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl text-leaf-400">✿</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        <button
          onClick={onBack}
          className="absolute top-4 left-4 bg-white/90 rounded-full p-2 text-stone-700 shadow-sm hover:bg-white"
        >
          ←
        </button>

        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="bg-white/90 rounded-full px-3 py-1.5 text-xs text-stone-700 shadow-sm hover:bg-white"
          >
            Edit
          </button>
          <button
            onClick={deletePlant}
            className="bg-white/90 rounded-full px-3 py-1.5 text-xs text-red-600 shadow-sm hover:bg-white"
          >
            Delete
          </button>
        </div>

        <div className="absolute bottom-4 left-4">
          <h1 className="text-2xl font-bold text-white leading-tight">{displayName}</h1>
          {plant.nickname && <p className="text-white/80 text-sm italic">{plant.species}</p>}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-stone-200 bg-white sticky top-0 z-10">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              tab === t.id
                ? 'text-leaf-700 border-b-2 border-leaf-600'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {/* Overview tab */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 space-y-3">
              <InfoRow label="Species" value={plant.species} />
              {plant.nickname && <InfoRow label="Nickname" value={plant.nickname} />}
              {plant.date_acquired && (
                <InfoRow label="Home since" value={format(new Date(plant.date_acquired), 'MMMM d, yyyy')} />
              )}
              {wateringLogs[0] && (
                <InfoRow
                  label="Last watered"
                  value={formatDistanceToNow(new Date(wateringLogs[0].watered_at), { addSuffix: true })}
                />
              )}
              {fertilizeLogs[0] && (
                <InfoRow
                  label="Last fertilized"
                  value={formatDistanceToNow(new Date(fertilizeLogs[0].fertilized_at), { addSuffix: true })}
                />
              )}
            </div>

            {/* Caretakers */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-stone-700">Co-parents</h3>
                <button
                  onClick={() => setShowInvite(true)}
                  className="text-xs text-leaf-600 hover:underline"
                >
                  + Invite
                </button>
              </div>
              <div className="space-y-2">
                {(plant.caretakers ?? []).map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-leaf-100 flex items-center justify-center text-sm overflow-hidden">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (c.name ?? c.email ?? '?').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <span className="text-sm text-stone-700">{c.name ?? c.email ?? 'Unknown'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Watering tab */}
        {tab === 'watering' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 space-y-3">
              <h3 className="font-medium text-stone-700">Log watering</h3>
              <div className="grid grid-cols-4 gap-2">
                {(['misting', 'light', 'normal', 'soaked'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setWaterIntensity(level)}
                    className={`py-2 rounded-lg text-xs font-medium capitalize border transition-colors ${
                      waterIntensity === level
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-stone-500 border-stone-200 hover:border-blue-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <p className="text-xs text-stone-400 text-center">
                {waterIntensity === 'misting' && 'Light spray — ~50ml'}
                {waterIntensity === 'light' && 'Small amount — ~150ml'}
                {waterIntensity === 'normal' && 'Regular watering — ~300ml'}
                {waterIntensity === 'soaked' && 'Thorough soak — ~500ml'}
              </p>
              <textarea
                placeholder="Notes (optional)"
                value={waterNote}
                onChange={(e) => setWaterNote(e.target.value)}
                rows={2}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400 resize-none"
              />
              <div>
                <label className="block text-xs text-stone-400 mb-1">Date</label>
                <input
                  type="date"
                  value={waterDate}
                  max={todayStr}
                  onChange={(e) => setWaterDate(e.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400"
                />
              </div>
              <button
                onClick={logWatering}
                disabled={logSaving}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Log watering
              </button>
            </div>

            <div className="space-y-2">
              {wateringLogs.length === 0 && (
                <p className="text-center text-stone-400 text-sm py-6">No waterings recorded yet</p>
              )}
              {wateringLogs.map((log) => (
                <div key={log.id} className="bg-white rounded-xl p-3 shadow-sm border border-stone-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-700">
                      {format(new Date(log.watered_at), 'MMM d, yyyy')}
                    </span>
                    <div className="flex items-center gap-2">
                      {log.amount_ml && (
                        <span className="text-xs text-blue-500 bg-blue-50 rounded-full px-2 py-0.5 capitalize">
                          {log.amount_ml <= 50 ? 'misting' : log.amount_ml <= 150 ? 'light' : log.amount_ml <= 300 ? 'normal' : 'soaked'}
                        </span>
                      )}
                      <button onClick={() => deleteWateringLog(log.id)} className="text-xs text-stone-300 hover:text-red-400 transition-colors">Delete</button>
                    </div>
                  </div>
                  {log.notes && <p className="text-xs text-stone-500 mt-1">{log.notes}</p>}
                  <p className="text-xs text-stone-300 mt-1">
                    by {log.profiles?.full_name ?? log.profiles?.email ?? 'someone'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fertilize tab */}
        {tab === 'fertilize' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 space-y-3">
              <h3 className="font-medium text-stone-700">Log fertilizing</h3>
              <input
                placeholder="Fertilizer name (optional)"
                value={fertName}
                onChange={(e) => setFertName(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400"
              />
              <input
                type="number"
                placeholder="Amount in ml (optional)"
                value={fertAmount}
                onChange={(e) => setFertAmount(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400"
              />
              <textarea
                placeholder="Notes (optional)"
                value={fertNote}
                onChange={(e) => setFertNote(e.target.value)}
                rows={2}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400 resize-none"
              />
              <div>
                <label className="block text-xs text-stone-400 mb-1">Date</label>
                <input
                  type="date"
                  value={fertDate}
                  max={todayStr}
                  onChange={(e) => setFertDate(e.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400"
                />
              </div>
              <button
                onClick={logFertilize}
                disabled={logSaving}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Log fertilizing
              </button>
            </div>

            <div className="space-y-2">
              {fertilizeLogs.length === 0 && (
                <p className="text-center text-stone-400 text-sm py-6">No fertilizing recorded yet</p>
              )}
              {fertilizeLogs.map((log) => (
                <div key={log.id} className="bg-white rounded-xl p-3 shadow-sm border border-stone-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-700">
                      {format(new Date(log.fertilized_at), 'MMM d, yyyy')}
                    </span>
                    <div className="flex items-center gap-2">
                      {log.fertilizer_name && (
                        <span className="text-xs text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
                          {log.fertilizer_name}
                        </span>
                      )}
                      {log.amount_ml && (
                        <span className="text-xs text-stone-500 bg-stone-100 rounded-full px-2 py-0.5">
                          {log.amount_ml} ml
                        </span>
                      )}
                      <button onClick={() => deleteFertilizeLog(log.id)} className="text-xs text-stone-300 hover:text-red-400 transition-colors">Delete</button>
                    </div>
                  </div>
                  {log.notes && <p className="text-xs text-stone-500 mt-1">{log.notes}</p>}
                  <p className="text-xs text-stone-300 mt-1">
                    by {log.profiles?.full_name ?? log.profiles?.email ?? 'someone'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Care log tab */}
        {tab === 'care' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 space-y-3">
              <h3 className="font-medium text-stone-700">Add care note</h3>
              <div onClick={() => careFileRef.current?.click()}
                className="w-full h-24 rounded-xl bg-stone-50 border-2 border-dashed border-stone-200 flex items-center justify-center cursor-pointer hover:bg-stone-100 overflow-hidden">
                {carePhoto
                  ? <img src={carePhoto} alt="" className="w-full h-full object-cover rounded-xl" />
                  : <span className="text-sm text-stone-400">{careUploading ? 'Uploading...' : '+ Add photo (optional)'}</span>
                }
              </div>
              <input ref={careFileRef} type="file" accept="image/*" className="hidden" onChange={handleCarePhoto} />
              <select
                value={careType}
                onChange={(e) => setCareType(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400"
              >
                {CARE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <textarea
                placeholder="What did you do? How does the plant look?"
                value={careNote}
                onChange={(e) => setCareNote(e.target.value)}
                rows={3}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400 resize-none"
              />
              <div>
                <label className="block text-xs text-stone-400 mb-1">Date</label>
                <input
                  type="date"
                  value={careDate}
                  max={todayStr}
                  onChange={(e) => setCareDate(e.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400"
                />
              </div>
              <button
                onClick={logCare}
                disabled={logSaving || !careNote.trim()}
                className="w-full bg-leaf-600 hover:bg-leaf-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Save note
              </button>
            </div>

            <div className="space-y-2">
              {careLogs.length === 0 && (
                <p className="text-center text-stone-400 text-sm py-6">No care notes yet</p>
              )}
              {careLogs.map((log) => (
                <div key={log.id} className="bg-white rounded-xl p-3 shadow-sm border border-stone-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-leaf-600 bg-leaf-50 rounded-full px-2 py-0.5 font-medium">
                      {log.care_type ?? 'Note'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-400">
                        {format(new Date(log.logged_at), 'MMM d, yyyy')}
                      </span>
                      <button onClick={() => deleteCareLog(log.id)} className="text-xs text-stone-300 hover:text-red-400 transition-colors">Delete</button>
                    </div>
                  </div>
                  {log.photo_url && <img src={log.photo_url} alt="" className="w-full h-36 object-cover rounded-lg mt-2" />}
                  <p className="text-sm text-stone-700 mt-1">{log.note}</p>
                  <p className="text-xs text-stone-300 mt-1">
                    by {log.profiles?.full_name ?? log.profiles?.email ?? 'someone'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {editing && (
        <AddEditPlant
          userId={userId}
          plant={plant}
          onSaved={(updated) => { setPlant(updated); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      )}

      {showInvite && (
        <AddCoParent
          plantId={plantId}
          plantName={plant ? (plant.nickname || plant.species) : 'a plant'}
          open={showInvite}
          onClose={() => setShowInvite(false)}
          onAdded={() => loadPlant()}
        />
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-sm text-stone-400">{label}</span>
      <span className="text-sm font-medium text-stone-800 text-right max-w-[60%]">{value}</span>
    </div>
  );
}
