const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export function formatGbp(pence: number): string {
  return gbp.format(pence / 100);
}

export function parseGbpToPence(value: string): number | null {
  const trimmed = value.trim().replace(/£/g, "").replace(/,/g, "");
  if (!trimmed) return null;
  const pounds = Number(trimmed);
  if (!Number.isFinite(pounds) || pounds <= 0) return null;
  return Math.round(pounds * 100);
}
