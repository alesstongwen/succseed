import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { compressImage } from '../lib/compressImage';
import type { Plant } from '../types/plant';

type Props = {
  userId: string;
  plant?: Plant;
  onSaved: (plant: Plant) => void;
  onCancel: () => void;
};

type PlantSuggestion = {
  commonName: string | null;
  description: string | null;
  watering: string | null;
  suggestedDays: number | null;
  thumbnail: string | null;
};

export default function AddEditPlant({ userId, plant, onSaved, onCancel }: Props) {
  const isEdit = !!plant;
  const [species, setSpecies] = useState(plant?.species ?? '');
  const [nickname, setNickname] = useState(plant?.nickname ?? '');
  const [dateAcquired, setDateAcquired] = useState(plant?.date_acquired ?? '');
  const [wateringInterval, setWateringInterval] = useState(plant?.watering_interval_days?.toString() ?? '');
  const [photoUrl, setPhotoUrl] = useState(plant?.photo_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<PlantSuggestion | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced species lookup
  useEffect(() => {
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    setSuggestion(null);
    if (species.trim().length < 3) return;

    lookupTimer.current = setTimeout(async () => {
      setLookingUp(true);
      try {
        const { data, error } = await supabase.functions.invoke('plant-lookup', {
          body: { species: species.trim() },
        });
        if (!error && data?.result) setSuggestion(data.result);
      } catch (_) {}
      setLookingUp(false);
    }, 800);

    return () => { if (lookupTimer.current) clearTimeout(lookupTimer.current); };
  }, [species]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const compressed = await compressImage(file);
    const path = `${userId}/${Date.now()}.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from('plant-photos')
      .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
    if (uploadErr) { setError(uploadErr.message); setUploading(false); return; }
    const { data } = supabase.storage.from('plant-photos').getPublicUrl(path);
    setPhotoUrl(data.publicUrl);
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!species.trim()) return;
    setSaving(true);
    setError(null);

    const payload = {
      species: species.trim(),
      nickname: nickname.trim() || null,
      date_acquired: dateAcquired || null,
      watering_interval_days: wateringInterval ? parseInt(wateringInterval) : null,
      photo_url: photoUrl || null,
      updated_at: new Date().toISOString(),
    };

    let result: Plant | null = null;

    if (isEdit) {
      const { data, error: err } = await supabase
        .from('plants').update(payload).eq('id', plant.id).select().single();
      if (err) { setError(err.message); setSaving(false); return; }
      result = data as Plant;
    } else {
      const { data, error: err } = await supabase
        .from('plants').insert({ ...payload, owner_id: userId }).select().single();
      if (err) { setError(err.message); setSaving(false); return; }
      result = data as Plant;
      await supabase.from('plant_caretakers').insert({
        plant_id: result!.id, user_id: userId, role: 'OWNER',
      });
    }

    setSaving(false);
    onSaved(result!);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="text-lg font-semibold text-stone-800">{isEdit ? 'Edit plant' : 'Add a plant'}</h2>
          <button onClick={onCancel} className="text-stone-400 hover:text-stone-600 text-xl leading-none p-1">x</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Photo */}
          <div className="flex flex-col items-center gap-2">
            <div onClick={() => fileRef.current?.click()}
              className="w-28 h-28 rounded-2xl bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center cursor-pointer hover:bg-stone-50 overflow-hidden">
              {photoUrl
                ? <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                : <span className="text-sm text-stone-400">{uploading ? 'Uploading...' : 'Add photo'}</span>
              }
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-leaf-600 hover:underline">
              {photoUrl ? 'Change photo' : 'Upload photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          {/* Species */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Species <span className="text-red-400">*</span></label>
            <input
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              placeholder="e.g. Monstera deliciosa"
              required
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400"
            />
            {lookingUp && <p className="text-xs text-stone-400 mt-1">Looking up plant info...</p>}
          </div>

          {/* Suggestion card */}
          {suggestion && (
            <div className="rounded-xl border border-leaf-200 bg-leaf-50 p-3 space-y-2">
              <div className="flex gap-3">
                {suggestion.thumbnail && (
                  <img src={suggestion.thumbnail} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="min-w-0">
                  {suggestion.commonName && (
                    <p className="text-xs font-semibold text-leaf-700 truncate">{suggestion.commonName}</p>
                  )}
                  {suggestion.description && (
                    <p className="text-xs text-stone-500 mt-0.5 line-clamp-3">{suggestion.description}</p>
                  )}
                </div>
              </div>
              {suggestion.suggestedDays && (
                <div className="flex items-center justify-between pt-1 border-t border-leaf-200">
                  <p className="text-xs text-stone-600">
                    Suggested watering: <span className="font-semibold">every {suggestion.suggestedDays} days</span>
                    <span className="text-stone-400"> ({suggestion.watering})</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setWateringInterval(suggestion.suggestedDays!.toString())}
                    className="text-xs bg-leaf-600 text-white px-3 py-1 rounded-full hover:bg-leaf-700 ml-2 flex-shrink-0"
                  >
                    Use this
                  </button>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Nickname</label>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Monty"
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Date brought home</label>
            <input type="date" value={dateAcquired} onChange={(e) => setDateAcquired(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Water every (days)</label>
            <input type="number" min="1" max="365" placeholder="e.g. 7"
              value={wateringInterval} onChange={(e) => setWateringInterval(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400" />
            <p className="text-xs text-stone-400 mt-1">Leave blank if you prefer no reminder</p>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel}
              className="flex-1 border border-stone-200 text-stone-600 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || uploading || !species.trim()}
              className="flex-1 bg-leaf-600 hover:bg-leaf-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add plant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
