"use client";

/**
 * ReportBuilderModal
 *
 * A slide-in side panel for composing and exporting a PDF report.
 * Receives available sections from the parent page (computed from live data).
 * Manages toggle state internally and posts the payload to /api/report/generate.
 */

import { useState, useCallback } from "react";
import {
  FileText,
  X,
  CheckSquare,
  Square,
  Download,
  Loader2,
  ChevronDown,
  ChevronRight,
  BarChart2,
  Table2,
  Brain,
  MapPin,
  Route,
  TrendingUp,
  AlignLeft,
  Activity,
  Layers,
  Hash,
  MessageSquare,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportSection, ReportSectionType, ReportPayload } from "@/types";
import type { SharePayload } from "@/types/integrations";

// ─── Section icon map ──────────────────────────────────────────────────────

const SECTION_ICON: Record<ReportSectionType, React.ReactNode> = {
  "kpi-strip":        <BarChart2   className="w-4 h-4" />,
  "fleet-cards":      <Layers      className="w-4 h-4" />,
  "vehicle-table":    <Table2      className="w-4 h-4" />,
  "ace-insight":      <Brain       className="w-4 h-4" />,
  "trip-stats":       <Activity    className="w-4 h-4" />,
  "trip-list":        <Route       className="w-4 h-4" />,
  "story-panels":     <FileText    className="w-4 h-4" />,
  "narrative":        <AlignLeft   className="w-4 h-4" />,
  "location-dossier": <MapPin      className="w-4 h-4" />,
  "trend-chart":      <TrendingUp  className="w-4 h-4" />,
};

// ─── Audience options ──────────────────────────────────────────────────────

const AUDIENCE_OPTIONS = [
  { value: "internal",    label: "Internal Use" },
  { value: "stakeholder", label: "Stakeholder Update" },
  { value: "client",      label: "Client-Facing" },
  { value: "driver",      label: "Driver / Trip Debrief" },
] as const;

// ─── Props ─────────────────────────────────────────────────────────────────

