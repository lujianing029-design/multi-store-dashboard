"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { PlatformContribution, TrendPoint } from "@/lib/dashboard/types";
import { formatCurrency, formatNumber } from "@/lib/dashboard/format";

const tooltipStyle = { border: "1px solid #dfe5e2", borderRadius: 6, boxShadow: "0 8px 24px rgba(31,45,40,.08)" };

export function SalesTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="chart-box">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data} margin={{ left: -10, right: 8, top: 10, bottom: 0 }}>
          <CartesianGrid stroke="#edf0ee" strokeDasharray="3 3" vertical={false} />
          <XAxis axisLine={false} dataKey="date" fontSize={12} tickLine={false} />
          <YAxis axisLine={false} fontSize={12} tickFormatter={(value) => `${Math.round(value / 1000)}k`} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(Number(value))} />
          <Legend iconType="circle" iconSize={8} />
          <Line dataKey="gmv" dot={false} name="支付销售额" stroke="#167c5a" strokeWidth={2.5} type="monotone" />
          <Line dataKey="netSales" dot={false} name="净销售额" stroke="#e58a2b" strokeWidth={2} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PlatformChart({ data }: { data: PlatformContribution[] }) {
  return (
    <div className="platform-chart">
      <div className="donut">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart><Pie data={data} dataKey="value" innerRadius={52} nameKey="platform" outerRadius={78} paddingAngle={3}>
            {data.map((entry) => <Cell fill={entry.color} key={entry.platform} />)}
          </Pie><Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(Number(value))} /></PieChart>
        </ResponsiveContainer>
      </div>
      <div className="legend-list">
        {data.map((entry) => <div key={entry.platform}><span className="legend-dot" style={{ background: entry.color }} /><strong>{entry.platform}</strong><span>{formatNumber(entry.value)}</span><em>{Math.round(entry.share * 100)}%</em></div>)}
      </div>
    </div>
  );
}

export function ProductBarChart({ data }: { data: Array<{ platform: string; gmv: number }> }) {
  return <div className="chart-box compact"><ResponsiveContainer height="100%" width="100%"><BarChart data={data} margin={{ left: -10, right: 8 }}><CartesianGrid stroke="#edf0ee" strokeDasharray="3 3" vertical={false} /><XAxis axisLine={false} dataKey="platform" tickLine={false} /><YAxis axisLine={false} fontSize={12} tickFormatter={(value) => `${Math.round(value / 1000)}k`} tickLine={false} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(Number(value))} /><Bar dataKey="gmv" fill="#167c5a" name="支付销售额" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>;
}

