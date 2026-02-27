import { useMemo, useState } from "react";
import axios from "axios";
import ModalShell from "./ModalShell";

interface User {
  userType: "donor" | "school";
  donorName?: string;
  email?: string;
}

type Props = {
  open: boolean;
  onClose: () => void;
  requestId: number;
  currentUser: User | null;
};

const API_BASE = "http://localhost:8000";
const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

const clampLKR = (v: string) => v.replace(/[^\d]/g, ""); // numbers only

export default function DonateModal({ open, onClose, requestId, currentUser }: Props) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const donorOk = !!currentUser && currentUser.userType === "donor";

  const amountNum = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  // ✅ LKR minimum
  const MIN_LKR = 100;

  // ✅ canSubmit should match LKR minimum
  const canSubmit = donorOk && !loading && amountNum >= MIN_LKR;

  // ✅ LKR quick amounts
  const quick = [500, 1000, 2500, 5000, 10000];

  const submitDonation = async () => {
    setError("");

    if (!donorOk) {
      setError("Please login as a donor to donate.");
      return;
    }

    if (!amount || amountNum < MIN_LKR) {
      setError(`Minimum donation is LKR ${MIN_LKR}.`);
      return;
    }

    setLoading(true);
    try {
      await axios.get(`${API_BASE}/sanctum/csrf-cookie`, { withCredentials: true });

      const payload = {
        request_id: requestId,
        amount: amountNum, // ✅ LKR amount
        message: message?.trim() || null,
        recurring: "none",
        anonymous: anonymous ? 1 : 0,
        donor_name: anonymous ? "Anonymous" : currentUser?.donorName,
        donor_email: currentUser?.email || null,
      };

      const res = await axios.post(`${API_BASE}/api/donations/create`, payload, {
        withCredentials: true,
      });

      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        setError("No checkout URL returned.");
      }
    } catch (err: any) {
      if (err.response?.status === 401) setError("Unauthenticated. Please login again.");
      else if (err.response?.status === 422) {
        const msg =
          err.response?.data?.message ||
          (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(" ") : "") ||
          "Validation failed.";
        setError(msg);
      } else setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleLeft="Support a classroom"
      subtitleLeft="Secure donations • Verified schools • Transparent evidence"
      leftBullets={[
        "Verified schools & transparent evidence",
        "Track donations and receipts",
        "Help classrooms faster",
      ]}
      leftImageUrl="/images/login-kids.png"
      widthClassName="max-w-5xl"
    >
      <div className="space-y-5">
        <div>
          <div className="text-xl font-extrabold text-slate-900">Donate to this project</div>
          {/* ✅ fix USD text */}
          <div className="text-sm text-slate-500 mt-1">Use LKR. You’ll be redirected to Stripe checkout.</div>
        </div>

        {donorOk ? (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3">
            <div className="text-emerald-900 font-bold truncate">
              Logged in as {currentUser?.donorName || "Donor"}
            </div>
            <div className="text-emerald-800/70 text-xs truncate">{currentUser?.email}</div>
          </div>
        ) : (
          <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3">
            <div className="text-amber-900 font-bold">Please login as a donor</div>
            <div className="text-amber-800/70 text-xs">You can’t donate using a school account.</div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 text-sm">
            {error}
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-sm font-extrabold text-slate-900 mb-2">Amount (LKR)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-extrabold">
              LKR
            </span>

            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(clampLKR(e.target.value))}
              placeholder="e.g. 2500"
              className={cx(
                "w-full rounded-2xl border py-3 font-extrabold text-slate-900 outline-none",
                "pl-16 pr-4", // ✅ gives space after LKR
                "focus:ring-4 focus:ring-slate-200",
                amountNum > 0 && amountNum < MIN_LKR ? "border-rose-200" : "border-slate-200"
              )}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {quick.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setAmount(String(n))}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold text-sm hover:bg-slate-50"
              >
                LKR {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAmount("")}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-500 font-bold text-sm hover:bg-slate-50"
            >
              Clear
            </button>
          </div>

          {/* ✅ fix minimum label */}
          <div className="mt-2 text-xs text-slate-500">Minimum LKR {MIN_LKR}</div>
        </div>

        {/* Anonymous */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="min-w-0">
            <div className="text-slate-900 font-extrabold text-sm">Donate anonymously</div>
            <div className="text-slate-500 text-xs">Your name will be hidden in public lists.</div>
          </div>

          <button
            type="button"
            onClick={() => setAnonymous((v) => !v)}
            className={cx(
              "relative inline-flex h-8 w-14 items-center rounded-full transition",
              anonymous ? "bg-slate-900" : "bg-slate-300"
            )}
            aria-pressed={anonymous}
          >
            <span
              className={cx(
                "inline-block h-6 w-6 rounded-full bg-white transition translate-x-1",
                anonymous && "translate-x-7"
              )}
            />
          </button>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-extrabold text-slate-900 mb-2">Message (optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write a short message to the school…"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none min-h-[110px] focus:ring-4 focus:ring-slate-200"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-800 font-extrabold hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            onClick={submitDonation}
            disabled={!canSubmit}
            className={cx(
              "flex-1 px-5 py-3 rounded-2xl font-extrabold text-white",
              canSubmit ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-300 cursor-not-allowed"
            )}
          >
            {loading ? "Redirecting…" : "Continue to payment"}
          </button>
        </div>

        <div className="text-xs text-slate-500">
          Payments are handled by Stripe. If you cancel checkout, the donation stays pending.
        </div>
      </div>
    </ModalShell>
  );
}