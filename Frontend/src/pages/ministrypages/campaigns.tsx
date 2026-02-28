import  { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000/api";

const CAMPAIGNS_URL = `${API_BASE}/ministry/campaigns`;
const CAMPAIGN_DETAIL_URL = (id: number) => `${API_BASE}/ministry/campaigns/${id}`;
const CAMPAIGN_DONATIONS_URL = (id: number) => `${API_BASE}/ministry/campaigns/${id}/donations?limit=20`;

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");
const formatLKR = (n: number) => `LKR ${Number.isFinite(n) ? n.toLocaleString() : "0"}`;

type CampaignRow = {
  request_id: number;
  school_id: number;
  request_title: string;
  category?: string | null;
  quantity?: number | null;
  estimated_price: number;
  amount_raised: number;
  status?: string | null;
  description?: string | null;
  image_url?: string | null;
  document_url?: string | null;
  created_at?: string | null;

  school_name?: string | null;
  province?: string | null;
  district?: string | null;

  paid_amount?: number;
  paid_donations_count?: number;
  time?: string | null;
};

type CampaignDetailRes = {
  campaign: CampaignRow & {
    contact_email?: string | null;
    contact_phone?: string | null;
    address?: string | null;
  };
  stats: { paid_amount: number; paid_count: number; last_paid_at?: string | null };
};

type DonationRow = {
  donation_id: number;
  donor_name?: string | null;
  donor_email?: string | null;
  amount: number;
  created_at: string;
  time?: string | null;
  donation_type?: string | null;
};

type SortKey = "newest" | "goal" | "raised" | "remaining";

function clampPct(raised: number, goal: number) {
  if (goal <= 0) return 0;
  const p = (raised / goal) * 100;
  return Math.max(0, Math.min(100, p));
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

export default function CampaignsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [kpis, setKpis] = useState({
    total_campaigns: 0,
    approved_campaigns: 0,
    paid_amount: 0,
    paid_count: 0,
  });

  // filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  // drawer
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CampaignRow | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CampaignDetailRes | null>(null);
  const [donations, setDonations] = useState<DonationRow[]>([]);

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(CAMPAIGNS_URL, {
        withCredentials: true,
        params: { search: search.trim() || undefined, status, sortBy, dir },
      });

      const data = res.data || {};
      const list: CampaignRow[] = Array.isArray(data?.campaigns) ? data.campaigns : Array.isArray(data) ? data : [];
      setRows(list);

      if (data?.kpis) {
        setKpis({
          total_campaigns: Number(data.kpis.total_campaigns ?? 0),
          approved_campaigns: Number(data.kpis.approved_campaigns ?? 0),
          paid_amount: Number(data.kpis.paid_amount ?? 0),
          paid_count: Number(data.kpis.paid_count ?? 0),
        });
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load campaigns");
      setRows([]);
      setKpis({ total_campaigns: 0, approved_campaigns: 0, paid_amount: 0, paid_count: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;

    if (q) {
      list = list.filter((c) => {
        const a = (c.request_title || "").toLowerCase();
        const b = (c.school_name || "").toLowerCase();
        const p = (c.province || "").toLowerCase();
        const d = (c.district || "").toLowerCase();
        const cat = (c.category || "").toLowerCase();
        return a.includes(q) || b.includes(q) || p.includes(q) || d.includes(q) || cat.includes(q);
      });
    }

    if (status !== "all") {
      list = list.filter((c) => String(c.status || "") === status);
    }

    const mul = dir === "asc" ? 1 : -1;
    const sorted = [...list].sort((x, y) => {
      if (sortBy === "goal") return ((x.estimated_price ?? 0) - (y.estimated_price ?? 0)) * mul;
      if (sortBy === "raised") return ((x.amount_raised ?? 0) - (y.amount_raised ?? 0)) * mul;
      if (sortBy === "remaining")
        return (((x.estimated_price ?? 0) - (x.amount_raised ?? 0)) - ((y.estimated_price ?? 0) - (y.amount_raised ?? 0))) * mul;

      const xd = x.created_at ? new Date(x.created_at).getTime() : 0;
      const yd = y.created_at ? new Date(y.created_at).getTime() : 0;
      return (xd - yd) * mul;
    });

    return sorted;
  }, [rows, search, status, sortBy, dir]);

  const filteredKpis = useMemo(() => {
    const total = filtered.length;
    const raised = filtered.reduce((a, c) => a + Number(c.amount_raised ?? 0), 0);
    const goal = filtered.reduce((a, c) => a + Number(c.estimated_price ?? 0), 0);
    return { total, raised, goal };
  }, [filtered]);

  const fetchDrawer = async (requestId: number) => {
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    setDonations([]);
    try {
      const [a, b] = await Promise.all([
        axios.get(CAMPAIGN_DETAIL_URL(requestId), { withCredentials: true }),
        axios.get(CAMPAIGN_DONATIONS_URL(requestId), { withCredentials: true }),
      ]);
      setDetail(a.data as CampaignDetailRes);
      setDonations(Array.isArray(b.data?.donations) ? b.data.donations : []);
    } catch (e: any) {
      setDetailError(e?.response?.data?.message || e?.message || "Failed to load campaign details");
    } finally {
      setDetailLoading(false);
    }
  };

  const openDrawer = (c: CampaignRow) => {
    setSelected(c);
    setOpen(true);
    fetchDrawer(c.request_id);
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
          <h1 className="text-2xl font-extrabold text-slate-900">Campaigns </h1>
          <p className="text-slate-500 text-sm mt-1">Monitor donation requests and progress (Ministry).</p>
        </div>
        <button
          onClick={fetchCampaigns}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Total Campaigns (all)</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{kpis.total_campaigns}</div>
        </div>
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Approved Campaigns</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{kpis.approved_campaigns}</div>
        </div>
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Paid Donations (all)</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{kpis.paid_count}</div>
        </div>

        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Filtered Campaigns</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{filteredKpis.total}</div>
        </div>
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Filtered Raised</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{formatLKR(filteredKpis.raised)}</div>
        </div>
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Filtered Goal</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{formatLKR(filteredKpis.goal)}</div>
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
              placeholder="Campaign title, school, province..."
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-xs font-bold text-slate-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="all">All</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-600">Sort</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="newest">Newest</option>
              <option value="goal">Goal</option>
              <option value="raised">Raised</option>
              <option value="remaining">Remaining</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-600">Direction</label>
            <select
              value={dir}
              onChange={(e) => setDir(e.target.value as "asc" | "desc")}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex gap-3">
          <button
            onClick={fetchCampaigns}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-indigo-700"
          >
            Apply
          </button>
          <button
            onClick={() => {
              setSearch("");
              setStatus("all");
              setSortBy("newest");
              setDir("desc");
              setTimeout(fetchCampaigns, 0);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Reset
          </button>
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
            onClick={fetchCampaigns}
            className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="text-4xl mb-3">📣</div>
          <div className="text-slate-900 font-extrabold text-xl">No campaigns found</div>
          <div className="text-slate-500 text-sm mt-1">Try changing filters.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const goal = Number(c.estimated_price ?? 0);
            const raised = Number(c.amount_raised ?? 0);
            const pct = clampPct(raised, goal);

            return (
              <div
                key={c.request_id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-extrabold text-slate-900 truncate">{c.request_title}</div>
                    <span className="text-xs font-bold rounded-full bg-slate-100 text-slate-700 px-3 py-1">
                      {c.status || "—"}
                    </span>
                    {c.category ? (
                      <span className="text-xs font-bold rounded-full bg-blue-50 text-blue-700 px-3 py-1">
                        {c.category}
                      </span>
                    ) : null}
                    <span className="text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 px-3 py-1">
                      {pct.toFixed(0)}%
                    </span>
                    {c.time ? (
                      <span className="text-xs font-bold rounded-full bg-slate-50 text-slate-600 px-3 py-1">
                        {c.time}
                      </span>
                    ) : null}
                  </div>

                  <div className="text-sm text-slate-500 mt-1 truncate">
                    {c.school_name || "School"} {c.province ? `• ${c.province}` : ""} {c.district ? `• ${c.district}` : ""}
                  </div>

                  <div className="mt-3">
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                     <div
  className={cx(
    "h-full",
    pct >= 80 ? "bg-emerald-600" : pct >= 40 ? "bg-indigo-600" : "bg-amber-500"
  )}
  style={{ width: `${pct}%` }}
/>
                    </div>
                    <div className="text-xs text-slate-500 mt-2 flex gap-3 flex-wrap">
                      <span>
                        <b className="text-slate-700">Raised:</b> {formatLKR(raised)}
                      </span>
                      <span>
                        <b className="text-slate-700">Goal:</b> {formatLKR(goal)}
                      </span>
                      <span>
                        <b className="text-slate-700">Remaining:</b> {formatLKR(Math.max(0, goal - raised))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <button
                    onClick={() => openDrawer(c)}
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
        <div
          onClick={closeDrawer}
          className={cx("absolute inset-0 bg-slate-900/20 transition-opacity duration-200", open ? "opacity-100" : "opacity-0")}
        />

        <aside
          className={cx(
            "absolute right-0 top-0 h-full w-full sm:w-[620px] bg-white shadow-2xl border-l border-slate-200 transition-transform duration-200",
            open ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="h-full flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Ministry Campaign View</div>
                <div className="text-xl font-extrabold text-slate-900">Campaign Details</div>
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
                <div className="text-slate-500">No campaign selected.</div>
              ) : detailLoading ? (
                <div className="text-slate-500">Loading campaign details…</div>
              ) : detailError ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
                  <div className="font-extrabold">Error</div>
                  <div className="text-sm mt-1">{detailError}</div>
                  <button
                    onClick={() => fetchDrawer(selected.request_id)}
                    className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-lg font-extrabold text-slate-900">
                          {detail?.campaign?.request_title || selected.request_title}
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          {detail?.campaign?.school_name || selected.school_name || "School"} •{" "}
                          {detail?.campaign?.province || selected.province || "—"}
                          {detail?.campaign?.district ? ` • ${detail.campaign.district}` : ""}
                        </div>
                        <div className="text-xs text-slate-500 mt-2">
                          Created: {fmtDate(detail?.campaign?.created_at || selected.created_at)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-slate-400">STATUS</div>
                        <div className="text-sm font-extrabold text-slate-900">
                          {detail?.campaign?.status || selected.status || "—"}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-bold text-slate-500">Goal</div>
                        <div className="text-sm font-extrabold text-slate-900 mt-1">
                          {formatLKR(Number(detail?.campaign?.estimated_price ?? selected.estimated_price ?? 0))}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-bold text-slate-500">Raised</div>
                        <div className="text-sm font-extrabold text-slate-900 mt-1">
                          {formatLKR(Number(detail?.campaign?.amount_raised ?? selected.amount_raised ?? 0))}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-bold text-slate-500">Paid Donations</div>
                        <div className="text-sm font-extrabold text-slate-900 mt-1">
                          {Number(detail?.stats?.paid_count ?? 0)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-slate-500">
                      <span className="font-semibold text-slate-700">Last Paid:</span> {fmtWhen(detail?.stats?.last_paid_at || null)}
                    </div>
                  </div>

                  {/* School contact */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-extrabold text-slate-900">School Contact</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-bold text-slate-500">Email</div>
                        <div className="text-sm font-bold text-slate-900 mt-1">{detail?.campaign?.contact_email || "—"}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-bold text-slate-500">Phone</div>
                        <div className="text-sm font-bold text-slate-900 mt-1">{detail?.campaign?.contact_phone || "—"}</div>
                      </div>
                      <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-bold text-slate-500">Address</div>
                        <div className="text-sm font-bold text-slate-900 mt-1">{detail?.campaign?.address || "—"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Donations */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-extrabold text-slate-900">Recent Donations</div>
                        <div className="text-xs text-slate-500 mt-1">Paid only</div>
                      </div>
                      <button
                        onClick={() => fetchDrawer(selected.request_id)}
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
                                  {x.donor_name || "Anonymous"}{" "}
                                  <span className="text-xs font-bold text-slate-500">{x.time ? `• ${x.time}` : ""}</span>
                                </div>
                                <div className="text-xs text-slate-500 mt-1">{x.donor_email || "—"}</div>
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

                  {/* Description */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-extrabold text-slate-900">Description</div>
                    <div className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">
                      {detail?.campaign?.description || selected.description || "—"}
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