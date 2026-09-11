"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DatePreset } from "@/lib/metrics/timezone";

const options: Array<{ value: DatePreset; label: string }> = [
  { value: "today", label: "今日" },
  { value: "yesterday", label: "昨日" },
  { value: "7d", label: "近 7 天" },
  { value: "30d", label: "近 30 天" }
];

export function RangeFilter({ value }: { value: DatePreset }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  function select(next: DatePreset) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", next);
    router.push(`${pathname}?${params}`);
  }
  return (
    <div className="segmented" aria-label="日期范围">
      {options.map((option) => (
        <button
          aria-pressed={option.value === value}
          className={option.value === value ? "selected" : ""}
          key={option.value}
          onClick={() => select(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

