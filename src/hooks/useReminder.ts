import { differenceInDays, parseISO } from "date-fns";
import type { Plant } from "../types/plant";

export function useReminder(plant: Plant) {
  const last = parseISO(plant.lastWatered);
  const daysSince = differenceInDays(new Date(), last);
  const needsWater = daysSince >= 14; 

  return {
    daysSince,
    needsWater,
  };
}