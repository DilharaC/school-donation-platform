// DonorSchools.tsx (FULL) — UPDATED to use total_received everywhere (NO fund_balance in UI)
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import DonateModal from "../../components/DonateModal";
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckBadgeIcon,
  ShieldCheckIcon,
  MapPinIcon,
  BuildingOffice2Icon,
  AdjustmentsHorizontalIcon,
  ArrowsUpDownIcon,
  FunnelIcon,
  HeartIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/solid";

/** ---------------- API ---------------- */
const API_ROOT = "http://localhost:8000";
const API_BASE = `${API_ROOT}/api`;

const SCHOOLS_LIST = `${API_BASE}/schools`;
const SCHOOL_DETAIL = (id: number) => `${API_BASE}/schools/${id}`;
const DONATE_TO_SCHOOL = (schoolId: number) => `${API_BASE}/donor/schools/${schoolId}/donate`;
const VERIFY_DONATION = `${API_BASE}/donations/verify`;

/** ---------------- UI Helpers ---------------- */
const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");
const formatLKR = (n: number) => `LKR ${Number.isFinite(n) ? n.toLocaleString() : "0"}`;

const toAbs = (u?: string | null) => {
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${API_ROOT}${u.startsWith("/") ? "" : "/"}${u}`;
};

const initials = (name?: string | null) => {
  const n = (name || "School").trim();
  const parts = n.split(/\s+/);
  const a = parts[0]?.[0] || "S";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
};

const needLevel = (score?: number | null) => {
  const v = Number(score);
  if (!Number.isFinite(v)) return "Unknown";
  if (v >= 70) return "High";
  if (v >= 40) return "Medium";
  return "Low";
};

const needTone = (level: string) => {
  if (level === "High") return "bg-rose-50 text-rose-700 border-rose-200";
  if (level === "Medium") return "bg-amber-50 text-amber-800 border-amber-200";
  if (level === "Low") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

function Pill({
  children,
  cls,
  icon,
}: {
  children: React.ReactNode;
  cls: string;
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border",
        cls
      )}
    >
      {icon ? <span className="h-3.5 w-3.5">{icon}</span> : null}
      {children}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full bg-slate-900" style={{ width: `${v}%` }} />
    </div>
  );
}

function percent(raised: number, goal: number) {
  const g = Number(goal) || 0;
  if (g <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(raised) / g) * 100)));
}

/** ---------------- Types ---------------- */
type SchoolRow = {
  school_id: number;
  school_name: string;
  district?: string | null;
  province?: string | null;
  address?: string | null;

  status?: string | null;
  verified?: number;
  need_score?: number;

  campaigns_count?: number;
  donations_count?: number;
  last_donation_at?: string | null;

  initials?: string;
  logo_url?: string | null;

  // ✅ Use this for "Received / Total received" everywhere
  total_received?: number;
};

type SchoolDetailRes = {
  school: SchoolRow;
  campaigns: Array<{
    request_id: number;
    request_title: string;
    category?: string | null;
    amount_raised?: number | null;
    estimated_price?: number | null;
    status?: string | null;
    created_at?: string | null;
  }>;
  donation_summary: {
    total_received?: number;
    donations_count?: number;
    last_donation_at?: string | null;
  };
};

/** ---------------- Donation Success Modal ---------------- */
type StatusKey =
  | "checking"
  | "success"
  | "already_paid"
  | "pending"
  | "no_session"
  | "donation_not_found"
  | "error";

const statusUI: Record<
  StatusKey,
  { title: string; desc: string; tone: "ok" | "warn" | "bad" | "neutral" }
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

function DonationSuccessModal({
  open,
  sessionId,
  status,
  details,
  loading,
  onRecheck,
  onClose,
}: {
  open: boolean;
  sessionId: string;
  status: StatusKey;
  details: string;
  loading: boolean;
  onRecheck: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

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
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
          <div className="p-6 sm:p-7 border-b border-slate-100 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-slate-900 font-extrabold text-xl">Donation status</div>
              <div className="text-slate-500 text-sm mt-1">Stripe checkout verification</div>
            </div>
            <button
              onClick={onClose}
              className="rounded-2xl px-3 py-2 text-sm font-extrabold border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-2"
            >
              <XMarkIcon className="h-5 w-5" />
              Close
            </button>
          </div>

          <div className="p-6 sm:p-7">
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

                  {details ? (
                    <div className="mt-3 text-xs font-semibold opacity-70 break-words">Details: {details}</div>
                  ) : null}
                </div>
              </div>
            </div>

            {sessionId ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs text-slate-500 font-bold">Session ID</div>
                <div className="text-slate-900 font-extrabold text-sm break-words">{sessionId}</div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={onRecheck}
                disabled={loading}
                className={cx(
                  "w-full sm:w-auto px-5 py-3 rounded-2xl font-extrabold text-white",
                  loading ? "bg-slate-300 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800"
                )}
              >
                {loading ? "Checking…" : "Re-check status"}
              </button>

              <button
                onClick={onClose}
                className="w-full sm:w-auto text-center px-5 py-3 rounded-2xl font-extrabold border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
              >
                Continue
              </button>
            </div>

            {status === "pending" ? (
              <div className="mt-4 text-xs text-slate-500">
                If it stays pending, wait a few seconds and click <b>Re-check status</b>.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------------- Component ---------------- */
export default function DonorSchools() {
  /** --------- Filters --------- */
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState<"all" | string>("all");
  const [district, setDistrict] = useState<"all" | string>("all");
  const [status, setStatus] = useState<"all" | "Active" | "Inactive">("Active");
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "verified" | "not_verified">("verified");
  const [needBand, setNeedBand] = useState<"all" | "high" | "medium" | "low">("all");

  const [sortBy, setSortBy] = useState<
    "created_at" | "need_score" | "total_received" | "school_name" | "donations_count" | "last_donation_at"
  >("need_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [page, setPage] = useState(1);
  const limit = 10;

  /** --------- List state --------- */
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SchoolRow[]>([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  /** --------- Drawer state --------- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<SchoolDetailRes | null>(null);
  const [selected, setSelected] = useState<SchoolRow | null>(null);

  /** --------- Donate to School state --------- */
  const [donateAmount, setDonateAmount] = useState("");
  const [donateMessage, setDonateMessage] = useState("");
  const [donateAnonymous, setDonateAnonymous] = useState(false);
  const [donateLoading, setDonateLoading] = useState(false);
  const [donateError, setDonateError] = useState<string | null>(null);

  const MIN_LKR = 100;

  const donateAmountNum = useMemo(() => {
    const n = Number(donateAmount);
    return Number.isFinite(n) ? n : 0;
  }, [donateAmount]);

  /** --------- DonateModal for Campaigns --------- */
  const [donateOpen, setDonateOpen] = useState(false);
  const [donateRequestId, setDonateRequestId] = useState<number | null>(null);

  const openDonateForRequest = (requestId: number) => {
    setDonateRequestId(requestId);
    setDonateOpen(true);
  };

  /** DonateModal requires currentUser */
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("currentUser");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  /** --------- Donation Success Modal state --------- */
  const [successOpen, setSuccessOpen] = useState(false);
  const [successSessionId, setSuccessSessionId] = useState("");
  const [successStatus, setSuccessStatus] = useState<StatusKey>("checking");
  const [successDetails, setSuccessDetails] = useState("");
  const [successLoading, setSuccessLoading] = useState(false);

  const verifyRan = useRef(false);

  /** --------- Derived --------- */
  const ran = useRef(false);
  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  const provinces = useMemo(() => {
    const list = rows.map((r) => r.province).filter(Boolean) as string[];
    return Array.from(new Set(list)).sort();
  }, [rows]);

  const districts = useMemo(() => {
    const list = rows
      .filter((r) => (province === "all" ? true : r.province === province))
      .map((r) => r.district)
      .filter(Boolean) as string[];
    return Array.from(new Set(list)).sort();
  }, [rows, province]);

  /** --------- API Calls --------- */
  const fetchSchools = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await axios.get(SCHOOLS_LIST, {
        withCredentials: true,
        params: {
          search,
          province,
          district,
          status,
          verifiedFilter,
          needBand,
          sortBy,
          sortDir,
          page,
          limit,
        },
      });
      setRows(res.data?.schools ?? []);
      setTotal(Number(res.data?.total ?? 0));
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load schools");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectedDetail = async (schoolId: number) => {
    setDetailLoading(true);
    try {
      const res = await axios.get<SchoolDetailRes>(SCHOOL_DETAIL(schoolId), { withCredentials: true });
      setDetail(res.data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const openSchool = async (s: SchoolRow) => {
    setSelected(s);
    setDrawerOpen(true);

    setDetail(null);
    setDetailLoading(true);

    setDonateAmount("");
    setDonateMessage("");
    setDonateAnonymous(false);
    setDonateError(null);

    await fetchSelectedDetail(s.school_id);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const donateToSchool = async () => {
    setDonateError(null);

    const schoolId = selected?.school_id;
    if (!schoolId) return setDonateError("No school selected.");

    if (!donateAmountNum || donateAmountNum < MIN_LKR) {
      return setDonateError(`Minimum donation is LKR ${MIN_LKR}.`);
    }

    setDonateLoading(true);
    try {
      await axios.get(`${API_ROOT}/sanctum/csrf-cookie`, { withCredentials: true });

      const res = await axios.post(
        DONATE_TO_SCHOOL(schoolId),
        {
          amount: donateAmountNum,
          message: donateMessage?.trim() || null,
          anonymous: donateAnonymous ? 1 : 0,
          recurring: "none",
        },
        { withCredentials: true }
      );

      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
        return;
      }

      setDonateError("No checkout URL returned.");
    } catch (e: any) {
      if (e.response?.status === 401) setDonateError("Unauthenticated. Please login as donor.");
      else if (e.response?.status === 422) {
        const msg =
          e.response?.data?.message ||
          (e.response?.data?.errors ? Object.values(e.response.data.errors).flat().join(" ") : "") ||
          "Validation failed.";
        setDonateError(msg);
      } else {
        setDonateError(e.response?.data?.message || e.message || "Donation failed.");
      }
    } finally {
      setDonateLoading(false);
    }
  };

  const verifyDonation = async (sessionId: string) => {
    if (!sessionId) {
      setSuccessStatus("no_session");
      setSuccessDetails("");
      setSuccessLoading(false);
      return;
    }

    setSuccessLoading(true);
    setSuccessStatus("checking");
    setSuccessDetails("");

    try {
      const res = await axios.get(VERIFY_DONATION, {
        withCredentials: true,
        params: { session_id: sessionId },
      });

      const s = (res.data?.status || "error") as StatusKey;
      setSuccessStatus(s);
      if (res.data?.message) setSuccessDetails(String(res.data.message));

      // ✅ refresh UI after verification
      await fetchSchools();
      if (drawerOpen && selected?.school_id) {
        await fetchSelectedDetail(selected.school_id);
      }
    } catch (err: any) {
      const s = (err.response?.data?.status || "error") as StatusKey;
      setSuccessStatus(s);
      setSuccessDetails(err.response?.data?.message ? String(err.response.data.message) : "");
    } finally {
      setSuccessLoading(false);
    }
  };

  const closeSuccessModal = () => {
    setSuccessOpen(false);
    setSuccessDetails("");
    window.history.replaceState({}, "", window.location.pathname);
  };

  /** --------- Effects --------- */
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    fetchSchools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSchools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortBy, sortDir]);

  const apply = () => {
    setPage(1);
    fetchSchools();
  };

  useEffect(() => {
    if (verifyRan.current) return;

    const qs = new URLSearchParams(window.location.search);
    const sessionId = qs.get("session_id") || "";
    const success = qs.get("donation") === "success";

    if (!success || !sessionId) return;

    verifyRan.current = true;

    setSuccessSessionId(sessionId);
    setSuccessOpen(true);
    verifyDonation(sessionId);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ---------------- Render ---------------- */
  return (
    <div className="w-full px-3 sm:px-0">
      {/* Donation success modal */}
      <DonationSuccessModal
        open={successOpen}
        sessionId={successSessionId}
        status={successStatus}
        details={successDetails}
        loading={successLoading}
        onRecheck={() => verifyDonation(successSessionId)}
        onClose={closeSuccessModal}
      />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs text-slate-500 font-bold flex items-center gap-2">
            <BuildingOffice2Icon className="h-4 w-4 text-slate-400" />
            Donor dashboard
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">Schools</div>
          <div className="text-sm text-slate-600 mt-1">Donate directly to schools or support their latest requests.</div>
        </div>

        <button
          onClick={fetchSchools}
          className="rounded-2xl px-4 py-2.5 font-extrabold bg-slate-900 text-white hover:opacity-95 flex items-center gap-2"
        >
          <ArrowPathIcon className="h-5 w-5" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-600 mb-3">
          <FunnelIcon className="h-4 w-4 text-slate-400" />
          Filters
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5">
            <label className="text-xs font-extrabold text-slate-600">Search</label>
            <div className="mt-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search school name / province / district..."
                className="w-full rounded-2xl border border-slate-200 pl-10 pr-3 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="text-xs font-extrabold text-slate-600">Province</label>
            <select
              value={province}
              onChange={(e) => {
                setProvince(e.target.value);
                setDistrict("all");
              }}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="text-xs font-extrabold text-slate-600">District</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-1">
            <label className="text-xs font-extrabold text-slate-600">Need</label>
            <select
              value={needBand}
              onChange={(e) => setNeedBand(e.target.value as any)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="lg:col-span-2 flex items-end gap-2">
            <button
              onClick={apply}
              className="w-full rounded-2xl px-3 py-3 text-sm font-extrabold border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <AdjustmentsHorizontalIcon className="h-5 w-5 text-slate-700" />
              Apply
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-extrabold text-slate-600">Show:</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="all">All</option>
            </select>

            <select
              value={verifiedFilter}
              onChange={(e) => setVerifiedFilter(e.target.value as any)}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="verified">Verified</option>
              <option value="all">All</option>
              <option value="not_verified">Not verified</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs font-extrabold text-slate-600 flex items-center gap-2">
              <ArrowsUpDownIcon className="h-4 w-4 text-slate-400" />
              Sort
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="need_score">Need score</option>
              <option value="total_received">Total received</option>
              <option value="donations_count">Donations count</option>
              <option value="last_donation_at">Last donation</option>
              <option value="school_name">School name</option>
              <option value="created_at">Newest</option>
            </select>

            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as any)}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        </div>
      </div>

      {err ? <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-800">{err}</div> : null}

      {/* List */}
      <div className="mt-6">
        {loading ? (
          <div className="text-slate-500 text-center py-12">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 grid place-items-center text-slate-700">
              <BuildingOffice2Icon className="h-6 w-6" />
            </div>
            <div className="text-slate-900 font-extrabold text-xl mt-4">No schools found</div>
            <div className="text-slate-500 text-sm mt-1">Try changing filters.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {rows.map((s) => {
              const verified = Number(s.verified || 0) === 1;
              const level = needLevel(s.need_score);

              return (
                <button
                  key={s.school_id}
                  onClick={() => openSchool(s)}
                  className={cx(
                    "group w-full text-left rounded-3xl border border-slate-200 bg-white p-5 shadow-sm",
                    "transition duration-200",
                    "hover:-translate-y-[2px] hover:shadow-md hover:border-slate-300",
                    "focus:outline-none focus:ring-4 focus:ring-[#0B1E3B]/10"
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div className="shrink-0 h-14 w-14 rounded-2xl overflow-hidden bg-slate-100">
                      {toAbs(s.logo_url) ? (
                        <img src={toAbs(s.logo_url)!} alt="logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full grid place-items-center bg-[#0B1E3B]/10">
                          <div className="h-10 w-10 rounded-2xl bg-[#0B1E3B] text-white grid place-items-center font-extrabold text-xs shadow-sm">
                            {(s.initials || initials(s.school_name)).slice(0, 2)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-extrabold text-slate-900 truncate">{s.school_name}</div>

                            {verified ? (
                              <Pill
                                cls="bg-emerald-50 text-emerald-700 border-emerald-200"
                                icon={<CheckBadgeIcon className="h-3.5 w-3.5" />}
                              >
                                VERIFIED
                              </Pill>
                            ) : null}

                            <Pill cls={needTone(level)} icon={<FunnelIcon className="h-3.5 w-3.5" />}>
                              {level.toUpperCase()} NEED
                            </Pill>
                          </div>

                          <div className="mt-1 text-xs text-slate-500 truncate flex items-center gap-1.5">
                            <MapPinIcon className="h-4 w-4 text-slate-400" />
                            {s.province ? s.province : "—"}
                            {s.district ? ` • ${s.district}` : ""}
                          </div>

                          <div className="mt-2 text-sm text-slate-600">
                            Need score: <b className="text-[#0B1E3B]">{Number(s.need_score || 0).toFixed(1)}</b>
                          </div>
                        </div>

                        {/* Campaign count */}
                        <div className="shrink-0 text-right">
                          <div className="text-xs text-slate-500 font-bold flex items-center justify-end gap-1">
                            <ClipboardDocumentListIcon className="h-4 w-4 text-slate-400" />
                            Campaigns
                          </div>
                          <div className="text-xl font-extrabold text-[#0B1E3B]">{Number(s.campaigns_count || 0)}</div>
                        </div>
                      </div>

                      {/* Funding summary */}
                      <div className="mt-4 rounded-2xl bg-[#0B1E3B]/5 border border-[#0B1E3B]/10 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                            <CurrencyDollarIcon className="h-4 w-4 text-slate-400" />
                            Total received
                          </div>
                          <div className="text-sm font-extrabold text-[#0B1E3B]">
                            {/* ✅ ONLY total_received */}
                            {formatLKR(Number(s.total_received ?? 0))}
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-xs font-extrabold text-[#0B1E3B] group-hover:underline inline-flex items-center gap-1">
                          View details
                          <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-[2px]" />
                        </div>

                        <span className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold text-white bg-[#0B1E3B] hover:bg-[#08162D] transition">
                          <HeartIcon className="h-4 w-4" />
                          Support school
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* pagination */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-slate-600">
            Page <span className="font-extrabold text-slate-900">{page}</span> / {pages} • Total{" "}
            <span className="font-extrabold text-slate-900">{total}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={cx(
                "rounded-2xl px-4 py-2 text-sm font-extrabold border",
                page <= 1 ? "border-slate-200 text-slate-400" : "border-slate-200 hover:bg-slate-50"
              )}
            >
              Prev
            </button>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className={cx(
                "rounded-2xl px-4 py-2 text-sm font-extrabold border",
                page >= pages ? "border-slate-200 text-slate-400" : "border-slate-200 hover:bg-slate-50"
              )}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <div className={cx("fixed inset-0 z-[90]", drawerOpen ? "" : "pointer-events-none")}>
        <div
          className={cx(
            "absolute inset-0 transition-opacity duration-200",
            drawerOpen ? "opacity-100 bg-black/20 backdrop-blur-[1px]" : "opacity-0"
          )}
          onClick={closeDrawer}
        />

        <div
          className={cx(
            "absolute right-0 top-0 h-full w-full lg:w-[580px] bg-white shadow-2xl transition-transform duration-200",
            drawerOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="h-full flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
              <div className="p-5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 font-extrabold flex items-center gap-2">
                    <BuildingOffice2Icon className="h-4 w-4 text-slate-400" />
                    School details
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 truncate">
                    {selected?.school_name || "School"}
                  </div>
                </div>

                <button
                  onClick={closeDrawer}
                  className="rounded-2xl px-3 py-2 text-sm font-extrabold border border-slate-200 hover:bg-slate-50 flex items-center gap-2"
                >
                  <XMarkIcon className="h-5 w-5" />
                  Close
                </button>
              </div>
            </div>

            <div className="p-5 overflow-auto">
              {detailLoading ? (
                <div className="space-y-3">
                  <div className="h-28 rounded-3xl bg-slate-100 animate-pulse" />
                  <div className="h-40 rounded-3xl bg-slate-100 animate-pulse" />
                  <div className="h-52 rounded-3xl bg-slate-100 animate-pulse" />
                </div>
              ) : !detail ? (
                <div className="rounded-3xl border border-slate-200 p-5 text-slate-700">
                  Could not load details.
                  <div className="text-xs text-slate-500 mt-2">
                    This UI calls:{" "}
                    <span className="font-mono">{selected ? SCHOOL_DETAIL(selected.school_id) : "-"}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* School summary card */}
                  <div className="rounded-3xl border border-slate-200 p-6">
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-2xl overflow-hidden bg-slate-900 shrink-0">
                        {toAbs(detail.school.logo_url) ? (
                          <img
                            src={toAbs(detail.school.logo_url)!}
                            alt="logo"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-white font-extrabold">
                            {(detail.school.initials || initials(detail.school.school_name)).slice(0, 2)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xl font-extrabold text-slate-900">{detail.school.school_name}</div>
                        <div className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                          <MapPinIcon className="h-4 w-4 text-slate-400" />
                          <span>
                            {detail.school.province || "—"}{" "}
                            {detail.school.district ? `• ${detail.school.district}` : ""}
                          </span>
                        </div>
                        {detail.school.address ? (
                          <div className="text-sm text-slate-600 mt-1">{detail.school.address}</div>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {Number(detail.school.verified || 0) === 1 ? (
                            <Pill
                              cls="bg-emerald-50 text-emerald-700 border-emerald-200"
                              icon={<CheckBadgeIcon className="h-3.5 w-3.5" />}
                            >
                              VERIFIED
                            </Pill>
                          ) : null}
                          <Pill
                            cls={needTone(needLevel(detail.school.need_score))}
                            icon={<FunnelIcon className="h-3.5 w-3.5" />}
                          >
                            {needLevel(detail.school.need_score).toUpperCase()} NEED
                          </Pill>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-xs text-slate-500 font-bold">Received</div>
                        <div className="font-extrabold text-slate-900">
                          {/* ✅ ONLY total_received (fallback to donation_summary for safety) */}
                          {formatLKR(Number(detail.school.total_received ?? detail.donation_summary?.total_received ?? 0))}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-xs text-slate-500 font-bold">Donations</div>
                        <div className="font-extrabold text-slate-900">
                          {Number(detail.donation_summary?.donations_count || 0)}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-xs text-slate-500 font-bold">Need score</div>
                        <div className="font-extrabold text-slate-900">
                          {Number(detail.school.need_score || 0).toFixed(1)}
                        </div>
                      </div>
                    </div>

                    {/* Donate to school (premium) */}
                    <div className="mt-5 rounded-3xl border border-slate-200 p-5 bg-gradient-to-b from-white to-slate-50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                            <HeartIcon className="h-5 w-5 text-slate-900" />
                            Donate to School
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            We’ll auto-pick the best active request (or create General Fund) and redirect to Stripe.
                          </div>
                        </div>
                        <div className="text-[11px] font-extrabold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-full inline-flex items-center gap-2">
                          <ShieldCheckIcon className="h-4 w-4 text-slate-700" />
                          Stripe secure
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {[500, 1000, 2500, 5000].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setDonateAmount(String(v))}
                            className={cx(
                              "px-4 py-2 rounded-2xl text-sm font-extrabold border transition",
                              donateAmount === String(v)
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50"
                            )}
                          >
                            {formatLKR(v)}
                          </button>
                        ))}
                      </div>

                      {donateError ? (
                        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 text-sm font-bold">
                          {donateError}
                        </div>
                      ) : null}

                      <div className="mt-4">
                        <label className="block text-xs font-extrabold text-slate-600">Amount (LKR)</label>
                        <input
                          inputMode="numeric"
                          value={donateAmount}
                          onChange={(e) => setDonateAmount(e.target.value.replace(/[^\d.]/g, ""))}
                          placeholder="e.g. 2500"
                          className={cx(
                            "mt-1 w-full rounded-2xl border px-4 py-3 text-sm font-extrabold text-slate-900 outline-none",
                            "focus:ring-2 focus:ring-slate-200",
                            donateAmountNum > 0 && donateAmountNum < MIN_LKR ? "border-rose-200" : "border-slate-200"
                          )}
                        />
                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Minimum LKR {MIN_LKR}</span>
                          <span className="font-extrabold text-slate-700">
                            You will donate: {formatLKR(donateAmountNum || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-xs font-extrabold text-slate-600">Message (optional)</label>
                        <textarea
                          value={donateMessage}
                          onChange={(e) => setDonateMessage(e.target.value)}
                          placeholder="Write a short message…"
                          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none min-h-[90px] focus:ring-2 focus:ring-slate-200"
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="min-w-0">
                          <div className="text-slate-900 font-extrabold text-sm">Donate anonymously</div>
                          <div className="text-slate-500 text-xs">Hide your name in public lists.</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setDonateAnonymous((v) => !v)}
                          className={cx(
                            "relative inline-flex h-8 w-14 items-center rounded-full transition",
                            donateAnonymous ? "bg-slate-900" : "bg-slate-300"
                          )}
                          aria-pressed={donateAnonymous}
                        >
                          <span
                            className={cx(
                              "inline-block h-6 w-6 rounded-full bg-white transition translate-x-1",
                              donateAnonymous && "translate-x-7"
                            )}
                          />
                        </button>
                      </div>

                      <button
                        onClick={donateToSchool}
                        disabled={donateLoading || donateAmountNum < MIN_LKR}
                        className={cx(
                          "mt-3 w-full rounded-2xl py-3 font-extrabold text-white transition flex items-center justify-center gap-2",
                          donateLoading || donateAmountNum < MIN_LKR
                            ? "bg-slate-300 cursor-not-allowed"
                            : "bg-slate-900 hover:opacity-95"
                        )}
                      >
                        <CurrencyDollarIcon className="h-5 w-5" />
                        {donateLoading
                          ? "Redirecting…"
                          : donateAmountNum < MIN_LKR
                          ? `Enter at least LKR ${MIN_LKR}`
                          : "Continue to payment"}
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* campaigns */}
                  <div className="rounded-3xl border border-slate-200 p-6">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500 font-extrabold flex items-center gap-2">
                      <ClipboardDocumentListIcon className="h-4 w-4 text-slate-400" />
                      Latest requests
                    </div>
                    <div className="text-lg font-extrabold text-slate-900">Campaigns</div>

                    {detail.campaigns?.length ? (
                      <div className="mt-4 space-y-3">
                        {detail.campaigns.slice(0, 6).map((c) => {
                          const goal = Number(c.estimated_price || 0);
                          const raised = Number(c.amount_raised || 0);
                          const p = percent(raised, goal);
                          const remaining = Math.max(0, goal - raised);

                          return (
                            <div key={c.request_id} className="rounded-3xl border border-slate-200 p-4 bg-white">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-extrabold text-slate-900 truncate">{c.request_title}</div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    {c.category ? `${c.category} • ` : ""}
                                    {formatLKR(raised)} / {formatLKR(goal)} • <b className="text-slate-700">{p}%</b>
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-1">
                                    Remaining: <b className="text-slate-700">{formatLKR(remaining)}</b>
                                  </div>
                                </div>

                                <button
                                  onClick={(e) => {
                                  e.stopPropagation();
                                  openDonateForRequest(c.request_id);
                                }}
                                  className="shrink-0 rounded-2xl px-4 py-2 text-xs font-extrabold bg-slate-900 text-white hover:opacity-95 inline-flex items-center gap-2"
                                >
                                  <HeartIcon className="h-4 w-4" />
                                  Donate
                                </button>
                              </div>

                              <div className="mt-3">
                                <ProgressBar value={p} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-slate-600">No campaigns.</div>
                    )}
                  </div>
                </div>
              )}

              {/* DonateModal for request */}
              {donateRequestId !== null ? (
                <DonateModal
                  open={donateOpen}
                  onClose={() => setDonateOpen(false)}
                  requestId={donateRequestId}
                  currentUser={currentUser}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}