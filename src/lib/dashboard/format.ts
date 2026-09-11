export function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2
  }).format(Number(value));
}

export function formatNumber(value: number | string) {
  return new Intl.NumberFormat("zh-CN").format(Number(value));
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
}

export function formatChange(value: number | null) {
  if (value === null) return "暂无对比";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatPercent(value)}`;
}

export function formatDateTime(value: string | null) {
  if (!value) return "尚未同步";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

