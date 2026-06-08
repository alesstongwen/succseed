import { useEffect, useState, useCallback, useRef } from 'react';
import { format, differenceInDays } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import type { Propagation, PropagationUpdate, PropagationStage } from '../types/plant';

type Props = { propagationId: string; userId: string; onBack: () => void };

const STAGES: PropagationStage[] = ['cutting', 'rooting', 'rooted', 'potted', 'established', 'failed'];

const STAGE_COLORS: Record<PropagationStage, string> = {
  cutting:    'bg-stone-100 text-stone-600 border-stone-200',
  rooting:    'bg-blue-100 text-blue-600 border-blue-200',
  rooted:     'bg-cyan-100 text-cyan-700 border-cyan-200',
  potted:     'bg-amber-100 text-amber-700 border-amber-200',
  established:'bg-leaf-100 text-leaf-700 border-leaf-200',
  failed:     'bg-red-100 text-red-500 border-red-200',
};

export default function PropagationDetail({ propagationId, userId, onBack }: Props) {
  const [prop, setProp] = useState<Propagation | null>(null);
  const [updates, setUpdates] = useState<PropagationUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [stage, setStage] = useState<PropagationStage>('cutting');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [{ data: p }, { data: u }] = await Promise.all([
      supabase.from('propagations').select('*, plants(species, nickname)').eq('id', propagationId).single(),
      supabase.from('propagation_updates').select('*').eq('propagation_id', propagationId).order('logged_at', { ascending: false }),
    ]);
    if (p) { setProp(p as Propagation); setStage((p as Propagation).current_stage); }
    setUpdates((u ?? []) as PropagationUpdate[]);
    setLoading(false);
  }, [propagationId]);

  useEffect(() => { load(); }, [load]);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${userId}/prop-update-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('plant-photos').upload(path, file, { upsert: true });
    if (error) { setUploading(false); return; }
    const { data } = supabase.storage.from('plant-photos').getPublicUrl(path);
    setPhotoUrl(data.publicUrl);
    setUploading(false);
  }

  async function logUpdate() {
    if (!note.trim() && !photoUrl) return;
    setSaving(true);
    await supabase.from('propagation_updates').insert({
      propagation_id: propagationId,
      stage,
      notes: note.trim() || null,
      photo_url: photoUrl || null,
      logged_by: userId,
    });
    await supabase.from('propagations').update({ current_stage: stage, updated_at: new Date().toISOString(), ...(photoUrl ? { photo_url: photoUrl } : {}) }).eq('id', propagationId);
    setNote(''); setPhotoUrl('');
    await load();
    setSaving(false);
  }

  async function graduateToPlant() {
    if (!prop) return;
    if (!confirm('Graduate this propagation to a new plant in your collection?')) return;
    const plantName = prop.plants?.nickname ?? prop.plants?.species ?? 'Propagation';
    const { data } = await supabase.from('plants').insert({
      owner_id: userId,
      species: prop.plants?.species ?? 'Unknown',
      nickname: `${plantName} (prop)`,
      photo_url: prop.photo_url,
      date_acquired: new Date().toISOString().split('T')[0],
    }).select().single();
    if (data) {
      await supabase.from('plant_caretakers').insert({ plant_id: data.id, user_id: userId, role: 'OWNER' });
      await supabase.from('propagations').update({ current_stage: 'established' }).eq('id', propagationId);
    }
    onBack();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!prop) return <div className="p-6 text-center text-stone-500">Not found. <button onClick={onBack} className="text-purple-600 underline">Back</button></div>;

  const plantName = prop.plants?.nickname ?? prop.plants?.species ?? 'Unknown';
  const daysSince = differenceInDays(new Date(), new Date(prop.date_taken));

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      <div className="relative h-48 bg-gradient-to-br from-purple-100 to-purple-300">
        {prop.photo_url
          ? <img src={prop.photo_url} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-6xl text-purple-400">✦</div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <button onClick={onBack} className="absolute top-4 left-4 bg-white/90 rounded-full p-2 text-stone-700 shadow-sm hover:bg-white">←</button>
        <div className="absolute bottom-4 left-4">
          <h1 className="text-xl font-bold text-white">{plantName}</h1>
          <p className="text-white/80 text-sm capitalize">{prop.method} cutting · {daysSince} days old</p>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Stage progress */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
          <p className="text-sm font-medium text-stone-700 mb-3">Stage</p>
          <div className="flex gap-1.5 flex-wrap">
            {STAGES.map(s => (
              <button key={s} onClick={() => setStage(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize border transition-colors ${stage === s ? STAGE_COLORS[s] : 'bg-white text-stone-400 border-stone-200'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Log update */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 space-y-3">
          <p className="text-sm font-medium text-stone-700">Log update</p>
          <div onClick={() => fileRef.current?.click()}
            className="w-full h-28 rounded-xl bg-purple-50 border-2 border-dashed border-purple-200 flex items-center justify-center cursor-pointer hover:bg-purple-100 overflow-hidden">
            {photoUrl
              ? <img src={photoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
              : <span className="text-sm text-purple-400">{uploading ? 'Uploading...' : '+ Add photo'}</span>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="What do you observe?"
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
          <button onClick={logUpdate} disabled={saving || uploading || (!note.trim() && !photoUrl)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            Save update
          </button>
        </div>

        {/* Graduate button */}
        {prop.current_stage !== 'established' && prop.current_stage !== 'failed' && (
          <button onClick={graduateToPlant}
            className="w-full border-2 border-leaf-400 text-leaf-700 py-2 rounded-xl text-sm font-medium hover:bg-leaf-50 transition-colors">
            Graduate to plant
          </button>
        )}

        {/* Update history / photo timeline */}
        {updates.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Timeline</p>
            <div className="space-y-3">
              {updates.map(u => (
                <div key={u.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-stone-100">
                  {u.photo_url && <img src={u.photo_url} alt="" className="w-full h-40 object-cover" />}
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs rounded-full px-2 py-0.5 capitalize border ${STAGE_COLORS[u.stage]}`}>{u.stage}</span>
                      <span className="text-xs text-stone-400">{format(new Date(u.logged_at), 'MMM d, yyyy')}</span>
                    </div>
                    {u.notes && <p className="text-sm text-stone-700 mt-1">{u.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
