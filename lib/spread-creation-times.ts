import { startOfDay } from "./format";

export function spreadCreatedAtAcrossDays<T extends { createdAt: number }>(
  items: T[],
  days: number
): T[] {
  if (items.length === 0 || days < 1) return items;
  const dayMs = 24 * 60 * 60 * 1000;
  const capped = Math.min(30, Math.max(1, Math.floor(days)));
  const todayStart = startOfDay(Date.now());
  const oldestStart = todayStart - (capped - 1) * dayMs;
  return items.map((item, i) => {
    const dayIndex = i % capped;
    const dayStart = oldestStart + dayIndex * dayMs;
    const jitter =
      Math.floor(Math.random() * Math.max(1, dayMs - 120_000)) + 60_000;
    return { ...item, createdAt: dayStart + jitter };
  });
}
