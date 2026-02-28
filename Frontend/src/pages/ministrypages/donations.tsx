// src/pages/ministry/DonationsPage.tsx
import  { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000/api";

// ✅ backend: DonationController@listDonations
const DONATIONS_URL = `${API_BASE}/donations`;

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");
const safe = (v: any) => (v === null || v === undefined ? "" : String(v));
const formatLKR = (n: number) => `LKR ${Number.isFinite(n) ? n.toLocaleString() : "0"}`;

type DonationRow = {
  donation_id: number;
  request_id?: number | null;
  donor_id?: number | null;
  donor_name?: string | null;
  donor_email?: string | null;
  amount: number;
  status: string; // paid|pending|...
  created_at: string;
  time?: string | null;

  request_title?: string | null;
  school_id?: number | null;
  school_name?: string | null;
  district?: string | null;
  province?: string | null;

  initials?: string;
};

type SortKey = "created_at" | "amount" | "status";

function pillClass(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (s === "pending") return "bg-amber-50 text-amber-700 border-amber-100";
  if (s === "failed") return "bg-rose-50 text-rose-700 border-rose-100";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "D";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

// function fmtDate(d?: string | null) {
//   if (!d) return "—";
//   const t = new Date(d);
//   if (Number.isNaN(t.getTime())) return "—";
//   return t.toLocaleDateString();
// }
function fmtWhen(d?: string | null) {
  if (!d) return "—";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "—";
  return t.toLocaleString();
}

export default function DonationsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DonationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // server pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // filters
  const [status, setStatus] = useState<"all" | "paid" | "pending">("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // sorting
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // drawer
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DonationRow | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const fetchDonations = async (opts?: { resetPage?: boolean }) => {
    const nextPage = opts?.resetPage ? 1 : page;

    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(DONATIONS_URL, {
        withCredentials: true,
        params: {
          page: nextPage,
          limit,
          status, // all|paid|pending
          search: search.trim() || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          sortBy,
          sortDir,
        },
      });

      const data = res.data || {};
      const list: DonationRow[] = Array.isArray(data?.donations) ? data.donations : [];

      setRows(list);
      setTotal(Number(data?.total ?? 0));
      setPage(Number(data?.page ?? nextPage));
      setLimit(Number(data?.limit ?? limit));
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load donations");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // KPIs (fallback computed from current page only)
  const kpis = useMemo(() => {
    const pageCount = rows.length;
    const pageAmount = rows.reduce((a, r) => a + Number(r.amount ?? 0), 0);
    const paidCount = rows.filter((r) => (r.status || "").toLowerCase() === "paid").length;
    const pendingCount = rows.filter((r) => (r.status || "").toLowerCase() === "pending").length;
    return { pageCount, pageAmount, paidCount, pendingCount };
  }, [rows]);

  const applyFilters = () => {
    setPage(1);
    fetchDonations({ resetPage: true });
  };

  const resetFilters = () => {
    setStatus("all");
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setSortBy("created_at");
    setSortDir("desc");
    setPage(1);
    setLimit(10);
    setTimeout(() => fetchDonations({ resetPage: true }), 0);
  };

  const openDrawer = (r: DonationRow) => {
    setSelected(r);
    setOpen(true);
  };

  const closeDrawer = () => {
    setOpen(false);
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Donations</h1>
          <p className="text-slate-500 text-sm mt-1">Monitor platform donations (Ministry).</p>
        </div>

        <button
          onClick={() => fetchDonations()}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Results (filtered)</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{total}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">This Page Amount</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{formatLKR(kpis.pageAmount)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Paid (this page)</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{kpis.paidCount}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Pending (this page)</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{kpis.pendingCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-4">
            <label className="text-xs font-bold text-slate-600">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Donor, email, school, campaign, district..."
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="text-xs font-bold text-slate-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="text-xs font-bold text-slate-600">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="text-xs font-bold text-slate-600">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="text-xs font-bold text-slate-600">Sort</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="created_at">Newest</option>
              <option value="amount">Amount</option>
              <option value="status">Status</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="text-xs font-bold text-slate-600">Direction</label>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="text-xs font-bold text-slate-600">Per Page</label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
                setTimeout(() => fetchDonations({ resetPage: true }), 0);
              }}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            >
              {[10, 15, 20, 30, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-4 flex gap-2">
            <button
              onClick={applyFilters}
              className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-indigo-700"
            >
              Apply
            </button>
            <button
              onClick={resetFilters}
              className="mt-6 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-3 text-sm text-slate-500">
          Page <span className="font-semibold text-slate-700">{page}</span> of{" "}
          <span className="font-semibold text-slate-700">{totalPages}</span>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-slate-500 text-center py-12">Loading…</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          <div className="font-extrabold">Error</div>
          <div className="text-sm mt-1">{error}</div>
          <button
            onClick={() => fetchDonations()}
            className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="text-4xl mb-3">💸</div>
          <div className="text-slate-900 font-extrabold text-xl">No donations found</div>
          <div className="text-slate-500 text-sm mt-1">Try changing filters.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const donorName = safe(r.donor_name) || "Anonymous";
            const initials = r.initials || initialsFromName(donorName);
            const st = (r.status || "").toLowerCase();

            return (
              <div
                key={r.donation_id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-extrabold text-slate-700">
                    {initials}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-extrabold text-slate-900 truncate">
                        {donorName}
                        {r.donor_email ? (
                          <span className="font-semibold text-slate-400"> • {r.donor_email}</span>
                        ) : null}
                      </div>

                      <span
                        className={cx(
                          "text-xs font-extrabold rounded-full border px-3 py-1",
                          pillClass(st)
                        )}
                      >
                        {st || "unknown"}
                      </span>

                      <span className="text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 px-3 py-1">
                        {formatLKR(Number(r.amount ?? 0))}
                      </span>

                      {r.time ? (
                        <span className="text-xs font-bold rounded-full bg-slate-100 text-slate-700 px-3 py-1">
                          {r.time}
                        </span>
                      ) : null}
                    </div>

                    <div className="text-sm text-slate-500 mt-1 truncate">
                      {r.school_name ? r.school_name : "—"}
                      {r.province ? ` • ${r.province}` : ""}
                      {r.district ? ` • ${r.district}` : ""}
                    </div>

                    <div className="text-xs text-slate-400 mt-1 truncate">
                      {r.request_title ? `Campaign: ${r.request_title}` : "Direct fund / No campaign"}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <button
                    onClick={() => openDrawer(r)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    View details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && total > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {(page - 1) * limit + 1}
            </span>{" "}
            –{" "}
            <span className="font-semibold text-slate-700">
              {Math.min(page * limit, total)}
            </span>{" "}
            of <span className="font-semibold text-slate-700">{total}</span>
          </div>

          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => {
                const p = Math.max(1, page - 1);
                setPage(p);
                setTimeout(() => fetchDonations(), 0);
              }}
              className={cx(
                "rounded-xl border px-4 py-2 text-sm font-bold",
                page <= 1
                  ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              Prev
            </button>

            <button
              disabled={page >= totalPages}
              onClick={() => {
                const p = Math.min(totalPages, page + 1);
                setPage(p);
                setTimeout(() => fetchDonations(), 0);
              }}
              className={cx(
                "rounded-xl border px-4 py-2 text-sm font-bold",
                page >= totalPages
                  ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {/* Drawer */}
      <div className={cx("fixed inset-0 z-[80] transition", open ? "pointer-events-auto" : "pointer-events-none")}>
        {/* Backdrop */}
        <div
          onClick={closeDrawer}
          className={cx("absolute inset-0 bg-slate-900/20 transition-opacity duration-200", open ? "opacity-100" : "opacity-0")}
        />

        {/* Panel */}
        <aside
          className={cx(
            "absolute right-0 top-0 h-full w-full sm:w-[580px] bg-white shadow-2xl border-l border-slate-200 transition-transform duration-200",
            open ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="h-full flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Ministry Donation View</div>
                <div className="text-xl font-extrabold text-slate-900">Donation Details</div>
              </div>
              <button
                onClick={closeDrawer}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {!selected ? (
                <div className="text-slate-500">No donation selected.</div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-lg font-extrabold text-slate-900">
                          {selected.donor_name || "Anonymous"}
                        </div>
                        <div className="text-sm text-slate-500 mt-1 truncate">
                          {selected.donor_email || "—"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-400">AMOUNT</div>
                        <div className="text-2xl font-extrabold text-indigo-700">
                          {formatLKR(Number(selected.amount ?? 0))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-bold text-slate-500">Status</div>
                        <div
                          className={cx(
                            "mt-2 inline-flex text-xs font-extrabold rounded-full border px-3 py-1",
                            pillClass((selected.status || "").toLowerCase())
                          )}
                        >
                          {(selected.status || "unknown").toLowerCase()}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-bold text-slate-500">Created</div>
                        <div className="text-sm font-bold text-slate-900 mt-2">
                          {fmtWhen(selected.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                      <div className="text-xs font-bold text-slate-500">School</div>
                      <div className="text-sm font-extrabold text-slate-900 mt-1">
                        {selected.school_name || "—"}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {selected.province || "—"} {selected.district ? `• ${selected.district}` : ""}
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl border border-slate-200 p-4">
                      <div className="text-xs font-bold text-slate-500">Campaign</div>
                      <div className="text-sm font-bold text-slate-900 mt-1">
                        {selected.request_title ? selected.request_title : "Direct fund / No campaign"}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Donation ID: <span className="font-semibold text-slate-700">{selected.donation_id}</span>
                        {selected.request_id ? (
                          <>
                            {" "}
                            • Request ID: <span className="font-semibold text-slate-700">{selected.request_id}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

               
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}