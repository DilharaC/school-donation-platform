import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
// import "../css/index.css";

/* ===================== Types ===================== */
type DonationStatus = "paid" | "pending" | "failed" | "canceled" | "cancelled" | "refunded";

type DonationRow = {
  donation_id: number;
  request_id: number;

  donor_name: string;
  donor_email: string;
  initials?: string;

  amount: number;
  status: DonationStatus | string;

  created_at: string;
  time?: string;

  request_title?: string;
  school_name?: string;
  district?: string;
  province?: string;

  // optional fields if backend returns
  stripe_session_id?: string;
  message?: string;
  recurring?: string;
  anonymous?: number;
};

type SortBy = "created_at" | "amount" | "status";
type SortDir = "asc" | "desc";
type StatusFilter = "paid" | "pending" | "all";
type DateChip = "all" | "7d" | "30d" | "month";

/* ===================== Helpers ===================== */
const fmtMoney = (n: number) => `LKR ${Number(n || 0).toLocaleString()}`;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
};
const formatTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const computeInitials = (name?: string) => {
  const n = (name || "Anonymous").trim();
  if (!n) return "AN";
  const parts = n.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "A";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
};

const statusUI = (s: string) => {
  const st = (s || "").toLowerCase();

  if (st === "paid") {
    return {
      label: "Paid",
      tone: "bg-green-50 text-green-700 border-green-200",
      dot: "bg-green-500",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path
            d="M20 6 9 17l-5-5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    };
  }

  if (st === "pending") {
    return {
      label: "Pending",
      tone: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path
            d="M12 6v6l4 2"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            stroke="currentColor"
            strokeWidth="2.5"
          />
        </svg>
      ),
    };
  }

  // failed / canceled / refunded / unknown
  return {
    label: st ? st.charAt(0).toUpperCase() + st.slice(1) : "Unknown",
    tone: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
        <path
          d="M12 9v4"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M12 17h.01"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M10.29 3.86 1.82 18A2 2 0 0 0 3.53 21h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  };
};

const makeCSV = (rows: any[]) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);

  const escape = (v: any) => {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };

  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
};

const downloadCSV = (filename: string, rows: any[]) => {
  const csv = makeCSV(rows);
  if (!csv) return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const calcDateFrom = (chip: DateChip) => {
  if (chip === "all") return null;
  const now = new Date();
  if (chip === "7d") now.setDate(now.getDate() - 7);
  if (chip === "30d") now.setDate(now.getDate() - 30);
  if (chip === "month") now.setDate(1);
  return now.toISOString();
};

/* ===================== Small UI ===================== */
const Pill: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = "", children }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${className}`}>
    {children}
  </span>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${className}`}>{children}</div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 ${props.className || ""}`}
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className={`text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 ${props.className || ""}`}
  />
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
  <button
    {...props}
    className={`px-4 py-2 rounded-xl font-semibold bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed ${props.className || ""}`}
  />
);

const SecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
  <button
    {...props}
    className={`px-4 py-2 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed ${props.className || ""}`}
  />
);

const Chip: React.FC<{ active?: boolean; onClick?: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
      active
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
    }`}
    type="button"
  >
    {children}
  </button>
);

const SortIcon: React.FC<{ active: boolean; dir: SortDir }> = ({ active, dir }) => (
  <span className={`inline-flex items-center ml-1 ${active ? "text-slate-700" : "text-slate-300"}`}>
    {dir === "asc" ? (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M12 5l-6 6h12l-6-6Z" fill="currentColor" />
      </svg>
    ) : (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M12 19l6-6H6l6 6Z" fill="currentColor" />
      </svg>
    )}
  </span>
);

const Avatar: React.FC<{ initials: string }> = ({ initials }) => (
  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100 shrink-0">
    {initials}
  </span>
);

