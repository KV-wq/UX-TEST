export function formatRub(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatRubCompact(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatRelativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const day = 24 * 60 * 60 * 1000;
  if (diff < 60_000) return "только что";
  if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)} мин назад`;
  if (diff < day) return `${Math.floor(diff / (60 * 60_000))} ч назад`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} д назад`;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
  }).format(ts);
}

export function formatShortDate(ts: number): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
  }).format(ts);
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
