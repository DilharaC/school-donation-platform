// DonationForm.tsx (UPGRADED UI) — clean card, quick amounts, anonymous toggle, better validation
import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

interface User {
  userType: "donor" | "school";
  donorName?: string;
  email?: string;
}

interface DonationFormProps {
  currentUser: User | null;
}

const API_BASE = "http://localhost:8000";

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

const clampMoney = (v: string) => {
  // keep only digits + dot, allow 2 decimals
  const cleaned = v.replace(/[^\d.]/g, "");
  const [a, b] = cleaned.split(".");
  if (!a) return cleaned.startsWith(".") ? "0." : "";
  if (b === undefined) return a;
  return `${a}.${b.slice(0, 2)}`;
};

const DonationForm: React.FC<DonationFormProps> = ({ currentUser }) => {
  const { requestId } = useParams<{ requestId: string }>();

  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const [error, setError] = useState<string>("");
  const [ok, setOk] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const donorOk = !!currentUser && currentUser.userType === "donor";
  const rid = useMemo(() => (requestId ? parseInt(requestId, 10) : NaN), [requestId]);

  const amountNum = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const canSubmit = donorOk && !loading && Number.isFinite(rid) && rid > 0 && amountNum >= 1;

  if (!requestId) return <p className="text-slate-600">Invalid project ID.</p>;

  const submitDonation = async () => {
    setError("");
    setOk("");

    // Only donors can donate
    if (!donorOk) {
      setError("Please login as a donor to donate.");
      return;
    }

    if (!amount || amountNum < 1) {
      setError("Minimum donation is $1.");
      return;
    }

    setLoading(true);

    try {
      await axios.get(`${API_BASE}/sanctum/csrf-cookie`, { withCredentials: true });

      const payload = {
        request_id: rid,
        amount: amountNum,
        message: message?.trim() || null,
        recurring: "none",
        anonymous: anonymous ? 1 : 0,
        // backend already reads Auth::user(), but we keep these harmless fields if you want
        donor_name: anonymous ? "Anonymous" : currentUser?.donorName,
        donor_email: currentUser?.email || null,
      };

      const res = await axios.post(`${API_BASE}/api/donations/create`, payload, {
        withCredentials: true,
      });

      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        setOk("Donation created, but no checkout URL returned.");
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Unauthenticated. Please login again.");
      } else if (err.response?.status === 422) {
        const msg =
          err.response?.data?.message ||
          (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(" ") : "") ||
          "Validation failed.";
        setError(msg);
      } else {
        setError(err.response?.data?.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const quick = [5, 10, 25, 50, 100];

  return (
    <div className="min-h-[70vh] bg-slate-50">
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 sm:p-7 border-b border-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-slate-900 font-extrabold text-xl leading-tight">Donate to this project</div>
                <div className="text-slate-500 text-sm mt-1">
                  Secure checkout via Stripe • You can add an optional message.
                </div>
              </div>

              <div className="shrink-0">
                <div className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                  Request #{requestId}
                </div>
              </div>
            </div>

            {/* Logged in pill */}
            <div className="mt-4">
              {donorOk ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-emerald-900 font-bold truncate">
                      Logged in as {currentUser?.donorName || "Donor"}
                    </div>
                    <div className="text-emerald-800/70 text-xs truncate">{currentUser?.email}</div>
                  </div>
                  <div className="text-emerald-900 font-black text-xs">READY</div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-amber-900 font-bold">Please login as a donor</div>
                    <div className="text-amber-800/70 text-xs">You can’t donate using a school account.</div>
                  </div>
                  <Link
                    to="/login"
                    className="shrink-0 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
                  >
                    Login
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="p-6 sm:p-7">
            {/* Alerts */}
            {error && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 text-sm">
                {error}
              </div>
            )}
            {ok && (
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 text-sm">
                {ok}
              </div>
            )}

            {/* Amount */}
            <label className="block text-sm font-extrabold text-slate-900 mb-2">Amount (USD)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(clampMoney(e.target.value))}
                placeholder="e.g. 25"
                className={cx(
                  "w-full rounded-2xl border px-10 py-3 font-extrabold text-slate-900 outline-none",
                  "focus:ring-4 focus:ring-slate-200",
                  amountNum > 0 && amountNum < 1 ? "border-rose-200" : "border-slate-200"
                )}
              />
              <div className="mt-2 text-xs text-slate-500">
                Minimum $1 • You’ll be redirected to Stripe checkout.
              </div>
            </div>

            {/* Quick chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {quick.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAmount(String(n))}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold text-sm hover:bg-slate-50"
                >
                  ${n}
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

            {/* Anonymous toggle */}
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
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
            <label className="block text-sm font-extrabold text-slate-900 mt-6 mb-2">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a short message to the school…"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none min-h-[110px]
                         focus:ring-4 focus:ring-slate-200"
            />

            {/* Footer */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <Link
                to={`/projects`}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold hover:bg-slate-50"
              >
                Back
              </Link>

              <button
                onClick={submitDonation}
                disabled={!canSubmit}
                className={cx(
                  "px-5 py-3 rounded-2xl font-extrabold text-white w-full sm:w-auto",
                  canSubmit ? "bg-slate-900 hover:bg-slate-800" : "bg-slate-300 cursor-not-allowed"
                )}
              >
                {loading ? "Processing…" : "Donate securely"}
              </button>
            </div>

            {!donorOk && (
              <div className="mt-4 text-xs text-slate-500">
                Tip: If you’re logged in as a school, logout and login with a donor account.
              </div>
            )}
          </div>
        </div>

        {/* small helper card */}
        <div className="mt-4 text-center text-xs text-slate-500">
          Payments are handled by Stripe. If checkout opens and you cancel, the donation stays <b>pending</b>.
        </div>
      </div>
    </div>
  );
};

export default DonationForm;