interface ReportBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Sections pre-populated by the parent page from its live data. */
  availableSections: ReportSection[];
  /** Pre-filled report title suggestion. */
  defaultTitle?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function ReportBuilderModal({
  isOpen,
  onClose,
  availableSections,
  defaultTitle = "FleetHappens Report",
}: ReportBuilderModalProps) {
  // Local toggle state for sections
  const [sections, setSections] = useState<ReportSection[]>(() =>
    availableSections.map((s) => ({ ...s }))
  );

  // Reset sections when modal opens with new props
  // (handled via key prop from parent or manual reset)

  const [title, setTitle]         = useState(defaultTitle);
  const [subtitle, setSubtitle]   = useState("");
  const [audience, setAudience]   = useState<string>("internal");
  const [notes, setNotes]         = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [sectionsExpanded, setSectionsExpanded] = useState(true);
  const [shareMessage, setShareMessage] = useState("");
  const [sharing, setSharing]           = useState<"slack" | "teams" | null>(null);
  const [shareStatus, setShareStatus]   = useState<{ ok: boolean; msg: string } | null>(null);

  const toggleSection = useCallback((id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  }, []);

  const toggleAll = useCallback((enable: boolean) => {
    setSections((prev) => prev.map((s) => ({ ...s, enabled: enable })));
  }, []);

  const enabledCount = sections.filter((s) => s.enabled).length;

  const handleGenerate = useCallback(async () => {
    if (!title.trim()) { setError("Please enter a report title."); return; }
    if (enabledCount === 0) { setError("Select at least one section to include."); return; }

    setError(null);
    setGenerating(true);

    const payload: ReportPayload = {
      metadata: {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        audience: (audience as ReportPayload["metadata"]["audience"]) || undefined,
        notes: notes.trim() || undefined,
        generatedAt: new Date().toISOString(),
      },
      sections,
    };

    try {
      const res = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
      const date = new Date().toISOString().slice(0, 10);
      a.href     = url;
      a.download = `fleethappens-report-${slug}-${date}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report.");
    } finally {
      setGenerating(false);
    }
  }, [title, subtitle, audience, notes, sections, enabledCount, onClose]);

  const buildSharePayload = useCallback((): SharePayload => {
    // Derive a source from section types present
    const sectionTypes = sections.filter((s) => s.enabled).map((s) => s.type);
    const source: SharePayload["source"] =
      sectionTypes.some((t) => t === "story-panels" || t === "narrative") ? "story"
      : sectionTypes.some((t) => t === "kpi-strip" || t === "fleet-cards" || t === "vehicle-table" || t === "trend-chart") ? "pulse"
      : "digest";

    // Build summary from subtitle or section labels
    const enabledLabels = sections.filter((s) => s.enabled).map((s) => s.label);
    const summary = subtitle.trim()
      ? subtitle.trim()
      : enabledLabels.length > 0
        ? `${enabledLabels.length} section${enabledLabels.length !== 1 ? "s" : ""}: ${enabledLabels.slice(0, 4).join(", ")}${enabledLabels.length > 4 ? "…" : ""}`
        : "FleetHappens report";

    // Extract metrics from a kpi-strip section if present
    const metrics: SharePayload["metrics"] = [];
    const kpiSection = sections.find((s) => s.enabled && s.type === "kpi-strip");
    if (kpiSection?.data) {
      const d = kpiSection.data as Record<string, unknown>;
      if (d.totalVehicles != null) metrics.push({ label: "Vehicles", value: String(d.totalVehicles) });
      if (d.activeVehicles != null) metrics.push({ label: "Active", value: String(d.activeVehicles) });
      if (d.totalDistanceKm != null) metrics.push({ label: "Distance", value: `${d.totalDistanceKm} km` });
      if (d.totalTrips != null) metrics.push({ label: "Trips", value: String(d.totalTrips) });
    }

    const reportPayload: ReportPayload = {
      metadata: {
        title: title.trim() || "FleetHappens Report",
        subtitle: subtitle.trim() || undefined,
        audience: (audience as ReportPayload["metadata"]["audience"]) || undefined,
        notes: notes.trim() || undefined,
        generatedAt: new Date().toISOString(),
      },
      sections,
    };

    return {
      title: title.trim() || "FleetHappens Report",
      summary,
      metrics,
      linkUrl: typeof window !== "undefined" ? window.location.href : "",
      source,
      userMessage: shareMessage.trim() || undefined,
      pdfContext: { type: "report" as const, payload: reportPayload },
    };
  }, [sections, title, subtitle, audience, notes, shareMessage]);

  const handleShareToSlack = useCallback(async () => {
    setSharing("slack");
    setShareStatus(null);
    try {
      const res = await fetch("/api/integrations/slack/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSharePayload()),
      });
      const json = await res.json() as { ok: boolean; data?: { message: string; mock?: boolean }; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Slack share failed");
      const msg = json.data?.mock
        ? "Shared (demo mode) — configure SLACK_WEBHOOK_URL to send for real"
        : json.data?.message ?? "Shared to Slack";
      setShareStatus({ ok: true, msg });
      setShareMessage("");
    } catch (err) {
      setShareStatus({ ok: false, msg: err instanceof Error ? err.message : "Could not share to Slack" });
    } finally {
      setSharing(null);
    }
  }, [buildSharePayload]);

  const handleShareToTeams = useCallback(async () => {
    setSharing("teams");
    setShareStatus(null);
    try {
      const res = await fetch("/api/integrations/teams/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSharePayload()),
      });
      const json = await res.json() as { ok: boolean; data?: { message: string; mock?: boolean }; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Teams share failed");
      const msg = json.data?.mock
        ? "Shared (demo mode) — configure TEAMS_WEBHOOK_URL to send for real"
        : json.data?.message ?? "Shared to Microsoft Teams";
      setShareStatus({ ok: true, msg });
      setShareMessage("");
    } catch (err) {
      setShareStatus({ ok: false, msg: err instanceof Error ? err.message : "Could not share to Teams" });
    } finally {
      setSharing(null);
    }
  }, [buildSharePayload]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Export Report"
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-[480px]",
          "bg-[#0d1117] border-l border-[rgba(255,255,255,0.08)]",
          "flex flex-col shadow-2xl",
          "animate-in slide-in-from-right duration-300"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.07)]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[rgba(245,166,35,0.15)] flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#f5a623]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e8edf8] font-heading">Export Report</h2>
              <p className="text-[11px] text-[rgba(232,237,248,0.4)] font-body">Generate a PDF from current page data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[rgba(232,237,248,0.4)] hover:text-[#e8edf8] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Metadata form */}
          <section>
            <label className="block text-[11px] font-medium text-[rgba(232,237,248,0.5)] uppercase tracking-wider mb-2 font-heading">
              Report Details
            </label>
            <div className="space-y-2.5">
              <div>
                <label htmlFor="rpt-title" className="block text-[11px] text-[rgba(232,237,248,0.5)] mb-1">Title *</label>
                <input
                  id="rpt-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Fleet Pulse Report"
                  className={cn(
                    "w-full bg-[#101318] border border-[rgba(255,255,255,0.08)] rounded-lg",
                    "px-3 py-2 text-sm text-[#e8edf8] font-body",
                    "focus:outline-none focus:border-[rgba(245,166,35,0.5)] focus:ring-1 focus:ring-[rgba(245,166,35,0.2)]",
                    "placeholder:text-[rgba(232,237,248,0.25)] transition-colors"
                  )}
                />
              </div>

              <div>
                <label htmlFor="rpt-subtitle" className="block text-[11px] text-[rgba(232,237,248,0.5)] mb-1">Subtitle</label>
                <input
                  id="rpt-subtitle"
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Weekly summary for operations team"
                  className={cn(
                    "w-full bg-[#101318] border border-[rgba(255,255,255,0.08)] rounded-lg",
                    "px-3 py-2 text-sm text-[#e8edf8] font-body",
                    "focus:outline-none focus:border-[rgba(245,166,35,0.5)] focus:ring-1 focus:ring-[rgba(245,166,35,0.2)]",
                    "placeholder:text-[rgba(232,237,248,0.25)] transition-colors"
                  )}
                />
              </div>

              <div>
                <label htmlFor="rpt-audience" className="block text-[11px] text-[rgba(232,237,248,0.5)] mb-1">Audience</label>
                <div className="relative">
                  <select
                    id="rpt-audience"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className={cn(
                      "w-full appearance-none bg-[#101318] border border-[rgba(255,255,255,0.08)] rounded-lg",
                      "px-3 py-2 pr-8 text-sm text-[#e8edf8] font-body",
                      "focus:outline-none focus:border-[rgba(245,166,35,0.5)] focus:ring-1 focus:ring-[rgba(245,166,35,0.2)]",
                      "transition-colors cursor-pointer"
                    )}
                  >
                    {AUDIENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#101318]">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgba(232,237,248,0.3)] pointer-events-none" />
                </div>
              </div>

              <div>
                <label htmlFor="rpt-notes" className="block text-[11px] text-[rgba(232,237,248,0.5)] mb-1">Notes</label>
                <textarea
                  id="rpt-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional context or instructions for the reader…"
                  rows={3}
                  className={cn(
                    "w-full bg-[#101318] border border-[rgba(255,255,255,0.08)] rounded-lg resize-none",
                    "px-3 py-2 text-sm text-[#e8edf8] font-body",
                    "focus:outline-none focus:border-[rgba(245,166,35,0.5)] focus:ring-1 focus:ring-[rgba(245,166,35,0.2)]",
                    "placeholder:text-[rgba(232,237,248,0.25)] transition-colors"
                  )}
                />
              </div>
            </div>
          </section>

          {/* Section picker */}
          <section>
            <button
              onClick={() => setSectionsExpanded((v) => !v)}
              className="flex items-center justify-between w-full mb-2 group"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-[rgba(232,237,248,0.5)] uppercase tracking-wider font-heading">
                  Sections to Include
                </span>
                <span className="text-[10px] bg-[rgba(245,166,35,0.15)] text-[#f5a623] rounded-full px-1.5 py-0.5 font-mono">
                  {enabledCount}/{sections.length}
                </span>
              </div>
              {sectionsExpanded
                ? <ChevronDown className="w-3.5 h-3.5 text-[rgba(232,237,248,0.3)]" />
                : <ChevronRight className="w-3.5 h-3.5 text-[rgba(232,237,248,0.3)]" />
              }
            </button>

            {sectionsExpanded && (
              <>
                {/* Select all / none */}
                <div className="flex gap-2 mb-2.5">
                  <button
                    onClick={() => toggleAll(true)}
                    className="text-[11px] text-[rgba(232,237,248,0.4)] hover:text-[#f5a623] transition-colors"
                  >
                    Select all
                  </button>
                  <span className="text-[rgba(232,237,248,0.2)]">·</span>
                  <button
                    onClick={() => toggleAll(false)}
                    className="text-[11px] text-[rgba(232,237,248,0.4)] hover:text-[rgba(232,237,248,0.7)] transition-colors"
                  >
                    Clear all
                  </button>
                </div>

                <div className="space-y-1.5">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => toggleSection(section.id)}
                      className={cn(
                        "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                        "border",
                        section.enabled
                          ? "bg-[rgba(245,166,35,0.06)] border-[rgba(245,166,35,0.2)] hover:bg-[rgba(245,166,35,0.09)]"
                          : "bg-[#101318] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)]"
                      )}
                    >
                      {/* Checkbox icon */}
                      <div className="mt-0.5 flex-shrink-0">
                        {section.enabled
                          ? <CheckSquare className="w-4 h-4 text-[#f5a623]" />
                          : <Square className="w-4 h-4 text-[rgba(232,237,248,0.25)]" />
                        }
                      </div>

                      {/* Section icon */}
                      <div className={cn(
                        "mt-0.5 flex-shrink-0 transition-colors",
                        section.enabled ? "text-[rgba(245,166,35,0.7)]" : "text-[rgba(232,237,248,0.25)]"
                      )}>
                        {SECTION_ICON[section.type]}
                      </div>

                      {/* Label + description */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium font-body leading-tight transition-colors",
                          section.enabled ? "text-[#e8edf8]" : "text-[rgba(232,237,248,0.45)]"
                        )}>
                          {section.label}
                        </p>
                        <p className="text-[11px] text-[rgba(232,237,248,0.3)] mt-0.5 leading-tight">
                          {section.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {sections.length === 0 && (
                  <p className="text-[12px] text-[rgba(232,237,248,0.3)] text-center py-6 font-body">
                    No data available for export on this page yet.
                    <br />Load some data first, then return here.
                  </p>
                )}
              </>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.07)] space-y-3">
          {error && (
            <p className="text-[12px] text-red-400 font-body bg-[rgba(239,68,68,0.08)] rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className={cn(
                "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium font-body transition-colors",
                "bg-[rgba(255,255,255,0.05)] text-[rgba(232,237,248,0.6)]",
                "hover:bg-[rgba(255,255,255,0.08)] hover:text-[#e8edf8]",
                "border border-[rgba(255,255,255,0.07)]"
              )}
              disabled={generating}
            >
              Cancel
            </button>

            <button
              onClick={handleGenerate}
              disabled={generating || enabledCount === 0}
              className={cn(
                "flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold font-body transition-all",
                "bg-[#f5a623] text-[#0d1117]",
                "hover:bg-[#e09520] active:scale-[0.98]",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#f5a623]",
                "shadow-[0_0_20px_rgba(245,166,35,0.25)]"
              )}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating PDF…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generate PDF
                </>
              )}
            </button>
          </div>

          <p className="text-[10px] text-[rgba(232,237,248,0.2)] text-center font-body">
            {enabledCount} section{enabledCount !== 1 ? "s" : ""} selected · PDF downloads immediately
          </p>

          {/* Share to Slack / Teams */}
          <div className="pt-3 border-t border-[rgba(255,255,255,0.07)] space-y-2.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[rgba(232,237,248,0.3)] font-body">
              Send to
            </span>

            <textarea
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              placeholder="Add a message for your team…"
              rows={2}
              maxLength={500}
              className={cn(
                "w-full bg-[#101318] border border-[rgba(255,255,255,0.08)] rounded-lg resize-none",
                "px-3 py-2 text-sm text-[#e8edf8] font-body",
                "focus:outline-none focus:border-[rgba(245,166,35,0.5)] focus:ring-1 focus:ring-[rgba(245,166,35,0.2)]",
                "placeholder:text-[rgba(232,237,248,0.2)] transition-colors"
              )}
            />

            <div className="flex gap-2">
              <button
                onClick={handleShareToSlack}
                disabled={sharing !== null || enabledCount === 0}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium font-body transition-all",
                  "bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.2)] text-[#a78bfa]",
                  "hover:bg-[rgba(124,58,237,0.18)] hover:border-[rgba(124,58,237,0.35)]",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {sharing === "slack" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Hash className="w-3.5 h-3.5" />
                )}
                Slack
              </button>

              <button
                onClick={handleShareToTeams}
                disabled={sharing !== null || enabledCount === 0}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium font-body transition-all",
                  "bg-[rgba(37,99,235,0.1)] border border-[rgba(37,99,235,0.2)] text-[#60a5fa]",
                  "hover:bg-[rgba(37,99,235,0.18)] hover:border-[rgba(37,99,235,0.35)]",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {sharing === "teams" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <MessageSquare className="w-3.5 h-3.5" />
                )}
                Teams
              </button>
            </div>

            {shareStatus && (
              <p className={cn(
                "text-[11px] font-body rounded-lg px-3 py-2 flex items-center gap-1.5",
                shareStatus.ok
                  ? "bg-[rgba(52,211,153,0.08)] text-[#34d399] border border-[rgba(52,211,153,0.15)]"
                  : "bg-[rgba(239,68,68,0.08)] text-red-400 border border-[rgba(239,68,68,0.15)]"
              )}>
                {shareStatus.ok && <Check className="w-3 h-3 shrink-0" />}
                {shareStatus.msg}
              </p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
