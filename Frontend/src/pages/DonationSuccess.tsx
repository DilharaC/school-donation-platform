// DonationSuccess.tsx (MODERN) — premium UI + verify once (StrictMode safe)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API_BASE = "http://localhost:8000";

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

type StatusKey =
  | "checking"
  | "success"
  | "already_paid"
  | "pending"
  | "no_session"
  | "donation_not_found"
  | "error";

type Tone = "ok" | "warn" | "bad" | "neutral";

const statusUI: Record<
  StatusKey,
  {
    title: string;
    desc: string;
    tone: Tone;
  }
> = {
  checking: {
    title: "Verifying your payment…",
    desc: "Hang tight — we’re confirming your Stripe checkout.",
    tone: "neutral",
  },
  success: {
    title: "Donation confirmed 🎉",
    desc: "Thank you! Your donation has been verified successfully.",
    tone: "ok",
  },
  already_paid: {
    title: "Already verified ✅",
    desc: "This donation was confirmed earlier. Refreshing is safe.",
    tone: "ok",
  },
  pending: {
    title: "Still processing…",
    desc: "Stripe is finalizing the payment. Try again in a few seconds.",
    tone: "warn",
  },
  no_session: {
    title: "Session ID missing",
    desc: "We couldn’t find the Stripe session ID in your URL.",
    tone: "bad",
  },
  donation_not_found: {
    title: "No matching donation",
    desc: "We couldn’t match this session to a donation record.",
    tone: "bad",
  },
  error: {
    title: "Verification failed",
    desc: "We couldn’t verify this donation. Please try again.",
    tone: "bad",
  },
};

function toneStyles(tone: Tone) {
  if (tone === "ok") {
    return {
      ring: "ring-emerald-200/70",
      card: "border-emerald-200 bg-emerald-50/70",
      iconWrap: "bg-emerald-600 text-white",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
      glow: "shadow-[0_12px_40px_-20px_rgba(16,185,129,0.55)]",
      symbol: "✓",
    };
  }
  if (tone === "warn") {
    return {
      ring: "ring-amber-200/70",
      card: "border-amber-200 bg-amber-50/70",
      iconWrap: "bg-amber-600 text-white",
      badge: "bg-amber-100 text-amber-800 border-amber-200",
      glow: "shadow-[0_12px_40px_-20px_rgba(245,158,11,0.55)]",
      symbol: "!",
    };
  }
  if (tone === "bad") {
    return {
      ring: "ring-rose-200/70",
      card: "border-rose-200 bg-rose-50/70",
      iconWrap: "bg-rose-600 text-white",
      badge: "bg-rose-100 text-rose-800 border-rose-200",
      glow: "shadow-[0_12px_40px_-20px_rgba(244,63,94,0.55)]",
      symbol: "×",
    };
  }
  return {
    ring: "ring-slate-200/70",
    card: "border-slate-200 bg-slate-50/70",
    iconWrap: "bg-slate-800 text-white",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    glow: "shadow-[0_12px_40px_-20px_rgba(2,6,23,0.25)]",
    symbol: "…",
  };
}

