import type { DecimalString } from "@/platforms/types";

export function fenToDecimalString(fen: number): DecimalString {
  if (!Number.isSafeInteger(fen) || fen < 0) {
    throw new RangeError("Platform amount in fen must be a non-negative safe integer");
  }
  return `${Math.trunc(fen / 100)}.${String(fen % 100).padStart(2, "0")}`;
}