const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  row: DonationRow | null;
}> = ({ open, onClose, row }) => {
  if (!open || !row) return null;

  const s = statusUI(String(row.status || ""));
  return (
    <div className="fixed inset-0 z-[60]">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* panel */}
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-2xl border-l border-slate-200 p-5 overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold text-slate-900 truncate">Donation #{row.donation_id}</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {formatDate(row.created_at)} • {formatTime(row.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-700"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6 6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Pill className={`${s.tone}`}>{s.icon}<span>{s.label}</span></Pill>
          <Pill className="bg-slate-50 text-slate-700 border-slate-200">
            <span className="font-bold">{fmtMoney(row.amount)}</span>
          </Pill>
          <Pill className="bg-slate-50 text-slate-700 border-slate-200">
            Request ID: <span className="font-bold ml-1">{row.request_id}</span>
          </Pill>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-600">Donor</p>
            <div className="mt-2 flex items-center gap-3">
              <Avatar initials={row.initials || computeInitials(row.donor_name)} />
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">{row.donor_name || "Anonymous"}</p>
                <p className="text-sm text-slate-500 truncate">{row.donor_email || "—"}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-600">School</p>
            <p className="mt-2 font-semibold text-slate-900">{row.school_name || "—"}</p>
            <p className="text-sm text-slate-500">
              {(row.district || "—")}{row.province ? ` • ${row.province}` : ""}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-600">Campaign</p>
            <p className="mt-2 font-semibold text-slate-900">{row.request_title || `Request #${row.request_id}`}</p>
          </div>

          {(row.message || row.recurring || row.stripe_session_id) && (
            <div>
              <p className="text-xs font-bold text-slate-600">Extra</p>
              <div className="mt-2 space-y-2 text-sm text-slate-700">
                {row.message && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <p className="text-xs font-bold text-slate-600 mb-1">Message</p>
                    <p className="whitespace-pre-wrap">{row.message}</p>
                  </div>
                )}
                {row.recurring && (
                  <p>
                    <span className="font-semibold">Recurring:</span> {row.recurring}
                  </p>
                )}
                {row.stripe_session_id && (
                  <p className="break-all">
                    <span className="font-semibold">Stripe session:</span> {row.stripe_session_id}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs font-bold text-slate-600">Status timeline (simple)</p>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                <span>Current: {s.label}</span>
              </div>
              <p className="text-xs text-slate-500">
                For full timeline, store status changes in a separate table (optional).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===================== Page ===================== */
const DonationsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DonationRow[]>([]);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("paid");

  // ✅ quick filters
  const [dateChip, setDateChip] = useState<DateChip>("all");

  // ✅ sorting
  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // pagination
  const [page, setPage] = useState(1);
  const limit = 10;

  // ✅ drawer
  const [selected, setSelected] = useState<DonationRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateFrom = calcDateFrom(dateChip);

      const res = await axios.get("http://localhost:8000/api/donations", {
        params: {
          search,
          status,
          page,
          limit,
          sortBy,
          sortDir,
          dateFrom, // backend optional; if not implemented, it will ignore
        },
      });

      const list: DonationRow[] = (res.data?.donations || []).map((r: DonationRow) => ({
        ...r,
        initials: r.initials || computeInitials(r.donor_name),
      }));

      setRows(list);
      setTotal(Number(res.data?.total || 0));
    } catch (e) {
      console.error("Donations load error", e);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [page, status, sortBy, sortDir, dateChip]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchData();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [search]);

  const totalPaidOnPage = useMemo(
    () => rows.reduce((sum, r) => sum + (String(r.status).toLowerCase() === "paid" ? Number(r.amount || 0) : 0), 0),
    [rows]
  );

  const exportCurrentPage = () => {
    downloadCSV(
      `donations_page_${page}.csv`,
      rows.map((r) => ({
        donation_id: r.donation_id,
        request_id: r.request_id,
        donor_name: r.donor_name,
        donor_email: r.donor_email,
        school_name: r.school_name,
        district: r.district,
        province: r.province,
        request_title: r.request_title,
        amount: r.amount,
        status: r.status,
        created_at: r.created_at,
      }))
    );
  };

  const onSort = (col: SortBy) => {
    if (sortBy !== col) {
      setSortBy(col);
      setSortDir(col === "created_at" ? "desc" : "desc");
      setPage(1);
      return;
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    setPage(1);
  };

  const clearAll = () => {
    setSearch("");
    setStatus("paid");
    setDateChip("all");
    setSortBy("created_at");
    setSortDir("desc");
    setPage(1);
  };

  return (
    <div className="p-6 space-y-6">
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} row={selected} />

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Donations</h1>
          <p className="text-slate-500 mt-1">All donations with donor, school & campaign info.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill className="bg-slate-50 text-slate-700 border-slate-200">Total results: {total}</Pill>
          <Pill className="bg-green-50 text-green-700 border-green-200">Paid (this page): {fmtMoney(totalPaidOnPage)}</Pill>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-6">
            <label className="text-xs font-semibold text-slate-600">Search</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Donor / Email / School / Province / Campaign..."
              className="w-full mt-1"
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-slate-600">Status</label>
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as any);
                setPage(1);
              }}
              className="w-full mt-1"
            >
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="all">All</option>
            </Select>
          </div>

          <div className="md:col-span-3 flex gap-2 justify-end">
            <SecondaryButton onClick={clearAll}>Clear</SecondaryButton>
            <SecondaryButton onClick={exportCurrentPage} disabled={!rows.length}>
              Export CSV
            </SecondaryButton>
            <Button onClick={fetchData}>Refresh</Button>
          </div>

          {/* Quick chips */}
          <div className="md:col-span-12 flex flex-wrap gap-2 pt-2">
            <div className="flex flex-wrap gap-2">
              <Chip active={status === "all"} onClick={() => { setStatus("all"); setPage(1); }}>
                All
              </Chip>
              <Chip active={status === "paid"} onClick={() => { setStatus("paid"); setPage(1); }}>
                Paid
              </Chip>
              <Chip active={status === "pending"} onClick={() => { setStatus("pending"); setPage(1); }}>
                Pending
              </Chip>
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            <div className="flex flex-wrap gap-2">
              <Chip active={dateChip === "all"} onClick={() => { setDateChip("all"); setPage(1); }}>
                All time
              </Chip>
              <Chip active={dateChip === "7d"} onClick={() => { setDateChip("7d"); setPage(1); }}>
                Last 7 days
              </Chip>
              <Chip active={dateChip === "30d"} onClick={() => { setDateChip("30d"); setPage(1); }}>
                Last 30 days
              </Chip>
              <Chip active={dateChip === "month"} onClick={() => { setDateChip("month"); setPage(1); }}>
                This month
              </Chip>
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-4">
        {loading ? (
          <div className="text-slate-500 py-10 text-center">Loading...</div>
        ) : rows.length === 0 ? (
          // ✅ Better empty state
          <div className="py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 21l-4.3-4.3"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
              </svg>
            </div>
            <p className="mt-3 font-semibold text-slate-900">No donations found</p>
            <p className="text-sm text-slate-500 mt-1">Try clearing filters or changing the search.</p>
            <div className="mt-4 flex justify-center gap-2">
              <SecondaryButton onClick={clearAll}>Clear filters</SecondaryButton>
              <Button onClick={fetchData}>Refresh</Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[560px]">
            <table className="w-full text-sm">
              {/* ✅ Sticky header */}
              <thead className="sticky top-0 bg-white z-10">
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-3 pr-3">Donor</th>

                  {/* ✅ Sortable headers */}
                  <th
                    className="py-3 pr-3 text-right cursor-pointer select-none"
                    onClick={() => onSort("amount")}
                    title="Sort by amount"
                  >
                    Amount
                    <SortIcon active={sortBy === "amount"} dir={sortBy === "amount" ? sortDir : "desc"} />
                  </th>

                  <th className="py-3 pr-3">School</th>
                  <th className="py-3 pr-3">Campaign</th>

                  <th
                    className="py-3 pr-3 cursor-pointer select-none"
                    onClick={() => onSort("status")}
                    title="Sort by status"
                  >
                    Status
                    <SortIcon active={sortBy === "status"} dir={sortBy === "status" ? sortDir : "desc"} />
                  </th>

                  <th
                    className="py-3 pr-3 cursor-pointer select-none"
                    onClick={() => onSort("created_at")}
                    title="Sort by date"
                  >
                    Date
                    <SortIcon active={sortBy === "created_at"} dir={sortBy === "created_at" ? sortDir : "desc"} />
                  </th>

                  {/* ✅ View action */}
                  <th className="py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => {
                  const s = statusUI(String(r.status || ""));
                  return (
                    // ✅ Row hover highlight + smooth transition
                    <tr key={r.donation_id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      {/* Donor with avatar */}
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          <Avatar initials={r.initials || computeInitials(r.donor_name)} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-slate-900 truncate">
                                {r.donor_name || "Anonymous"}
                              </div>
                              {!r.donor_name && (
                                <Pill className="bg-slate-50 text-slate-700 border-slate-200">Anonymous</Pill>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 truncate">{r.donor_email || "—"}</div>
                          </div>
                        </div>
                      </td>

                      {/* Amount: right aligned */}
                      <td className="py-3 pr-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {fmtMoney(r.amount)}
                      </td>

                      {/* School */}
                      <td className="py-3 pr-3 text-slate-700">
                        <div className="font-semibold truncate">{r.school_name || "—"}</div>
                        <div className="text-xs text-slate-500 truncate">
                          {r.district || ""}{r.province ? ` • ${r.province}` : ""}
                        </div>
                      </td>

                      {/* Campaign */}
                      <td className="py-3 pr-3 text-slate-700">
                        <div className="font-semibold truncate">
                          {r.request_title || `Request #${r.request_id}`}
                        </div>
                        <div className="text-xs text-slate-500">Request ID: {r.request_id}</div>
                      </td>

                      {/* Status: better pill colors + icons */}
                      <td className="py-3 pr-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${s.tone}`}>
                          {s.icon}
                          {s.label}
                        </span>
                      </td>

                      {/* Date: show date + time */}
                      <td className="py-3 pr-3 text-slate-700 whitespace-nowrap">
                        <div className="text-sm">{formatDate(r.created_at)}</div>
                        <div className="text-xs text-slate-500">
                          {r.time || formatTime(r.created_at)}
                        </div>
                      </td>

                      {/* View action */}
                      <td className="py-3 text-right">
                        <button
                          className="px-3 py-1.5 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                          onClick={() => {
                            setSelected(r);
                            setDrawerOpen(true);
                          }}
                          type="button"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Page {page} / {pages}
          </div>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </SecondaryButton>
            <Button onClick={() => setPage((p) => p + 1)} disabled={page >= pages}>
              Next
            </Button>
          </div>
        </div>

        {/* Small note about sorting */}
        
      </Card>
    </div>
  );
};

export default DonationsPage;