import { formatDistanceToNow, differenceInDays } from 'date-fns';
import type { Plant, WateringLog } from '../types/plant';

type Props = {
  plant: Plant;
  lastWatering?: WateringLog;
  onClick: () => void;
};

function healthGradient(lastWatering?: WateringLog) {
  if (!lastWatering) return 'from-stone-100 to-stone-200';
  const days = differenceInDays(new Date(), new Date(lastWatering.watered_at));
  if (days <= 7) return 'from-leaf-100 to-leaf-200';
  if (days <= 14) return 'from-yellow-100 to-yellow-200';
  return 'from-red-100 to-red-200';
}

export default function PlantCard({ plant, lastWatering, onClick }: Props) {
  const displayName = plant.nickname || plant.species;
  const subName = plant.nickname ? plant.species : null;
  const sharedCount = plant.caretakers ? plant.caretakers.length : 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className={`h-40 bg-gradient-to-br ${healthGradient(lastWatering)} relative overflow-hidden`}>
        {plant.photo_url ? (
          <img src={plant.photo_url} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-leaf-400">✿</div>
        )}
        {sharedCount > 1 && (
          <div className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-0.5 text-xs text-stone-600">
            {sharedCount} people
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="font-semibold text-stone-800 truncate">{displayName}</p>
        {subName && <p className="text-xs text-stone-400 italic truncate">{subName}</p>}

        {lastWatering ? (
          <p className="text-xs text-stone-400 mt-1.5">
            Watered {formatDistanceToNow(new Date(lastWatering.watered_at), { addSuffix: true })}
          </p>
        ) : (
          <p className="text-xs text-stone-300 mt-1.5">No watering recorded</p>
        )}
      </div>
    </button>
  );
}
