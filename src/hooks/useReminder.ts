import { differenceInCalendarDays, parseISO } from "date-fns";
import type { WateringLog } from "../types/plant";

export function useReminder(lastWateringLog: WateringLog | null) {
  if (!lastWateringLog) return { daysSince: null, needsWater: false };

  const last = parseISO(lastWateringLog.watered_at);
  const daysSince = differenceInCalendarDays(new Date(), last);
  const needsWater = daysSince >= 14;

  return { daysSince, needsWater };
}
