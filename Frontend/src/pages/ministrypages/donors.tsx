// src/pages/ministry/DonorsPage.tsx
import  { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000/api";

// ✅ New ministry endpoints (from the backend I gave)
const DONORS_URL = `${API_BASE}/donors`;
const DONOR_DETAIL_URL = (id: number) => `${API_BASE}/donors/${id}`;
const DONOR_DONATIONS_URL = (id: number) => `${API_BASE}/donors/${id}/donations?limit=20`;

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");
const safe = (v: any) => (v === null || v === undefined ? "" : String(v));
const formatLKR = (n: number) => `LKR ${Number.isFinite(n) ? n.toLocaleString() : "0"}`;

type DonorRow = {
  donor_id: number;
  full_name?: string;
  donor_name?: string;
  email?: string;
  donor_email?: string;
  phone?: string | null;
  donations_count?: number;
  active_donations_count?: number; // fallback old
  total_donated?: number;
  created_at?: string | null;
  initials?: string;
  last_donated_at?: string | null;
  last_time?: string | null;
};

type DonorDetailRes = {
  donor: {
    donor_id: number;
    full_name: string;
    email: string;
    phone?: string | null;
    created_at?: string | null;
  };
  stats: {
    total_donated: number;
    donations_count: number;
    last_donation_at?: string | null;
  };
};

type DonationRow = {
  donation_id: number;
  amount: number;
  created_at: string;
  time?: string | null;
  request_id?: number | null;
  school_id?: number | null;
  donation_type?: string | null;
  request_title?: string | null;
  school_name?: string | null;
  province?: string | null;
  district?: string | null;
};

type SortKey = "newest" | "total_donated" | "donations_count";

function getName(d: DonorRow) {
  return d.full_name || d.donor_name || "Anonymous";
}
function getEmail(d: DonorRow) {
  return d.email || d.donor_email || "";
}
function getCount(d: DonorRow) {
  // ministry endpoint uses donations_count
  return Number(d.donations_count ?? d.active_donations_count ?? 0);
}
function getTotal(d: DonorRow) {
  return Number(d.total_donated ?? 0);
}
function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "D";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "—";
  return t.toLocaleDateString();
}
function fmtWhen(d?: string | null) {
  if (!d) return "—";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "—";
  return t.toLocaleString();
}

