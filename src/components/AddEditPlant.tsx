import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { compressImage } from '../lib/compressImage';
import type { Plant } from '../types/plant';

type Props = {
  userId: string;
  plant?: Plant;
  onSaved: (plant: Plant) => void;
  onCancel: () => void;
};

export default function AddEditPlant({ userId, plant, onSaved, onCancel }: Props) {
  const isEdit = !!plant;
  const [species, setSpecies] = useState(plant?.species ?? '');
  const [nickname, setNickname] = useState(plant?.nickname ?? '');
  const [dateAcquired, setDateAcquired] = useState(plant?.date_acquired ?? '');
  const [photoUrl, setPhotoUrl] = useState(plant?.photo_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

    if (uploadErr) {
      setError(uploadErr.message);
      setUploading(false);
      return;
    }

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
      photo_url: photoUrl || null,
      updated_at: new Date().toISOString(),
    };

    let result: Plant | null = null;

    if (isEdit) {
      const { data, error: err } = await supabase
        .from('plants')
        .update(payload)
        .eq('id', plant.id)
        .select()
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      result = data as Plant;
    } else {
      const { data, error: err } = await supabase
        .from('plants')
        .insert({ ...payload, owner_id: userId })
        .select()
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      result = data as Plant;

      // Auto-add owner as caretaker
      await supabase.from('plant_caretakers').insert({
        plant_id: result!.id,
        user_id: userId,
        role: 'OWNER',
      });
    }

    setSaving(false);
    onSaved(result!);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="text-lg font-semibold text-stone-800">
            {isEdit ? 'Edit plant' : 'Add a plant'}
          </h2>
          <button onClick={onCancel} className="text-stone-400 hover:text-stone-600 text-xl leading-none p-1">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Photo */}
          <div className="flex flex-col items-center gap-2">
            <div
              onClick={() => fileRef.current?.click()}
              className="w-28 h-28 rounded-2xl bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center cursor-pointer hover:bg-stone-50 overflow-hidden"
            >
              {photoUrl ? (
                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm text-stone-400">{uploading ? 'Uploading...' : 'Add photo'}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs text-leaf-600 hover:underline"
            >
              {photoUrl ? 'Change photo' : 'Upload photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Species <span className="text-red-400">*</span></label>
            <input
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              placeholder="e.g. Monstera deliciosa"
              required
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Nickname</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Monty"
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Date brought home</label>
            <input
              type="date"
              value={dateAcquired}
              onChange={(e) => setDateAcquired(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 border border-stone-200 text-stone-600 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading || !species.trim()}
              className="flex-1 bg-leaf-600 hover:bg-leaf-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add plant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
