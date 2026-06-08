import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Plant, PropagationMethod } from '../types/plant';

type Props = {
  userId: string;
  onSaved: () => void;
  onCancel: () => void;
};

const METHODS: PropagationMethod[] = ['leaf', 'stem', 'offset', 'division', 'water'];

export default function AddPropagation({ userId, onSaved, onCancel }: Props) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantId, setPlantId] = useState('');
  const [method, setMethod] = useState<PropagationMethod>('leaf');
  const [dateTaken, setDateTaken] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from('plant_caretakers')
      .select('plant_id, plants(id, species, nickname)')
      .eq('user_id', userId)
      .then(({ data }) => {
        const list = (data ?? []).map((r: any) => r.plants).filter(Boolean) as Plant[];
        setPlants(list);
        if (list.length > 0) setPlantId(list[0].id);
      });
  }, [userId]);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${userId}/prop-${Date.now()}.${file.name.split('.').pop()}`;
    const { error: err } = await supabase.storage.from('plant-photos').upload(path, file, { upsert: true });
    if (err) { setError(err.message); setUploading(false); return; }
    const { data } = supabase.storage.from('plant-photos').getPublicUrl(path);
    setPhotoUrl(data.publicUrl);
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plantId) return;
    setSaving(true);
    const { error: err } = await supabase.from('propagations').insert({
      plant_id: plantId,
      owner_id: userId,
      method,
      current_stage: 'cutting',
      date_taken: dateTaken,
      notes: notes.trim() || null,
      photo_url: photoUrl || null,
    });
    if (err) { setError(err.message); setSaving(false); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="text-lg font-semibold text-stone-800">New propagation</h2>
          <button onClick={onCancel} className="text-stone-400 hover:text-stone-600 text-xl p-1">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="flex flex-col items-center gap-2">
            <div onClick={() => fileRef.current?.click()}
              className="w-24 h-24 rounded-2xl bg-purple-50 border-2 border-dashed border-purple-200 flex items-center justify-center cursor-pointer hover:bg-purple-100 overflow-hidden">
              {photoUrl
                ? <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                : <span className="text-sm text-purple-400">{uploading ? 'Uploading...' : 'Add photo'}</span>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Parent plant <span className="text-red-400">*</span></label>
            <select value={plantId} onChange={(e) => setPlantId(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
              {plants.map(p => <option key={p.id} value={p.id}>{p.nickname ?? p.species}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Method</label>
            <div className="flex gap-2 flex-wrap">
              {METHODS.map(m => (
                <button key={m} type="button" onClick={() => setMethod(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-colors ${method === m ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-stone-500 border-stone-200 hover:border-purple-300'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Date taken</label>
            <input type="date" value={dateTaken} onChange={(e) => setDateTaken(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any observations..."
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel}
              className="flex-1 border border-stone-200 text-stone-600 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || uploading || !plantId}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Add propagation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
