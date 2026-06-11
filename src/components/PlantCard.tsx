import { formatDistanceToNow, differenceInDays } from 'date-fns';
import type { Plant, WateringLog } from '../types/plant';

type Props = {
  plant: Plant;
  lastWatering?: WateringLog;
  onClick: () => void;
};

function wateringStatus(plant: Plant, lastWatering?: WateringLog): { gradient: string; label: string; overdue: boolean } {
  const interval = plant.watering_interval_days;

  if (!lastWatering) return { gradient: 'from-stone-100 to-stone-200', label: 'No watering recorded', overdue: false };

  const daysSince = differenceInDays(new Date(), new Date(lastWatering.watered_at));

  if (interval) {
    const daysUntil = interval - daysSince;
    if (daysUntil < 0) return { gradient: 'from-red-100 to-red-200', label: `Overdue by ${Math.abs(daysUntil)}d`, overdue: true };
    if (daysUntil === 0) return { gradient: 'from-orange-100 to-orange-200', label: 'Water today!', overdue: true };
    if (daysUntil <= 2) return { gradient: 'from-yellow-100 to-yellow-200', label: `Water in ${daysUntil}d`, overdue: false };
    return { gradient: 'from-leaf-100 to-leaf-200', label: `Water in ${daysUntil}d`, overdue: false };
  }

  // No interval set — fall back to generic health colour
  if (daysSince <= 7) return { gradient: 'from-leaf-100 to-leaf-200', label: `Watered ${formatDistanceToNow(new Date(lastWatering.watered_at), { addSuffix: true })}`, overdue: false };
  if (daysSince <= 14) return { gradient: 'from-yellow-100 to-yellow-200', label: `Watered ${formatDistanceToNow(new Date(lastWatering.watered_at), { addSuffix: true })}`, overdue: false };
  return { gradient: 'from-red-100 to-red-200', label: `Watered ${formatDistanceToNow(new Date(lastWatering.watered_at), { addSuffix: true })}`, overdue: false };
}

export default function PlantCard({ plant, lastWatering, onClick }: Props) {
  const displayName = plant.nickname || plant.species;
  const subName = plant.nickname ? plant.species : null;
  const { gradient, label, overdue } = wateringStatus(plant, lastWatering);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className={`h-40 bg-gradient-to-br ${gradient} relative overflow-hidden`}>
        {plant.photo_url ? (
          <img src={plant.photo_url} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-leaf-400">✿</div>
        )}
        {overdue && (
          <div className="absolute bottom-2 left-2 bg-red-500 text-white text-xs font-semibold rounded-full px-2 py-0.5">
            Needs water
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="font-semibold text-stone-800 truncate">{displayName}</p>
        {subName && <p className="text-xs text-stone-400 italic truncate">{subName}</p>}
        <p className={`text-xs mt-1.5 ${overdue ? 'text-red-400 font-medium' : 'text-stone-400'}`}>{label}</p>
      </div>
    </button>
  );
}
