/** Parse a GHS amount string into pesewas. "" → 0; malformed (or more than 2 decimals) → NaN. Same rules as the prototype's toMinor(). */
export function toMinor(input: string | null | undefined): number {
  const str = String(input ?? "").trim().replace(/,/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(str)) return str === "" ? 0 : NaN;
  const [i, f = ""] = str.split(".");
  return parseInt(i, 10) * 100 + parseInt((f + "00").slice(0, 2), 10);
}
