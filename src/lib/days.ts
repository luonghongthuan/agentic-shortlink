const DAY_MS = 24 * 60 * 60 * 1000;

export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function lastNDays(now: Date, n: number): string[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: n }, (_, i) => utcDay(new Date(today - (n - 1 - i) * DAY_MS)));
}

export function fillDays(days: string[], counts: Map<string, number>) {
  return days.map((date) => ({ date, clicks: counts.get(date) ?? 0 }));
}
