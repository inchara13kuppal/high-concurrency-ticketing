export function normalizeSeatNumbers(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string" || !/^\d{1,4}$/.test(item)) return null;
    const seatNumber = Number(item);
    if (!Number.isInteger(seatNumber) || seatNumber < 1 || seatNumber > 9999) return null;
    const seat = String(seatNumber).padStart(3, "0");
    if (seen.has(seat)) return null;
    seen.add(seat);
    normalized.push(seat);
  }

  return normalized.sort((left, right) => Number(left) - Number(right));
}