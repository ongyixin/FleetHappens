"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Brain, Radio, Loader2 } from "lucide-react";
import type { AceInsight } from "@/types";

interface AceInsightCardProps { insight: AceInsight; }

const BAR_COLORS = ["#f5a623", "#fb923c", "#38bdf8", "#34d399", "#a78bfa", "#f87171"];

function isNumericColumn(values: (string | number)[]): boolean {
  return values.every((v) => typeof v === "number" || !isNaN(Number(v)));
}

function InsightChart({ insight }: { insight: AceInsight }) {
  if (insight.rows.length === 0) return null;
  const firstCol   = insight.columns[0];
  const numericCols = insight.columns.slice(1).filter((col) =>
    isNumericColumn(insight.rows.map((r) => r[col]))
  );
  if (numericCols.length === 0) return null;
  const valueCol = numericCols[0];
  const chartData = insight.rows.map((row) => ({
    name: String(row[firstCol]).replace(" — ", "\n"),
    value: Number(row[valueCol]),
  }));

  return (
    <div className="mt-3 h-[110px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -22 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: "rgba(232,237,248,0.35)", fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "rgba(232,237,248,0.35)", fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              background: "#17191f",
              color: "#e8edf8",
              fontFamily: "JetBrains Mono",
            }}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={24}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function InsightTable({ insight }: { insight: AceInsight }) {
  const displayRows = insight.rows.slice(0, 5);
  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)]">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[rgba(255,255,255,0.04)]">
            {insight.columns.map((col) => (
              <th key={col} className="px-2.5 py-2 text-left font-bold text-[rgba(232,237,248,0.35)] uppercase tracking-wider text-[9px] font-body">
                {col.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
          {displayRows.map((row, i) => (
            <tr key={i} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
              {insight.columns.map((col, j) => (
                <td key={col} className={`px-2.5 py-2 ${j === 0 ? "text-white font-body font-medium" : "text-[rgba(232,237,248,0.55)] font-data tabular-nums"}`}>
                  {typeof row[col] === "number" ? Number(row[col]).toLocaleString() : String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {insight.totalRowCount && insight.totalRowCount > 5 && (
        <div className="px-2.5 py-2 text-[10px] text-[rgba(232,237,248,0.35)] bg-[rgba(255,255,255,0.03)] border-t border-[rgba(255,255,255,0.06)] font-body">
          Showing 5 of {insight.totalRowCount} rows
          {insight.downloadUrl && (
            <a href={insight.downloadUrl} target="_blank" rel="noreferrer" className="ml-2 text-[#f5a623] hover:underline font-semibold">
              Download CSV →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function AceInsightCardSkeleton() {
  return (
    <div className="atlas-card rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <div className="h-8 w-8 rounded-xl skeleton-shimmer" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 w-44 rounded skeleton-shimmer" />
          <div className="h-3 w-28 rounded skeleton-shimmer" />
        </div>
      </div>
      <div className="h-[110px] rounded-lg skeleton-shimmer" />
      <div className="h-16 rounded-lg skeleton-shimmer" />
    </div>
  );
}

export default function AceInsightCard({ insight }: AceInsightCardProps) {
  const hasChart = insight.rows.length > 1 &&
    insight.columns.slice(1).some((col) => isNumericColumn(insight.rows.map((r) => r[col])));

  return (
    <div className="atlas-card rounded-xl p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="flex-shrink-0 mt-0.5 rounded-xl bg-[rgba(245,166,35,0.1)] p-2">
            <Brain className="h-4 w-4 text-[#f5a623]" />
          </div>
          <p className="text-[13px] font-body font-semibold text-white leading-snug">{insight.question}</p>
        </div>
        <span className={`shrink-0 flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 font-body ${
          insight.fromCache
            ? "text-[rgba(232,237,248,0.45)] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)]"
            : "text-[#34d399] bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)]"
        }`}>
          {insight.fromCache ? <Loader2 className="h-2.5 w-2.5" /> : <Radio className="h-2.5 w-2.5" />}
          {insight.fromCache ? "Cached" : "Live"}
        </span>
      </div>

      {hasChart && <InsightChart insight={insight} />}
      <InsightTable insight={insight} />

      {insight.reasoning && (
        <div className="mt-3 rounded-xl bg-[rgba(245,166,35,0.06)] border border-[rgba(245,166,35,0.15)] p-3">
          <p className="text-[11px] text-[rgba(232,237,248,0.6)] font-body leading-relaxed">
            <span className="font-bold text-[#f5a623]">Ace: </span>
            {insight.reasoning}
          </p>
        </div>
      )}
    </div>
  );
}
