/** Parse a decimal string into an integer scaled by 10^dp without float maths ("2.95", 2 → 295). Invalid → 0. */
export function toFixedInt(str: string | number | null | undefined, dp: number): number {
  const s = String(str ?? "").trim();
  if (!/^\d+(\.\d+)?$/.test(s)) return 0;
  const [i, f = ""] = s.split(".");
  return parseInt(i, 10) * Math.pow(10, dp) + parseInt((f + "0000").slice(0, dp) || "0", 10);
}

/** Integer pesewas → editable "123.45". */
export const pesewasToInput = (m: number) => (m / 100).toFixed(2);
