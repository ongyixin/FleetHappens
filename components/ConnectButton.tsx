"use client";

/**
 * ConnectButton
 *
 * Fetches /api/geotab/auth on mount to determine whether the visitor is using
 * their own Geotab database (isDemo: false) or the demo account (isDemo: true).
 *
 * - Demo mode   → shows an amber "Connect your fleet" link to /connect
 * - Connected   → shows the database name + a subtle "Disconnect" button
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/types";

interface AuthStatus {
  database: string;
  server: string;
  isDemo: boolean;
}

export default function ConnectButton() {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetch("/api/geotab/auth")
      .then((r) => r.json())
      .then((data: ApiResponse<AuthStatus>) => {
        if (data.ok && data.data) setStatus(data.data);
      })
      .catch(() => {});
  }, []);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch("/api/geotab/connect", { method: "DELETE" });
      setStatus(null);
      router.refresh();
      // Full reload ensures all cached data is cleared
      window.location.reload();
    } finally {
      setDisconnecting(false);
    }
  }

  // While loading — render nothing to avoid layout shift
  if (!status) return null;

  // Connected to user's own database
  if (!status.isDemo) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-semibold text-emerald-400 font-body truncate max-w-[140px]">
            {status.database}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="text-[11px] font-medium text-white/35 hover:text-white/70 transition-colors font-body disabled:opacity-50"
          title="Disconnect your database"
        >
          {disconnecting ? "…" : "Disconnect"}
        </button>
      </div>
    );
  }

  // Demo mode — nudge them to connect
  return (
    <Link
      href="/connect"
      className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#f5a623]/70 hover:text-[#f5a623] transition-colors font-body"
    >
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5.5 3.5v4M3.5 5.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      Connect your fleet
    </Link>
  );
}
