/** Build a URL-safe token slug from symbol + optional disambiguator. */
export function tokenSlug(symbol: string, name?: string, address?: string): string {
  const base = symbol
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!base) return "token";
  if (!name && !address) return base;
  const namePart = name
    ? name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 24)
    : "";
  if (namePart && namePart !== base) return `${base}-${namePart}`.slice(0, 64);
  if (address) {
    const tail = address.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toLowerCase();
    return `${base}-${tail}`.slice(0, 64);
  }
  return base.slice(0, 64);
}

export function pairSlug(baseSymbol: string, quoteSymbol: string): string {
  return `${baseSymbol}-${quoteSymbol}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function learnSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
