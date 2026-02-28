"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Brain, Radio, Loader2 } from "lucide-react";
import type { AceInsight } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AceInsightCardProps {
  insight: AceInsight;
}

// Navy → blue gradient palette for bars
const BAR_COLORS = ["#0e2440", "#1a3a5c", "#1a56db", "#2563eb", "#3b82f6", "#60a5fa"];

function isNumericColumn(values: (string | number)[]): boolean {
  return values.every((v) => typeof v === "number" || !isNaN(Number(v)));
}

function InsightChart({ insight }: { insight: AceInsight }) {
  if (insight.rows.length === 0) return null;

  const firstCol = insight.columns[0];
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
    <div className="mt-3 h-[120px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -22 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              border: "1px solid hsl(30,8%,90%)",
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(14,36,64,0.08)",
              background: "white",
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={28}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
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
    <div className="mt-3 rounded-lg overflow-hidden border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50">
            {insight.columns.map((col) => (
              <th
                key={col}
                className="px-2.5 py-1.5 text-left font-semibold text-muted-foreground uppercase tracking-wide text-[10px]"
              >
                {col.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {displayRows.map((row, i) => (
            <tr key={i} className="hover:bg-muted/20 transition-colors">
              {insight.columns.map((col, j) => (
                <td key={col} className={cn(
                  "px-2.5 py-1.5",
                  j === 0 ? "text-foreground font-medium" : "text-muted-foreground tabular-nums"
                )}>
                  {typeof row[col] === "number"
                    ? Number(row[col]).toLocaleString()
                    : String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {insight.totalRowCount && insight.totalRowCount > 5 && (
        <div className="px-2.5 py-1.5 text-xs text-muted-foreground bg-muted/30 border-t border-border">
          Showing 5 of {insight.totalRowCount} rows
          {insight.downloadUrl && (
            <a
              href={insight.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-2 text-fleet-blue hover:underline font-medium"
            >
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
    <div className="bg-white rounded-xl border border-border p-4 space-y-3 shadow-[0_1px_3px_rgba(14,36,64,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3.5 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <Skeleton className="h-5 w-12 rounded-full shrink-0" />
      </div>
      <Skeleton className="h-[120px] w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
  );
}

export default function AceInsightCard({ insight }: AceInsightCardProps) {
  const hasChart =
    insight.rows.length > 1 &&
    insight.columns.slice(1).some((col) =>
      isNumericColumn(insight.rows.map((r) => r[col]))
    );

  return (
    <div className="bg-white rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(14,36,64,0.04)]">
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="flex-shrink-0 mt-0.5 rounded-lg bg-fleet-amber/10 p-2">
            <Brain className="h-3.5 w-3.5 text-fleet-amber" />
          </div>
          <p className="text-sm font-semibold text-foreground leading-snug">
            {insight.question}
          </p>
        </div>
        <Badge
          variant={insight.fromCache ? "cached" : "live"}
          className="shrink-0 gap-1 text-xs"
        >
          {insight.fromCache ? (
            <Loader2 className="h-2.5 w-2.5" />
          ) : (
            <Radio className="h-2.5 w-2.5" />
          )}
          {insight.fromCache ? "Cached" : "Live"}
        </Badge>
      </div>

      {hasChart && <InsightChart insight={insight} />}
      <InsightTable insight={insight} />

      {insight.reasoning && (
        <div className="mt-3 rounded-lg bg-fleet-amber/5 border border-fleet-amber/15 p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-fleet-amber">Ace says: </span>
            {insight.reasoning}
          </p>
        </div>
      )}
    </div>
  );
}
