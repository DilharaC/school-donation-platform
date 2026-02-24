import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/** ---------------- API ---------------- */
const API_BASE = "http://localhost:8000/api";
const SCHOOL_DONATIONS_ENDPOINT = `${API_BASE}/school/donations`;
const SCHOOL_TOP_DONORS_ENDPOINT = `${API_BASE}/school/top-donors`;

/** ---------------- Types ---------------- */
type DonationRow = {
  donation_id: number;
  request_id: number;
  donor_id?: number | null;
  donor_name: string;
  donor_email: string;
  amount: number;
  status: "paid" | "pending" | string;
  created_at: string;
  time?: string | null;
  request_title: string;
  school_name: string;
  district?: string | null;
  province?: string | null;
  initials?: string;
};

type TopDonor = {
  donor_name: string;
  donor_email: string;
  donations_count: number;
  total_donated: number;
  last_donated_at: string;
  last_time?: string | null;
  initials?: string;
};

type DonationsRes = {
  donations: DonationRow[];
  total: number;
  page: number;
  limit: number;
};

/** ---------------- UI Helpers ---------------- */
const cx = (...s: Array<string | false | undefined | null>) => s.filter(Boolean).join(" ");

const money = (n: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const badgeStatus = (s?: string) => {
  const v = (s || "").toLowerCase();
  if (v === "paid") return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70";
  if (v === "pending") return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/70";
  return "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200/70";
};

const avatarRing = "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200/60";

/** Softer card */
const Card: React.FC<{ children: any; className?: string }> = ({ children, className }) => (
  <div
    className={cx(
      "rounded-2xl bg-white",
      "border border-slate-200/70",
      "shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_30px_rgba(15,23,42,0.06)]",
      className
    )}
  >
    {children}
  </div>
);

const Button: React.FC<{
  children: any;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  kind?: "primary" | "secondary";
  type?: "button" | "submit";
}> = ({ children, onClick, className, disabled, kind = "secondary", type = "button" }) => {
  const base =
    "px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-[1px]";
  const styles =
    kind === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cx(base, styles, className)}>
      {children}
    </button>
  );
};

const Input: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}> = ({ label, value, onChange, placeholder, type = "text" }) => (
  <label className="block">
    <div className="text-xs font-semibold text-slate-600 mb-1">{label}</div>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cx(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm",
        "outline-none focus:ring-4 focus:ring-slate-200/60 focus:border-slate-300"
      )}
    />
  </label>
);

const Select: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: any;
}> = ({ label, value, onChange, children }) => (
  <label className="block">
    <div className="text-xs font-semibold text-slate-600 mb-1">{label}</div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm",
        "outline-none focus:ring-4 focus:ring-slate-200/60 focus:border-slate-300"
      )}
    >
      {children}
    </select>
  </label>
);

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** ---------------- Page ---------------- */
const SchoolDonations: React.FC = () => {
  const [loading, setLoading] = useState(true);

  const [rows, setRows] = useState<DonationRow[]>([]);
  const [total, setTotal] = useState(0);

  const [topDonors, setTopDonors] = useState<TopDonor[]>([]);
  const [topDonorsLoading, setTopDonorsLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(1);
  const limit = 10;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const fetchDonations = async (p = page) => {
    setLoading(true);
    try {
      const res = await axios.get<DonationsRes>(SCHOOL_DONATIONS_ENDPOINT, {
        withCredentials: true,
        params: {
          page: p,
          limit,
          search: search || "",
          status,
          sortBy,
          sortDir,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
        },
      });

      setRows(res.data.donations || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopDonors = async () => {
    setTopDonorsLoading(true);
    try {
      const res = await axios.get(SCHOOL_TOP_DONORS_ENDPOINT, {
        withCredentials: true,
        params: {
          limit: 8,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
        },
      });
      setTopDonors(res.data?.top_donors || []);
    } catch (e) {
      setTopDonors([]);
    } finally {
      setTopDonorsLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations(1);
    fetchTopDonors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchDonations(1);
      fetchTopDonors();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, sortBy, sortDir, dateFrom, dateTo]);

  const goPage = async (p: number) => {
    const next = clamp(p, 1, totalPages);
    setPage(next);
    await fetchDonations(next);
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] pb-12">
      {/* Softer background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 to-white" />
      <div className="absolute inset-x-0 top-0 -z-10 h-52 bg-gradient-to-r from-indigo-50 via-white to-emerald-50 opacity-60" />

      <div className="pt-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-slate-900">Donations</div>
            <div className="text-sm text-slate-600 mt-1">All donations received for your school (paid + pending).</div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => fetchDonations(page)} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Top Donors + Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top Donors */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-900">Top Donors</div>
              <div className="text-xs text-slate-500">All time</div>
            </div>

            {topDonorsLoading ? (
              <div className="text-slate-500 text-sm mt-4">Loading…</div>
            ) : topDonors.length === 0 ? (
              <div className="text-slate-500 text-sm mt-4">No donors yet.</div>
            ) : (
              <div className="mt-4 space-y-3">
                {topDonors.map((d, idx) => (
                  <div
                    key={idx}
                    className={cx(
                      "flex items-center justify-between gap-3",
                      "rounded-xl px-2 py-2",
                      "hover:bg-slate-50/70 transition"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* ⬇️ CHANGED: avatar text weight softer */}
                      <div className={cx("h-9 w-9 rounded-full grid place-items-center font-medium text-[11px]", avatarRing)}>
                        {d.initials || "A"}
                      </div>

                      <div className="min-w-0">
                        {/* ⬇️ CHANGED: name not bold */}
                        <div className="font-semibold text-slate-900 truncate">{d.donor_name}</div>
                        <div className="text-xs text-slate-500 truncate">{d.donor_email}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      {/* ⬇️ CHANGED: amount slightly less heavy */}
                      <div className="font-bold text-slate-900">{money(d.total_donated)}</div>
                      <div className="text-xs text-slate-500">{d.last_time || ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Filters */}
          <Card className="p-4 lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="Search" value={search} onChange={setSearch} placeholder="Donor / Email / Request..." />

              <Select label="Status" value={status} onChange={setStatus}>
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </Select>

              <Select
                label="Sort"
                value={`${sortBy}:${sortDir}`}
                onChange={(v) => {
                  const [sb, sd] = v.split(":");
                  setSortBy(sb);
                  setSortDir(sd);
                }}
              >
                <option value="created_at:desc">Newest</option>
                <option value="created_at:asc">Oldest</option>
                <option value="amount:desc">Amount high</option>
                <option value="amount:asc">Amount low</option>
                <option value="status:asc">Status A-Z</option>
                <option value="status:desc">Status Z-A</option>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <Input label="Date From" type="date" value={dateFrom} onChange={setDateFrom} />
              <Input label="Date To" type="date" value={dateTo} onChange={setDateTo} />

              <div className="flex items-end gap-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    setSearch("");
                    setStatus("all");
                    setSortBy("created_at");
                    setSortDir("desc");
                    setDateFrom("");
                    setDateTo("");
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* List / Table */}
      <div className="mt-6">
        {loading ? (
          <div className="text-slate-500 text-center py-10">Loading…</div>
        ) : rows.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="text-4xl mb-3">💸</div>
            <div className="text-slate-900 font-extrabold text-xl">No donations found</div>
            <div className="text-slate-500 text-sm mt-1">Try changing filters.</div>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            {/* Header Row (desktop) */}
            <div className="hidden md:grid grid-cols-[280px_140px_1fr_120px_160px] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200">
              <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wide">Donor</div>
              <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wide">Amount</div>
              <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wide">Request</div>
              <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wide">Status</div>
              <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wide text-right">Date</div>
            </div>

            {/* Body */}
            <div className="divide-y divide-slate-100">
              {rows.map((d) => (
                <div key={d.donation_id} className={cx("px-5 py-4", "hover:bg-slate-50/60 transition")}>
                  {/* Desktop grid */}
                  <div className="hidden md:grid grid-cols-[280px_140px_1fr_120px_160px] gap-4 items-center">
                    {/* Donor */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* ⬇️ CHANGED: avatar text weight softer */}
                      <div className={cx("h-10 w-10 rounded-full grid place-items-center font-medium text-xs shrink-0", avatarRing)}>
                        {d.initials || "A"}
                      </div>
                      <div className="min-w-0">
                        {/* ⬇️ CHANGED: name not bold */}
                        <div className="font-semibold text-slate-900 truncate">{d.donor_name || "Anonymous"}</div>
                        <div className="text-xs text-slate-500 truncate">{d.donor_email}</div>
                      </div>
                    </div>

                    {/* Amount (keep bold if you want) */}
                    <div className="font-semibold text-slate-900 tabular-nums">{money(d.amount)}</div>

                    {/* Request */}
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{d.request_title}</div>
                    </div>

                    {/* Status */}
                    <div>
                      <span
                        className={cx(
                          "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap",
                          badgeStatus(d.status)
                        )}
                      >
                        {String(d.status).toLowerCase() === "paid" ? "✓ Paid" : d.status}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="text-right whitespace-nowrap">
                      <div className="text-sm text-slate-700">{new Date(d.created_at).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-500">{d.time || ""}</div>
                    </div>
                  </div>

                  {/* Mobile stacked */}
                  <div className="md:hidden flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* ⬇️ CHANGED: avatar text weight softer */}
                        <div className={cx("h-10 w-10 rounded-full grid place-items-center font-medium text-xs shrink-0", avatarRing)}>
                          {d.initials || "A"}
                        </div>

                        <div className="min-w-0">
                          {/* ⬇️ CHANGED: name not bold */}
                          <div className="font-semibold text-slate-900 truncate">{d.donor_name || "Anonymous"}</div>
                          <div className="text-xs text-slate-500 truncate">{d.donor_email}</div>
                        </div>
                      </div>

                      <div className="font-extrabold text-slate-900 tabular-nums shrink-0">{money(d.amount)}</div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500">Request</div>
                        <div className="font-semibold text-slate-900 truncate">{d.request_title}</div>
                      </div>

                      <span
                        className={cx(
                          "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap shrink-0",
                          badgeStatus(d.status)
                        )}
                      >
                        {String(d.status).toLowerCase() === "paid" ? "✓ Paid" : d.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <div>{new Date(d.created_at).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-500">{d.time || ""}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Pagination */}
        {rows.length > 0 && !loading && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button onClick={() => goPage(1)} disabled={page <= 1}>
              {"<<"}
            </Button>
            <Button onClick={() => goPage(page - 1)} disabled={page <= 1}>
              Prev
            </Button>
            <div className="px-3 py-2 text-sm text-slate-700">
              Page <b>{page}</b> / {totalPages}
            </div>
            <Button onClick={() => goPage(page + 1)} disabled={page >= totalPages}>
              Next
            </Button>
            <Button onClick={() => goPage(totalPages)} disabled={page >= totalPages}>
              {">>"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolDonations;