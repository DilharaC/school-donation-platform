// DonorSchools.tsx (FULL UPDATED) — Premium drawer UI + Donate to School + Donate to Campaign (DonateModal)
// ✅ Fixes your earlier issues:
// - Keeps hooks INSIDE component (no top-level useState / functions)
// - Uses DonateModal for campaign donations (request-based)
// - Direct School Donation calls backend endpoint /api/donor/schools/:id/donate
// - Uses correct Sanctum CSRF endpoint (NOT under /api): http://localhost:8000/sanctum/csrf-cookie
// - Optional verify-on-return (if you return to /donor/schools?donation=success&session_id=...)

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import DonateModal from "../../components/DonateModal";

/** ---------------- API ---------------- */
const API_ROOT = "http://localhost:8000";
const API_BASE = `${API_ROOT}/api`;

const SCHOOLS_LIST = `${API_BASE}/schools`;
const SCHOOL_DETAIL = (id: number) => `${API_BASE}/schools/${id}`;
const DONATE_TO_SCHOOL = (schoolId: number) => `${API_BASE}/donor/schools/${schoolId}/donate`;

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

function Pill({ children, cls }: { children: React.ReactNode; cls: string }) {
  return (
    <span className={cx("inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold border", cls)}>
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
  fund_balance?: number;   // ✅ add
  total_received?: number; // optional
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
  const [donateAmount, setDonateAmount] = useState(""); // string input
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

  /** IMPORTANT:
   * DonateModal requires currentUser prop in your project.
   * Fix TS error: "Cannot find name 'currentUser'" by defining it here.
   * OPTION A: If you store user in localStorage:
   */
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("currentUser");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

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

  const openSchool = async (s: SchoolRow) => {
    setSelected(s);
    setDrawerOpen(true);

    // reset drawer content
    setDetail(null);
    setDetailLoading(true);

    // reset donate-to-school box
    setDonateAmount("");
    setDonateMessage("");
    setDonateAnonymous(false);
    setDonateError(null);

    try {
      const res = await axios.get<SchoolDetailRes>(SCHOOL_DETAIL(s.school_id), { withCredentials: true });
      setDetail(res.data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
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
      // Sanctum CSRF cookie (NOT under /api)
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

  // Optional: verify donation when coming back to this page with ?donation=success&session_id=...
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const sessionId = qs.get("session_id");
    const success = qs.get("donation") === "success";
    if (!success || !sessionId) return;

    axios
      .get(`${API_BASE}/donations/verify`, {
        withCredentials: true,
        params: { session_id: sessionId },
      })
      .then(() => fetchSchools())
      .finally(() => {
        window.history.replaceState({}, "", window.location.pathname);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ---------------- Render ---------------- */
  return (
    <div className="w-full px-3 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs text-slate-500 font-bold">Donor dashboard</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">Schools</div>
          <div className="text-sm text-slate-600 mt-1">Donate directly to schools or support their latest requests.</div>
        </div>

        <button onClick={fetchSchools} className="rounded-2xl px-4 py-2.5 font-extrabold bg-slate-900 text-white">
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5">
            <label className="text-xs font-extrabold text-slate-600">Search</label>
            <div className="mt-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔎</div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search school name / province / district..."
                className="w-full rounded-2xl border border-slate-200 pl-9 pr-3 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
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
              className="w-full rounded-2xl px-3 py-3 text-sm font-extrabold border border-slate-200 hover:bg-slate-50"
            >
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
            <div className="text-xs font-extrabold text-slate-600">Sort</div>
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
            <div className="text-4xl mb-3">🏫</div>
            <div className="text-slate-900 font-extrabold text-xl">No schools found</div>
            <div className="text-slate-500 text-sm mt-1">Try changing filters.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {rows.map((s) => {
              const verified = Number(s.verified || 0) === 1;
              const level = needLevel(s.need_score);
              const received = Number(s.fund_balance ?? s.total_received ?? 0);
              const goalGuess = Math.max(1, received * 1.35);
              const p = percent(received, goalGuess);

              return (
                <button
                  key={s.school_id}
                  onClick={() => openSchool(s)}
                  className={cx(
                    "group w-full text-left rounded-3xl border border-slate-200 bg-white p-5 shadow-sm",
                    "transition hover:-translate-y-[2px] hover:shadow-md hover:border-slate-300"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 h-14 w-14 rounded-2xl overflow-hidden bg-slate-900">
                      {toAbs(s.logo_url) ? (
                        <img src={toAbs(s.logo_url)!} alt="logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-white font-extrabold">
                          {(s.initials || initials(s.school_name)).slice(0, 2)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-extrabold text-slate-900 truncate">{s.school_name}</div>
                            {verified ? <Pill cls="bg-emerald-50 text-emerald-700 border-emerald-200">VERIFIED</Pill> : null}
                            <Pill cls={needTone(level)}>{level.toUpperCase()} NEED</Pill>
                          </div>

                          <div className="mt-1 text-xs text-slate-500 truncate">
                            {s.province ? s.province : "—"}
                            {s.district ? ` • ${s.district}` : ""}
                          </div>

                          <div className="mt-2 text-sm text-slate-600">
                            Need score: <b className="text-slate-900">{Number(s.need_score || 0).toFixed(1)}</b>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-xs text-slate-500 font-bold">Campaigns</div>
                          <div className="text-xl font-extrabold text-slate-900">{Number(s.campaigns_count || 0)}</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>
                            Total received <b className="text-slate-700">{formatLKR(received)}</b>
                          </span>
                          <span>{Number(s.donations_count || 0)} donations</span>
                        </div>
                        <div className="mt-2">
                          <ProgressBar value={p} />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-xs font-extrabold text-slate-700 group-hover:text-slate-900">View details →</div>
                        <span className="rounded-xl px-3 py-2 text-xs font-extrabold bg-slate-900 text-white">Support school</span>
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
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 font-extrabold">School details</div>
                  <div className="text-lg font-extrabold text-slate-900 truncate">{selected?.school_name || "School"}</div>
                </div>

                <button
                  onClick={closeDrawer}
                  className="rounded-2xl px-4 py-2 text-sm font-extrabold border border-slate-200 hover:bg-slate-50"
                >
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
                    This UI calls: <span className="font-mono">{selected ? SCHOOL_DETAIL(selected.school_id) : "-"}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* School summary card */}
                  <div className="rounded-3xl border border-slate-200 p-6">
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-2xl overflow-hidden bg-slate-900 shrink-0">
                        {toAbs(detail.school.logo_url) ? (
                          <img src={toAbs(detail.school.logo_url)!} alt="logo" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-white font-extrabold">
                            {(detail.school.initials || initials(detail.school.school_name)).slice(0, 2)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xl font-extrabold text-slate-900">{detail.school.school_name}</div>
                        <div className="text-sm text-slate-600">
                          {detail.school.province || "—"} {detail.school.district ? `• ${detail.school.district}` : ""}
                        </div>
                        {detail.school.address ? <div className="text-sm text-slate-600 mt-1">{detail.school.address}</div> : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {Number(detail.school.verified || 0) === 1 ? (
                            <Pill cls="bg-emerald-50 text-emerald-700 border-emerald-200">VERIFIED</Pill>
                          ) : null}
                          <Pill cls={needTone(needLevel(detail.school.need_score))}>{needLevel(detail.school.need_score).toUpperCase()} NEED</Pill>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-xs text-slate-500 font-bold">Received</div>
                        <div className="font-extrabold text-slate-900">
                          {formatLKR(Number(detail.school.fund_balance ?? detail.donation_summary?.total_received ?? 0))}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-xs text-slate-500 font-bold">Donations</div>
                        <div className="font-extrabold text-slate-900">{Number(detail.donation_summary?.donations_count || 0)}</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-xs text-slate-500 font-bold">Need score</div>
                        <div className="font-extrabold text-slate-900">{Number(detail.school.need_score || 0).toFixed(1)}</div>
                      </div>
                    </div>

                    {/* Donate to school (premium) */}
                    <div className="mt-5 rounded-3xl border border-slate-200 p-5 bg-gradient-to-b from-white to-slate-50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-extrabold text-slate-900">Donate to School</div>
                          <div className="text-xs text-slate-500 mt-1">
                            We’ll auto-pick the best active request (or create General Fund) and redirect to Stripe.
                          </div>
                        </div>
                        <div className="text-[11px] font-extrabold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
                          🔒 Stripe secure
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
                          <span className="font-extrabold text-slate-700">You will donate: {formatLKR(donateAmountNum || 0)}</span>
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
                          className={cx("relative inline-flex h-8 w-14 items-center rounded-full transition", donateAnonymous ? "bg-slate-900" : "bg-slate-300")}
                          aria-pressed={donateAnonymous}
                        >
                          <span className={cx("inline-block h-6 w-6 rounded-full bg-white transition translate-x-1", donateAnonymous && "translate-x-7")} />
                        </button>
                      </div>

                      <button
                        onClick={donateToSchool}
                        disabled={donateLoading || donateAmountNum < MIN_LKR}
                        className={cx(
                          "mt-3 w-full rounded-2xl py-3 font-extrabold text-white transition",
                          donateLoading || donateAmountNum < MIN_LKR ? "bg-slate-300 cursor-not-allowed" : "bg-slate-900 hover:opacity-95"
                        )}
                      >
                        {donateLoading ? "Redirecting…" : donateAmountNum < MIN_LKR ? `Enter at least LKR ${MIN_LKR}` : "Continue to payment →"}
                      </button>
                    </div>
                  </div>

                  {/* campaigns */}
                  <div className="rounded-3xl border border-slate-200 p-6">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500 font-extrabold">Latest requests</div>
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
                                  className="shrink-0 rounded-2xl px-4 py-2 text-xs font-extrabold bg-slate-900 text-white hover:opacity-95"
                                >
                                  Donate
                                </button>
                              </div>

                              <div className="mt-3">
                                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                  <div className="h-full rounded-full bg-slate-900" style={{ width: `${p}%` }} />
                                </div>
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