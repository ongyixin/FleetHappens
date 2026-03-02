"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ApiResponse } from "@/types";

export default function ConnectPage() {
  const router = useRouter();
  const [database, setDatabase] = useState("");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dbRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dbRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/geotab/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          database: database.trim(),
          userName: userName.trim(),
          password,
          server: server.trim() || undefined,
        }),
      });

      const data = (await res.json()) as ApiResponse<{ database: string; server: string }>;

      if (data.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error ?? "Connection failed. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090e] flex flex-col overflow-hidden">
      {/* Background atmosphere */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 atlas-grid-bg opacity-40" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(245,166,35,0.07)_0%,transparent_65%)]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[400px] bg-[radial-gradient(ellipse_at_bottom_left,rgba(56,189,248,0.04)_0%,transparent_60%)]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-[#f5a623] flex items-center justify-center shadow-[0_2px_8px_rgba(245,166,35,0.4)] group-hover:shadow-[0_2px_14px_rgba(245,166,35,0.55)] transition-shadow">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7 C2 4 4 2 7 2 S12 4 12 7 L7 12 L2 7Z" fill="#09090e" />
              </svg>
            </div>
            <span className="font-display font-bold text-white tracking-tight text-sm">
              FleetHappens
            </span>
          </Link>
          <Link
            href="/"
            className="text-[13px] text-white/40 hover:text-white/70 transition-colors"
          >
            ← Back to demo
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-[420px]">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#f5a623]/10 border border-[#f5a623]/20 mb-5">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M11 2C6.03 2 2 6.03 2 11s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 4a3 3 0 110 6 3 3 0 010-6zm0 12.5a7.5 7.5 0 01-5.25-2.14C6.87 15.07 8.83 14 11 14s4.13 1.07 5.25 2.36A7.5 7.5 0 0111 18.5z"
                  fill="#f5a623"
                  opacity=".9"
                />
              </svg>
            </div>
            <h1 className="font-display font-bold text-2xl text-white tracking-tight mb-2">
              Connect your fleet
            </h1>
            <p className="text-[13.5px] text-white/50 leading-relaxed max-w-xs mx-auto">
              Enter your MyGeotab credentials to explore FleetHappens with your own live vehicle data.
            </p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#101318] p-7 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Database */}
              <div>
                <label
                  htmlFor="database"
                  className="block text-sm font-medium text-white/55 mb-1.5 tracking-wide uppercase"
                >
                  Database name
                </label>
                <input
                  ref={dbRef}
                  id="database"
                  type="text"
                  autoComplete="organization"
                  required
                  placeholder="e.g. my_company"
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  className="w-full h-10 rounded-lg bg-white/[0.05] border border-white/[0.09] text-white text-[14px] px-3.5 placeholder:text-white/20 focus:outline-none focus:border-[#f5a623]/50 focus:bg-white/[0.07] transition-all"
                />
              </div>

              {/* Username */}
              <div>
                <label
                  htmlFor="userName"
                  className="block text-sm font-medium text-white/55 mb-1.5 tracking-wide uppercase"
                >
                  Username (email)
                </label>
                <input
                  id="userName"
                  type="email"
                  autoComplete="username"
                  required
                  placeholder="you@company.com"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full h-10 rounded-lg bg-white/[0.05] border border-white/[0.09] text-white text-[14px] px-3.5 placeholder:text-white/20 focus:outline-none focus:border-[#f5a623]/50 focus:bg-white/[0.07] transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-white/55 mb-1.5 tracking-wide uppercase"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 rounded-lg bg-white/[0.05] border border-white/[0.09] text-white text-[14px] px-3.5 placeholder:text-white/20 focus:outline-none focus:border-[#f5a623]/50 focus:bg-white/[0.07] transition-all"
                />
              </div>

              {/* Advanced (server) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="text-sm text-white/35 hover:text-white/60 transition-colors flex items-center gap-1.5"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                  >
                    <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Advanced options
                </button>

                {showAdvanced && (
                  <div className="mt-3">
                    <label
                      htmlFor="server"
                      className="block text-sm font-medium text-white/55 mb-1.5 tracking-wide uppercase"
                    >
                      Server <span className="text-white/25 normal-case font-normal">(default: my.geotab.com)</span>
                    </label>
                    <input
                      id="server"
                      type="text"
                      placeholder="my.geotab.com"
                      value={server}
                      onChange={(e) => setServer(e.target.value)}
                      className="w-full h-10 rounded-lg bg-white/[0.05] border border-white/[0.09] text-white text-[14px] px-3.5 placeholder:text-white/20 focus:outline-none focus:border-[#f5a623]/50 focus:bg-white/[0.07] transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-[13px] text-red-400 leading-relaxed">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !database || !userName || !password}
                className="w-full h-10 rounded-lg bg-[#f5a623] text-[#09090e] font-semibold text-[14px] tracking-tight shadow-[0_2px_12px_rgba(245,166,35,0.35)] hover:bg-[#f9b93a] hover:shadow-[0_2px_18px_rgba(245,166,35,0.5)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
                    </svg>
                    Connecting…
                  </span>
                ) : (
                  "Connect to MyGeotab"
                )}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <p className="mt-5 text-center text-sm text-white/30 leading-relaxed">
            Your credentials are used only to authenticate with Geotab&apos;s API.
            <br />
            They are never stored — only the session token is saved in an encrypted cookie.
          </p>

          {/* Demo link */}
          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-[13px] text-[#f5a623]/60 hover:text-[#f5a623] transition-colors"
            >
              Continue with demo data instead →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