const DonationSuccess: React.FC = () => {
  const [status, setStatus] = useState<StatusKey>("checking");
  const [details, setDetails] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // ✅ Prevent double verify in React StrictMode (dev)
  const ran = useRef(false);

  const sessionId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("session_id") || "";
  }, []);

  const verify = async () => {
    if (!sessionId) {
      setStatus("no_session");
      setLoading(false);
      return;
    }

    setLoading(true);
    setStatus("checking");
    setDetails("");

    try {
      const res = await axios.get(`${API_BASE}/api/donations/verify`, {
        withCredentials: true,
        params: { session_id: sessionId },
      });

      const s = (res.data?.status || "error") as StatusKey;
      setStatus(s);
      if (res.data?.message) setDetails(String(res.data.message));
    } catch (err: any) {
      const s = (err.response?.data?.status || "error") as StatusKey;
      setStatus(s);
      setDetails(err.response?.data?.message ? String(err.response.data.message) : "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ui = statusUI[status] ?? statusUI.error;
  const ts = toneStyles(ui.tone);

  return (
    <div className="min-h-[75vh]">
      {/* Background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-50 to-white" />
        <div className="absolute -top-28 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-slate-200/60 via-white to-slate-100 blur-3xl" />
        <div className="absolute -bottom-36 right-[-120px] h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-slate-100 via-white to-slate-200/40 blur-3xl" />

        <div className="relative max-w-2xl mx-auto px-4 py-12 sm:py-14">
          {/* Top header */}
          <div className="mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-700 shadow-sm backdrop-blur">
              <span className="inline-block h-2 w-2 rounded-full bg-slate-700" />
              Stripe verification
            </div>

            <div className="mt-4">
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                Donation status
              </div>
              <div className="mt-2 text-sm sm:text-base text-slate-500">
                We’ll confirm your payment and show the result here.
              </div>
            </div>
          </div>

          {/* Main card */}
          <div className={cx("rounded-[28px] border bg-white/80 shadow-sm backdrop-blur", ts.glow)}>
            {/* Card header row */}
            <div className="p-5 sm:p-7 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-slate-900 font-extrabold text-lg">Verification</div>
                  <div className="text-slate-500 text-sm">
                    {sessionId ? "Session detected — ready to verify." : "No session found in URL."}
                  </div>
                </div>

                <div
                  className={cx(
                    "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold",
                    sessionId ? ts.badge : "bg-slate-100 text-slate-700 border-slate-200"
                  )}
                >
                  <span className={cx("h-2 w-2 rounded-full", sessionId ? "bg-current" : "bg-slate-500")} />
                  {sessionId ? "SESSION FOUND" : "NO SESSION"}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-7">
              {/* Status panel */}
              <div
                className={cx(
                  "relative rounded-3xl border p-4 sm:p-5 ring-1",
                  ts.card,
                  ts.ring
                )}
              >
                {/* subtle top sheen */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 rounded-3xl bg-gradient-to-b from-white/40 to-transparent" />

                <div className="relative flex items-start gap-4">
                  <div className="shrink-0">
                    <div className={cx("h-12 w-12 rounded-2xl grid place-items-center font-black text-xl", ts.iconWrap)}>
                      {loading ? (
                        <span className="animate-pulse">…</span>
                      ) : (
                        <span>{ts.symbol}</span>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-slate-900 font-black text-lg leading-tight">{ui.title}</div>
                    <div className="mt-1 text-sm text-slate-700/80">{ui.desc}</div>

                    {/* loading shimmer bar */}
                    {loading && (
                      <div className="mt-4">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/70 border border-slate-200">
                          <div className="h-full w-1/2 animate-[progress_1.2s_ease-in-out_infinite] rounded-full bg-slate-900/20" />
                        </div>
                        <style>
                          {`@keyframes progress { 0%{ transform: translateX(-50%)} 50%{ transform: translateX(80%)} 100%{ transform: translateX(180%)} }`}
                        </style>
                      </div>
                    )}

                    {details && (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
                        <div className="text-[11px] font-extrabold tracking-wide text-slate-500 uppercase">
                          Details
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-800 break-words">
                          {details}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Session block */}
              {sessionId && (
                <div className="mt-4 rounded-3xl border border-slate-200 bg-white/70 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-extrabold tracking-wide text-slate-500 uppercase">
                        Session ID
                      </div>
                      <div className="mt-1 font-extrabold text-sm text-slate-900 break-words">
                        {sessionId}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(sessionId)}
                      className="shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 active:scale-[0.98]"
                      title="Copy session id"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={verify}
                  disabled={loading}
                  className={cx(
                    "w-full px-5 py-3 rounded-2xl font-extrabold text-white shadow-sm transition active:scale-[0.99]",
                    loading
                      ? "bg-slate-300 cursor-not-allowed"
                      : "bg-slate-900 hover:bg-slate-800"
                  )}
                >
                  {loading ? "Checking…" : "Re-check status"}
                </button>

                <Link
                  to="/projects"
                  className="w-full text-center px-5 py-3 rounded-2xl font-extrabold border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition active:scale-[0.99]"
                >
                  Back to projects
                </Link>
              </div>

              {/* Notes */}
              <div className="mt-4 text-xs text-slate-500">
                {status === "pending" ? (
                  <>
                    If it stays pending, wait a few seconds and click{" "}
                    <span className="font-extrabold text-slate-700">Re-check status</span>.
                  </>
                ) : (
                  <>
                    Refreshing this page is safe{" "}
                    <span className="font-semibold">if</span> your verify endpoint is idempotent.
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-slate-500">
            Need help? Contact support and include your Session ID.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationSuccess;