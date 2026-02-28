import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000/api";
const SCHOOLS_ENDPOINT = `${API_BASE}/schools`;
const SCHOOL_DETAIL = (id: number) => `${API_BASE}/schools/${id}`;

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");
const formatLKR = (n: number) => `LKR ${Number.isFinite(n) ? n.toLocaleString() : "0"}`;

type SchoolRow = {
  school_id: number;
  school_name: string;
  registration_no?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  district?: string | null;
  province?: string | null;
  address?: string | null;

  status?: string; // normalized to lowercase by backend
  verified?: number;
  need_score?: number;

  total_received?: number;   // from fund_balance
  campaigns_count?: number;
  donations_count?: number;
  last_donation_at?: string | null;

  document_link?: string | null;
  logo_link?: string | null;

  initials?: string;
};

type SchoolsListRes = {
  schools: SchoolRow[];
  total: number;
  page: number;
  limit: number;
  filters: {
    provinces: string[];
    districts: string[];
  };
};

type CampaignMini = {
  request_id: number;
  request_title: string;
  category: string;
  amount_raised: number;
  estimated_price: number;
  status: string;
  created_at: string;
};

type DonationSummary = {
  total_received: number;
  donations_count: number;
  last_donation_at: string | null;
};

type SchoolDetailRes = {
  school: SchoolRow;
  campaigns: CampaignMini[];
  donation_summary: DonationSummary;
};

function Badge({ text, tone = "slate" }: { text: string; tone?: "slate" | "blue" | "amber" | "emerald" | "rose" }) {
  const cls =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : tone === "amber"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "rose"
      ? "bg-rose-50 text-rose-700 border-rose-100"
      : "bg-slate-50 text-slate-700 border-slate-200";

  return <span className={cx("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold", cls)}>{text}</span>;
}

function NeedPill({ score }: { score: number }) {
  const s = Number(score || 0);
  if (s >= 70) return <Badge tone="rose" text={`High Need • ${s.toFixed(1)}`} />;
  if (s >= 40) return <Badge tone="amber" text={`Medium Need • ${s.toFixed(1)}`} />;
  return <Badge tone="emerald" text={`Low Need • ${s.toFixed(1)}`} />;
}

function DrawerShell({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cx("fixed inset-0 z-[80]", open ? "pointer-events-auto" : "pointer-events-none")}>
      {/* Backdrop (light, user-friendly) */}
      <div
        className={cx(
          "absolute inset-0 bg-slate-900/25 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={cx(
          "absolute right-0 top-0 h-full w-full sm:w-[540px] bg-white shadow-2xl transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-slate-900 font-extrabold">{title}</div>
            <div className="text-slate-500 text-xs"> (Ministry)</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold hover:bg-slate-50"
          >
            Close
          </button>
        </div>
        <div className="p-5 overflow-y-auto h-[calc(100%-72px)]">{children}</div>
      </div>
    </div>
  );
}

export default function MinistrySchools() {
  // list state
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SchoolRow[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<{ provinces: string[]; districts: string[] }>({ provinces: [], districts: [] });
  const [err, setErr] = useState<string | null>(null);

  // query state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [search, setSearch] = useState("");
  const [province, setProvince] = useState("all");
  const [district, setDistrict] = useState("all");
  const [status, setStatus] = useState("all");
  const [needBand, setNeedBand] = useState("all");       // all|high|medium|low
  const [donationBand, setDonationBand] = useState("all"); // all|has|zero

  const [sortBy, setSortBy] = useState("created_at"); // created_at|need_score|total_received|school_name|donations_count|last_donation_at
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // drawer detail state
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<SchoolDetailRes | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const load = async () => {
    setLoading(true);
    setErr(null);

    try {
      const res = await axios.get<SchoolsListRes>(SCHOOLS_ENDPOINT, {
        params: {
          page,
          limit,
          search: search.trim() || undefined,
          province,
          district,
          status,
          needBand,
          donationBand,
          sortBy,
          sortDir,
        },
      });

      setRows(res.data.schools || []);
      setTotal(res.data.total || 0);
      setFilters(res.data.filters || { provinces: [], districts: [] });
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load schools");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, province, district, status, needBand, donationBand, sortBy, sortDir]);

  // search with debounce-ish button to keep simple
  const applySearch = () => {
    setPage(1);
    load();
  };

  const clearFilters = () => {
    setSearch("");
    setProvince("all");
    setDistrict("all");
    setStatus("all");
    setNeedBand("all");
    setDonationBand("all");
    setSortBy("created_at");
    setSortDir("desc");
    setPage(1);
    // load will run by deps
  };

  const openDetail = async (id: number) => {
    setOpen(true);
    setSelectedId(id);
    setDetail(null);
    setDetailLoading(true);

    try {
      const res = await axios.get<SchoolDetailRes>(SCHOOL_DETAIL(id));
      setDetail(res.data);
    } catch (e: any) {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const statusTone = (s?: string) => {
    const v = (s || "").toLowerCase();
    if (v === "active") return "emerald";
    if (v === "inactive") return "amber";
    return "slate";
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="text-slate-900 font-extrabold text-2xl">Schools </div>
          <div className="text-slate-500 text-sm">Monitor funding and need score (Ministry)</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearFilters}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-4">
            <div className="text-xs font-bold text-slate-500 mb-1">Search</div>
            <div className="flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="School name, email, district…"
              />
              <button
                onClick={applySearch}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-blue-700"
              >
                Search
              </button>
            </div>
          </div>

          {/* Province */}
          <div className="md:col-span-2">
            <div className="text-xs font-bold text-slate-500 mb-1">Province</div>
            <select
              value={province}
              onChange={(e) => {
                setProvince(e.target.value);
                setDistrict("all");
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              {filters.provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* District */}
          <div className="md:col-span-2">
            <div className="text-xs font-bold text-slate-500 mb-1">District</div>
            <select
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              {filters.districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="md:col-span-2">
            <div className="text-xs font-bold text-slate-500 mb-1">Status</div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Need band */}
          <div className="md:col-span-2">
            <div className="text-xs font-bold text-slate-500 mb-1">Need Level</div>
            <select
              value={needBand}
              onChange={(e) => {
                setNeedBand(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="high">High (≥ 70)</option>
              <option value="medium">Medium (40–69)</option>
              <option value="low">Low (&lt; 40)</option>
            </select>
          </div>

          {/* Donation band */}
          <div className="md:col-span-2">
            <div className="text-xs font-bold text-slate-500 mb-1">Funding</div>
            <select
              value={donationBand}
              onChange={(e) => {
                setDonationBand(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="has">Has funds</option>
              <option value="zero">No funds</option>
            </select>
          </div>

          {/* Sorting */}
          <div className="md:col-span-3">
            <div className="text-xs font-bold text-slate-500 mb-1">Sort</div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="created_at">Newest</option>
                <option value="need_score">Need Score</option>
                <option value="total_received">Total Received</option>
                <option value="donations_count">Donations Count</option>
                <option value="last_donation_at">Last Donation</option>
                <option value="school_name">School Name</option>
              </select>
              <select
                value={sortDir}
                onChange={(e) => {
                  setSortDir(e.target.value as "asc" | "desc");
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </div>

          {/* Summary */}
          <div className="md:col-span-9 flex items-end justify-between">
            <div className="text-sm text-slate-600">
              Showing <span className="font-extrabold text-slate-900">{rows.length}</span> of{" "}
              <span className="font-extrabold text-slate-900">{total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-slate-500 text-center py-12">Loading…</div>
        ) : err ? (
          <div className="p-6">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <div className="font-extrabold text-rose-800">Error</div>
              <div className="text-rose-700 text-sm mt-1">{err}</div>
              <button
                onClick={load}
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl">🏫</div>
            <div className="text-slate-900 font-extrabold text-xl mt-2">No schools found</div>
            <div className="text-slate-500 text-sm mt-1">Try changing filters.</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {rows.map((s) => (
              <button
                key={s.school_id}
                onClick={() => openDetail(s.school_id)}
                className="w-full text-left p-5 hover:bg-slate-50 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-slate-900 font-extrabold text-lg truncate">{s.school_name}</div>
                      <Badge tone={statusTone(s.status) as any} text={(s.status || "unknown").toUpperCase()} />
                      <NeedPill score={Number(s.need_score || 0)} />
                    </div>

                    <div className="text-slate-500 text-sm mt-1">
                      {s.province || "—"} • {s.district || "—"} {s.address ? `• ${s.address}` : ""}
                    </div>

                    <div className="text-slate-500 text-xs mt-2 flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-700">Campaigns:</span> {s.campaigns_count ?? 0}
                      <span className="text-slate-300">•</span>
                      <span className="font-bold text-slate-700">Donations:</span> {s.donations_count ?? 0}
                      {s.last_donation_at ? (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="font-bold text-slate-700">Last:</span> {new Date(s.last_donation_at).toLocaleDateString()}
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-slate-500 text-xs font-bold">TOTAL RECEIVED</div>
                    <div className="text-blue-700 font-extrabold text-xl mt-1">{formatLKR(Math.round(Number(s.total_received || 0)))}</div>
                    <div className="text-xs text-slate-500 mt-2 underline">View details</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          Page <span className="font-bold text-slate-700">{page}</span> / {totalPages}
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={cx(
              "rounded-xl border px-3 py-2 text-sm font-bold",
              page <= 1 ? "border-slate-200 text-slate-300 bg-white" : "border-slate-200 bg-white hover:bg-slate-50"
            )}
          >
            Prev
          </button>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className={cx(
              "rounded-xl border px-3 py-2 text-sm font-bold",
              page >= totalPages ? "border-slate-200 text-slate-300 bg-white" : "border-slate-200 bg-white hover:bg-slate-50"
            )}
          >
            Next
          </button>
        </div>
      </div>

      {/* Drawer */}
      <DrawerShell
        open={open}
        onClose={() => {
          setOpen(false);
          setSelectedId(null);
          setDetail(null);
        }}
        title={detail?.school?.school_name || (selectedId ? `School #${selectedId}` : "School")}
      >
        {detailLoading ? (
          <div className="text-slate-500">Loading details…</div>
        ) : !detail ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
            Could not load details.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Info */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-slate-900 font-extrabold">{detail.school.school_name}</div>
                  <div className="text-slate-500 text-sm mt-1">
                    {detail.school.province || "—"} • {detail.school.district || "—"}
                  </div>
                </div>
                <NeedPill score={Number(detail.school.need_score || 0)} />
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs text-slate-500 font-bold">Status</div>
                  <div className="text-slate-900 font-extrabold">{(detail.school.status || "unknown").toUpperCase()}</div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs text-slate-500 font-bold">Total Received</div>
                  <div className="text-blue-700 font-extrabold">
                    {formatLKR(Math.round(Number(detail.donation_summary?.total_received || detail.school.total_received || 0)))}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs text-slate-500 font-bold">Contact Email</div>
                  <div className="text-slate-900 font-bold">{detail.school.contact_email || "—"}</div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs text-slate-500 font-bold">Phone</div>
                  <div className="text-slate-900 font-bold">{detail.school.contact_phone || "—"}</div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 sm:col-span-2">
                  <div className="text-xs text-slate-500 font-bold">Address</div>
                  <div className="text-slate-900 font-bold">{detail.school.address || "—"}</div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {detail.school.document_link ? (
                  <a
                    href={detail.school.document_link}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold hover:bg-slate-50"
                  >
                    View Document
                  </a>
                ) : null}
                {detail.school.logo_link ? (
                  <a
                    href={detail.school.logo_link}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold hover:bg-slate-50"
                  >
                    View Logo
                  </a>
                ) : null}
              </div>
            </div>

            {/* Donation summary */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-slate-900 font-extrabold">Donation Summary</div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs text-slate-500 font-bold">Donations Count</div>
                  <div className="text-slate-900 font-extrabold">{detail.donation_summary?.donations_count ?? 0}</div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs text-slate-500 font-bold">Last Donation</div>
                  <div className="text-slate-900 font-extrabold">
                    {detail.donation_summary?.last_donation_at
                      ? new Date(detail.donation_summary.last_donation_at).toLocaleString()
                      : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Campaigns */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-slate-900 font-extrabold">Recent Campaigns</div>
              <div className="text-slate-500 text-sm">Last 5 requests</div>

              <div className="mt-3 space-y-2">
                {(detail.campaigns || []).length === 0 ? (
                  <div className="text-slate-500 text-sm">No campaigns</div>
                ) : (
                  detail.campaigns.map((c) => {
                    const goal = Number(c.estimated_price || 0);
                    const raised = Number(c.amount_raised || 0);
                    const pct = goal <= 0 ? 0 : Math.max(0, Math.min(100, (raised / goal) * 100));
                    return (
                      <div key={c.request_id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-slate-900 font-extrabold">{c.request_title}</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {c.category} • {c.status}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-500 font-bold">Raised</div>
                            <div className="text-blue-700 font-extrabold">{formatLKR(Math.round(raised))}</div>
                          </div>
                        </div>

                        <div className="mt-2 h-2 rounded-full bg-white border border-slate-200 overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {pct.toFixed(0)}% • Goal {formatLKR(Math.round(goal))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </DrawerShell>
    </div>
  );
}