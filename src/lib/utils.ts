export function fmt(n: number): string {
  if (n >= 1000) return "€" + (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return "€" + Math.round(n);
}

export function fmtDelta(n: number): string {
  const sign = n >= 0 ? "+" : "−";
  if (Math.abs(n) >= 1000) return sign + (Math.abs(n) / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return sign + Math.abs(Math.round(n));
}

export function normalizeToMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case "bimestrale":  return amount / 2;
    case "trimestrale": return amount / 3;
    case "semestrale":  return amount / 6;
    case "annuale":     return amount / 12;
    default:            return amount;
  }
}

export function getMonthRange(monthOffset = 0): { start: string; end: string } {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const y = d.getFullYear();
  const m = d.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const last = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { start, end };
}
