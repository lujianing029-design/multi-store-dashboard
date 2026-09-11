export type DatePreset = "today" | "yesterday" | "7d" | "30d";

export interface ZonedRange {
  start: Date;
  end: Date;
  startDate: string;
  endDate: string;
  label: string;
  preset: DatePreset;
  timezone: string;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timezone: string) {
  const cached = formatterCache.get(timezone);
  if (cached) return cached;
  const created = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  formatterCache.set(timezone, created);
  return created;
}

function partsAt(date: Date, timezone: string): DateParts {
  const parts = Object.fromEntries(
    formatter(timezone)
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
  return parts as unknown as DateParts;
}

function localMidnightUtc(date: Pick<DateParts, "year" | "month" | "day">, timezone: string) {
  const desired = Date.UTC(date.year, date.month - 1, date.day);
  let candidate = desired;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const local = partsAt(new Date(candidate), timezone);
    const represented = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second
    );
    candidate = desired - (represented - candidate);
  }
  return new Date(candidate);
}

function shiftDate(
  date: Pick<DateParts, "year" | "month" | "day">,
  days: number
): Pick<DateParts, "year" | "month" | "day"> {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate()
  };
}

function isoDate(date: Pick<DateParts, "year" | "month" | "day">) {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function getZonedRange(
  preset: DatePreset,
  now = new Date(),
  timezone = "Asia/Shanghai"
): ZonedRange {
  const today = partsAt(now, timezone);
  const startOffset = preset === "yesterday" ? -1 : preset === "7d" ? -6 : preset === "30d" ? -29 : 0;
  const endOffset = preset === "yesterday" ? 0 : 1;
  const startLocal = shiftDate(today, startOffset);
  const endExclusiveLocal = shiftDate(today, endOffset);
  const endInclusiveLocal = shiftDate(endExclusiveLocal, -1);
  const labels: Record<DatePreset, string> = {
    today: "今日",
    yesterday: "昨日",
    "7d": "近 7 天",
    "30d": "近 30 天"
  };

  return {
    start: localMidnightUtc(startLocal, timezone),
    end: localMidnightUtc(endExclusiveLocal, timezone),
    startDate: isoDate(startLocal),
    endDate: isoDate(endInclusiveLocal),
    label: labels[preset],
    preset,
    timezone
  };
}

export function getUtcRangeForLocalDate(date: string, timezone = "Asia/Shanghai") {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new RangeError(`Invalid local date: ${date}`);
  const local = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const next = shiftDate(local, 1);
  return {
    start: localMidnightUtc(local, timezone),
    end: localMidnightUtc(next, timezone)
  };
}

export function parsePreset(value: string | string[] | undefined): DatePreset {
  const selected = Array.isArray(value) ? value[0] : value;
  return selected === "today" || selected === "yesterday" || selected === "30d"
    ? selected
    : "7d";
}

