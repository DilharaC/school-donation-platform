import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import ModalShell from "./ModalShell";

const API_BASE = "http://localhost:8000";
type StatusKey = "checking" | "success" | "already_paid" | "pending" | "no_session" | "donation_not_found" | "error";

export default function DonationSuccessModal({
  open,
  onClose,
  sessionId,
}: {
  open: boolean;
  onClose: () => void;
  sessionId: string;
}) {
  const [status, setStatus] = useState<StatusKey>("checking");
  const [loading, setLoading] = useState(true);

  // ✅ prevents double verify in dev StrictMode
  const ran = useRef(false);

  const verify = async () => {
    if (!sessionId) {
      setStatus("no_session");
      setLoading(false);
      return;
    }
    setLoading(true);
    setStatus("checking");

    try {
      const res = await axios.get(`${API_BASE}/api/donations/verify`, {
        withCredentials: true,
        params: { session_id: sessionId },
      });
      setStatus((res.data?.status || "error") as StatusKey);
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (ran.current) return;
    ran.current = true;
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const ui =
    status === "success" || status === "already_paid"
      ? { title: "Donation successful 🎉", desc: "Thank you! Your donation has been confirmed.", tone: "ok" as const }
      : status === "pending" || status === "checking"
      ? { title: "Checking payment…", desc: "Please wait while we confirm with Stripe.", tone: "warn" as const }
      : status === "no_session"
      ? { title: "Missing session ID", desc: "We couldn’t find the session in the URL.", tone: "bad" as const }
      : status === "donation_not_found"
      ? { title: "Donation not found", desc: "We couldn’t match this session to a donation record.", tone: "bad" as const }
      : { title: "Something went wrong", desc: "Please try again.", tone: "bad" as const };

  const toneBox =
    ui.tone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : ui.tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-rose-200 bg-rose-50 text-rose-900";

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleLeft="Payment complete"
      subtitleLeft="Transparent donations • Verified schools"
      leftBullets={["Receipt-ready donations", "Projects update progress instantly", "Thank you for supporting schools"]}
      leftImageUrl="/images/thanks.jpg"
      widthClassName="max-w-5xl"
    >
      <div className="space-y-5">
        <div>
          <div className="text-xl font-extrabold text-slate-900">Donation status</div>
          <div className="text-sm text-slate-500 mt-1">Stripe checkout verification</div>
        </div>

        <div className={`rounded-2xl border px-4 py-4 ${toneBox}`}>
          <div className="font-extrabold text-lg">{ui.title}</div>
          <div className="text-sm opacity-80 mt-1">{ui.desc}</div>
        </div>

        {sessionId && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs text-slate-500 font-bold">Session ID</div>
            <div className="text-slate-900 font-extrabold text-sm break-words">{sessionId}</div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={verify}
            disabled={loading}
            className={`px-5 py-3 rounded-2xl font-extrabold text-white ${
              loading ? "bg-slate-300 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800"
            }`}
          >
            {loading ? "Checking…" : "Re-check status"}
          </button>

          <button
            onClick={onClose}
            className="px-5 py-3 rounded-2xl font-extrabold border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="text-xs text-slate-500">
          Refreshing is safe only if your backend verify endpoint is idempotent.
        </div>
      </div>
    </ModalShell>
  );
}