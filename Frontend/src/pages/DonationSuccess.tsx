// DonationSuccess.tsx (BEST) — nice UI + only calls verify ONCE (fixes double increment in dev StrictMode)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API_BASE = "http://localhost:8000";

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

type StatusKey = "checking" | "success" | "already_paid" | "pending" | "no_session" | "donation_not_found" | "error";

const statusUI: Record<
  StatusKey,
  {
    title: string;
    desc: string;
    tone: "ok" | "warn" | "bad" | "neutral";
  }
> = {
  checking: {
    title: "Checking payment…",
    desc: "Please wait a moment while we confirm your donation.",
    tone: "neutral",
  },
  success: {
    title: "Donation successful 🎉",
    desc: "Thank you! Your donation has been confirmed.",
    tone: "ok",
  },
  already_paid: {
    title: "Already confirmed ✅",
    desc: "This donation was already verified. (Refresh is safe.)",
    tone: "ok",
  },
  pending: {
    title: "Payment pending…",
    desc: "Stripe is still processing. Try again in a few seconds.",
    tone: "warn",
  },
  no_session: {
    title: "Missing session ID",
    desc: "We couldn’t find the Stripe session ID in the URL.",
    tone: "bad",
  },
  donation_not_found: {
    title: "Donation not found",
    desc: "We couldn’t match this session to a donation record.",
    tone: "bad",
  },
  error: {
    title: "Something went wrong",
    desc: "We couldn’t verify the donation. Please try again.",
    tone: "bad",
  },
};

const DonationSuccess: React.FC = () => {
  const [status, setStatus] = useState<StatusKey>("checking");
  const [details, setDetails] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // ✅ Prevent double calling verify in React StrictMode (dev)
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
    if (ran.current) return; // ✅ important
    ran.current = true;
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ui = statusUI[status] ?? statusUI.error;

  const toneClasses =
    ui.tone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : ui.tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : ui.tone === "bad"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : "border-slate-200 bg-slate-50 text-slate-900";

  return (
    <div className="min-h-[70vh] bg-slate-50">
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-slate-900 font-extrabold text-2xl">Donation status</div>
                <div className="text-slate-500 text-sm mt-1">Stripe checkout verification</div>
              </div>

              <div className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                {sessionId ? "SESSION FOUND" : "NO SESSION"}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className={cx("rounded-2xl border px-4 py-4", toneClasses)}>
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  <div
                    className={cx(
                      "h-10 w-10 rounded-2xl grid place-items-center font-black",
                      ui.tone === "ok"
                        ? "bg-emerald-600 text-white"
                        : ui.tone === "warn"
                        ? "bg-amber-600 text-white"
                        : ui.tone === "bad"
                        ? "bg-rose-600 text-white"
                        : "bg-slate-700 text-white"
                    )}
                  >
                    {ui.tone === "ok" ? "✓" : ui.tone === "warn" ? "!" : ui.tone === "bad" ? "×" : "…"}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="font-extrabold text-lg leading-tight">{ui.title}</div>
                  <div className="text-sm opacity-80 mt-1">{ui.desc}</div>

                  {details && (
                    <div className="mt-3 text-xs font-semibold opacity-70 break-words">
                      Details: {details}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Session display */}
            {sessionId && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs text-slate-500 font-bold">Session ID</div>
                <div className="text-slate-900 font-extrabold text-sm break-words">{sessionId}</div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={verify}
                disabled={loading}
                className={cx(
                  "w-full sm:w-auto px-5 py-3 rounded-2xl font-extrabold text-white",
                  loading ? "bg-slate-300 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800"
                )}
              >
                {loading ? "Checking…" : "Re-check status"}
              </button>

              <Link
                to="/projects"
                className="w-full sm:w-auto text-center px-5 py-3 rounded-2xl font-extrabold border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
              >
                Back to projects
              </Link>
            </div>

            {/* Helper notes */}
            {status === "pending" && (
              <div className="mt-4 text-xs text-slate-500">
                If it stays pending, wait a few seconds and click <b>Re-check status</b>.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-slate-500">
          Refreshing this page is safe if your backend verify endpoint is idempotent.
        </div>
      </div>
    </div>
  );
};

export default DonationSuccess;