export default function DonorsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DonorRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // KPIs from API
  const [kpis, setKpis] = useState<{ total_donors: number; paid_amount: number; paid_count: number }>({
    total_donors: 0,
    paid_amount: 0,
    paid_count: 0,
  });

  // filters
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // drawer
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DonorRow | null>(null);

  // drawer remote data
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DonorDetailRes | null>(null);
  const [donations, setDonations] = useState<DonationRow[]>([]);

  const fetchDonors = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(DONORS_URL, { withCredentials: true });
      const data = res.data || {};
      const list: DonorRow[] = Array.isArray(data?.donors) ? data.donors : Array.isArray(data) ? data : [];

      setRows(list);
      if (data?.kpis) {
        setKpis({
          total_donors: Number(data.kpis.total_donors ?? 0),
          paid_amount: Number(data.kpis.paid_amount ?? 0),
          paid_count: Number(data.kpis.paid_count ?? 0),
        });
      } else {
        // fallback if API doesn't send kpis
        setKpis({
          total_donors: list.length,
          paid_amount: list.reduce((a, d) => a + getTotal(d), 0),
          paid_count: list.reduce((a, d) => a + getCount(d), 0),
        });
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load donors");
      setRows([]);
      setKpis({ total_donors: 0, paid_amount: 0, paid_count: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = rows.filter((d) => {
      if (!q) return true;
      const name = getName(d).toLowerCase();
      const email = getEmail(d).toLowerCase();
      const phone = safe(d.phone).toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });

    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (sortBy === "total_donated") return (getTotal(a) - getTotal(b)) * dir;
      if (sortBy === "donations_count") return (getCount(a) - getCount(b)) * dir;

      // newest (created_at)
      const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
      return (ad - bd) * dir;
    });

    return list;
  }, [rows, search, sortBy, sortDir]);

  const summary = useMemo(() => {
    const totalDonors = filtered.length;
    const totalRaised = filtered.reduce((acc, d) => acc + getTotal(d), 0);
    const totalDonations = filtered.reduce((acc, d) => acc + getCount(d), 0);
    return { totalDonors, totalRaised, totalDonations };
  }, [filtered]);

  const fetchDrawerData = async (donorId: number) => {
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    setDonations([]);

    try {
      const [a, b] = await Promise.all([
        axios.get(DONOR_DETAIL_URL(donorId), { withCredentials: true }),
        axios.get(DONOR_DONATIONS_URL(donorId), { withCredentials: true }),
      ]);

      setDetail(a.data as DonorDetailRes);
      setDonations(Array.isArray(b.data?.donations) ? b.data.donations : []);
    } catch (e: any) {
      setDetailError(e?.response?.data?.message || e?.message || "Failed to load donor details");
      setDetail(null);
      setDonations([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const openDrawer = (d: DonorRow) => {
    setSelected(d);
    setOpen(true);
    fetchDrawerData(d.donor_id);
  };

  const closeDrawer = () => {
    setOpen(false);
    setSelected(null);
    setDetail(null);
    setDonations([]);
    setDetailError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Donors </h1>
          <p className="text-slate-500 text-sm mt-1">Monitor donor activity and contributions (Ministry).</p>
        </div>

        <button
          onClick={fetchDonors}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {/* KPIs (global + filtered) */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Donors (all)</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{kpis.total_donors}</p>
        </div>
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Donated (all paid)</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{formatLKR(kpis.paid_amount)}</p>
        </div>
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Donations Count (all paid)</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{kpis.paid_count}</p>
        </div>

        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Filtered Donors</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{summary.totalDonors}</p>
        </div>
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Filtered Donated</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{formatLKR(summary.totalRaised)}</p>
        </div>
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Filtered Donation Count</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{summary.totalDonations}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label className="text-xs font-bold text-slate-600">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, phone..."
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
            />
          </div>

          <div className="md:col-span-4">
            <label className="text-xs font-bold text-slate-600">Sort</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="newest">Newest</option>
              <option value="total_donated">Total Donated</option>
              <option value="donations_count">Donations Count</option>
            </select>
          </div>

          <div className="md:col-span-3">
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
        </div>

        <div className="mt-3 text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> donors
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
            onClick={fetchDonors}
            className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="text-4xl mb-3">🙋‍♂️</div>
          <div className="text-slate-900 font-extrabold text-xl">No donors found</div>
          <div className="text-slate-500 text-sm mt-1">Try changing filters.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => {
            const name = getName(d);
            const email = getEmail(d);
            const initials = d.initials || initialsFromName(name);

            return (
              <div
                key={d.donor_id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-extrabold text-slate-700">
                    {initials || "D"}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-extrabold text-slate-900 truncate">{name}</div>
                      <span className="text-xs font-bold rounded-full bg-slate-100 text-slate-700 px-3 py-1">
                        Donations: {getCount(d)}
                      </span>
                      <span className="text-xs font-bold rounded-full bg-blue-50 text-blue-700 px-3 py-1">
                        Total: {formatLKR(getTotal(d))}
                      </span>
                      {d.last_time ? (
                        <span className="text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 px-3 py-1">
                          Last: {d.last_time}
                        </span>
                      ) : null}
                    </div>

                    <div className="text-sm text-slate-500 mt-1 truncate">
                      {email ? email : "—"} {d.phone ? `• ${d.phone}` : ""}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <button
                    onClick={() => openDrawer(d)}
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
            "absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white shadow-2xl border-l border-slate-200 transition-transform duration-200",
            open ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="h-full flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Ministry Donor View</div>
                <div className="text-xl font-extrabold text-slate-900">Donor Details</div>
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
                <div className="text-slate-500">No donor selected.</div>
              ) : detailLoading ? (
                <div className="text-slate-500">Loading donor details…</div>
              ) : detailError ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
                  <div className="font-extrabold">Error</div>
                  <div className="text-sm mt-1">{detailError}</div>
                  <button
                    onClick={() => fetchDrawerData(selected.donor_id)}
                    className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* top card */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-extrabold text-slate-900">
                          {detail?.donor?.full_name || getName(selected)}
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          {detail?.donor?.email || getEmail(selected) || "—"}{" "}
                          {detail?.donor?.phone ? `• ${detail.donor.phone}` : selected.phone ? `• ${selected.phone}` : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-400">TOTAL DONATED</div>
                        <div className="text-xl font-extrabold text-blue-700">
                          {formatLKR(detail?.stats?.total_donated ?? getTotal(selected))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-bold text-slate-500">Donations Count</div>
                        <div className="text-lg font-extrabold text-slate-900 mt-1">
                          {detail?.stats?.donations_count ?? getCount(selected)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-bold text-slate-500">Joined</div>
                        <div className="text-sm font-bold text-slate-900 mt-1">
                          {fmtDate(detail?.donor?.created_at || selected.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-slate-500">
                      <span className="font-semibold text-slate-700">Last Donation:</span>{" "}
                      {fmtWhen(detail?.stats?.last_donation_at || selected.last_donated_at || null)}
                    </div>
                  </div>

                  {/* Donations list */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-extrabold text-slate-900">Recent Donations</div>
                        <div className="text-xs text-slate-500 mt-1">Paid donations only (campaign + direct fund).</div>
                      </div>
                      <button
                        onClick={() => fetchDrawerData(selected.donor_id)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Refresh
                      </button>
                    </div>

                    {donations.length === 0 ? (
                      <div className="mt-4 text-sm text-slate-500">No donations found.</div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {donations.map((x) => (
                          <div key={x.donation_id} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-extrabold text-slate-900">
                                  {x.school_name ? x.school_name : "School"}{" "}
                                  <span className="text-xs font-bold text-slate-500">
                                    {x.donation_type ? `• ${x.donation_type}` : ""}
                                  </span>
                                </div>
                                <div className="text-sm text-slate-500 mt-1">
                                  {x.request_title ? (
                                    <span className="font-semibold text-slate-700">Campaign:</span>
                                  ) : (
                                    <span className="font-semibold text-slate-700">Direct Fund:</span>
                                  )}{" "}
                                  {x.request_title ? x.request_title : "No request (school fund)"}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  {x.province || "—"} {x.district ? `• ${x.district}` : ""} {x.time ? `• ${x.time}` : ""}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-xs font-bold text-slate-400">AMOUNT</div>
                                <div className="text-lg font-extrabold text-slate-900">{formatLKR(Number(x.amount ?? 0))}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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