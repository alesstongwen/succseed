import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInCalendarDays } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import type { Propagation, PropagationStage } from '../types/plant';
import AddPropagation from './AddPropagation';

type Props = { userId: string };

const STAGE_ORDER: PropagationStage[] = ['cutting', 'rooting', 'rooted', 'potted', 'established', 'failed'];

const STAGE_COLORS: Record<PropagationStage, string> = {
  cutting:    'bg-stone-100 text-stone-600',
  rooting:    'bg-blue-100 text-blue-600',
  rooted:     'bg-cyan-100 text-cyan-700',
  potted:     'bg-amber-100 text-amber-700',
  established:'bg-leaf-100 text-leaf-700',
  failed:     'bg-red-100 text-red-500',
};

export default function PropagationList({ userId }: Props) {
  const navigate = useNavigate();
  const [propagations, setPropagations] = useState<Propagation[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('propagation_caretakers')
      .select('propagation_id, propagations(*, plants(species, nickname))')
      .eq('user_id', userId);
    const list = (data ?? []).map((r: any) => r.propagations).filter(Boolean) as Propagation[];
    list.sort((a, b) => new Date(b.date_taken).getTime() - new Date(a.date_taken).getTime());
    setPropagations(list);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
    const sub = supabase.channel('propagations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'propagations' }, load)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [load]);

  const active = propagations.filter(p => p.current_stage !== 'established' && p.current_stage !== 'failed');
  const done = propagations.filter(p => p.current_stage === 'established' || p.current_stage === 'failed');

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      <div className="bg-white border-b border-stone-100 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-stone-800">Propagations</h1>
        <p className="text-xs text-stone-400">{active.length} in progress</p>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-leaf-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : propagations.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 text-purple-300">✦</div>
            <p className="text-stone-500 font-medium">No propagations yet</p>
            <p className="text-stone-400 text-sm mt-1">Track cuttings from snip to new plant</p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">In progress</p>
                <div className="space-y-2">
                  {active.map(p => <PropagationCard key={p.id} prop={p} onClick={() => navigate(`/propagations/${p.id}`)} />)}
                </div>
              </div>
            )}
            {done.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Completed</p>
                <div className="space-y-2">
                  {done.map(p => <PropagationCard key={p.id} prop={p} onClick={() => navigate(`/propagations/${p.id}`)} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => setAdding(true)}
        className="fixed bottom-20 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg text-2xl flex items-center justify-center transition-colors"
        title="Add propagation"
      >
        +
      </button>

      {adding && <AddPropagation userId={userId} onSaved={() => { setAdding(false); load(); }} onCancel={() => setAdding(false)} />}
    </div>
  );
}

function PropagationCard({ prop, onClick }: { prop: Propagation; onClick: () => void }) {
  const plantName = prop.plants?.nickname ?? prop.plants?.species ?? prop.source_species ?? 'Unknown plant';
  const daysSince = differenceInCalendarDays(new Date(), new Date(prop.date_taken));
  const stageIdx = STAGE_ORDER.indexOf(prop.current_stage);

  return (
    <button onClick={onClick} className="w-full text-left bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden hover:shadow-md transition-shadow flex">
      <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 flex-shrink-0">
        {prop.photo_url
          ? <img src={prop.photo_url} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-2xl text-purple-400">✦</div>
        }
      </div>
      <div className="p-3 flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-stone-800 truncate text-sm">{plantName}</p>
          <span className={`text-xs rounded-full px-2 py-0.5 ml-2 flex-shrink-0 capitalize ${STAGE_COLORS[prop.current_stage]}`}>
            {prop.current_stage}
          </span>
        </div>
        <p className="text-xs text-stone-400 mt-0.5 capitalize">{prop.method} cutting · {daysSince}d ago</p>
        <div className="flex gap-0.5 mt-2">
          {STAGE_ORDER.slice(0, 5).map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${i <= stageIdx && prop.current_stage !== 'failed' ? 'bg-purple-400' : 'bg-stone-200'}`} />
          ))}
        </div>
      </div>
    </button>
  );
}
