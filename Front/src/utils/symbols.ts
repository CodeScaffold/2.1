

/**
 * List of futures symbols (exact MT5 contract names).
 */
export const FUTURE_PAIRS = ["DJI30SEP25"];

/**
 * Returns true if the raw symbol ends in a month‐code + 2‑digit year (i.e. a futures contract).
 */
export function isFuture(raw: string | undefined): boolean {
  if (!raw) return false;
  const up = raw.trim().toUpperCase();
  return FUTURE_PAIRS.includes(up);
}

/**
 * Strip the trailing month‐code + 2‑digit year from a futures symbol.
 */
export function normalizeSymbol(raw: string | undefined): string {
  if (!raw) return "";
  return raw.toUpperCase().replace(/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d{2}$/, "");
}

/**
 * Returns the exact symbol to use when calling the margin API.
 * For both spot and futures, this is the trimmed, uppercase contract name.
 */
export function getApiSymbol(raw: string | undefined): string {
  return raw ? raw.trim().toUpperCase() : "";
}

// /**
//  * Return true if the normalized symbol should be treated
//  * as USD-based for both margin and hedging rules.
//  */
// export function isUsdBase(sym: string): boolean {
//     // 6-letter pairs like EURUSD, GBPCHF etc all count
//     if (/^[A-Z]{6}$/.test(sym)) {
//         // your existing whitelist:
//         return ["USDJPY","USDCAD","USDCHF","EURJPY"].includes(sym);
//     }
//     // or any of our known futures:
//     return KNOWN_FUTURES.includes(sym);
// }