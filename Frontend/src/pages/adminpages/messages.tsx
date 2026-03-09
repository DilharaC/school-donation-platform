import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/* ===================== Types ===================== */
type ContactMessageRow = {
  id: number;
  name: string;
  email: string;
  message: string;
  created_at: string;
  updated_at?: string;
};

type SortBy = "created_at" | "name" | "email";
type SortDir = "asc" | "desc";

/* ===================== Helpers ===================== */
const API_BASE = "http://localhost:8000/api";

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const formatTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const computeInitials = (name?: string) => {
  const n = (name || "User").trim();
  const parts = n.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "U";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
};

const truncateText = (text?: string, max = 90) => {
  const s = String(text || "");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}...`;
};

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const makeCSV = (rows: any[]) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);

  const escape = (v: any) => {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replaceAll('"', '""')}"`;
    }
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

/* ===================== Small UI ===================== */
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${className}`}>{children}</div>
);

const Pill: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = "", children }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${className}`}>
    {children}
  </span>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
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

const Avatar: React.FC<{ initials: string }> = ({ initials }) => (
  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100 shrink-0">
    {initials}
  </span>
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

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: string;
}> = ({ title, value, icon, tone = "bg-blue-50 text-blue-700 border-blue-100" }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p>
      </div>
      <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${tone}`}>
        {icon}
      </div>
    </div>
  </Card>
);

const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  row: ContactMessageRow | null;
  onCopy: (text: string, label: string) => void;
}> = ({ open, onClose, row, onCopy }) => {
  if (!open || !row) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white shadow-2xl border-l border-slate-200 p-5 overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold text-slate-900 truncate">Message #{row.id}</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {formatDate(row.created_at)} • {formatTime(row.created_at)}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-700"
            aria-label="Close"
            type="button"
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

        <div className="mt-5 flex items-center gap-3">
          <Avatar initials={computeInitials(row.name)} />
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{row.name}</p>
            <p className="text-sm text-slate-500 truncate">{row.email}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={`mailto:${row.email}?subject=Reply to your message`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold bg-blue-700 text-white hover:bg-blue-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="2" />
              <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="2" />
            </svg>
            Reply by Email
          </a>

          <SecondaryButton onClick={() => onCopy(row.email, "Email")}>
            Copy Email
          </SecondaryButton>

          <SecondaryButton onClick={() => onCopy(row.message, "Message")}>
            Copy Message
          </SecondaryButton>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-600">Sender name</p>
            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800">
              {row.name}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-600">Email address</p>
            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 break-all">
              {row.email}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-600">Full message</p>
            <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-800 whitespace-pre-wrap leading-relaxed">
              {row.message}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===================== Page ===================== */
const AdminMessagesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ContactMessageRow[]>([]);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [selected, setSelected] = useState<ContactMessageRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [copiedMsg, setCopiedMsg] = useState("");

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/contact-messages`, {
        params: {
          search,
          page,
          limit,
          sortBy,
          sortDir,
        },
      });

      const list: ContactMessageRow[] = res.data?.messages || res.data?.data || [];
      const totalCount = Number(res.data?.total || list.length || 0);

      setRows(list);
      setTotal(totalCount);
    } catch (error) {
      console.error("Messages load error", error);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [page, sortBy, sortDir]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchData();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [search]);

  useEffect(() => {
    if (!copiedMsg) return;
    const t = setTimeout(() => setCopiedMsg(""), 2000);
    return () => clearTimeout(t);
  }, [copiedMsg]);

  const onSort = (col: SortBy) => {
    if (sortBy !== col) {
      setSortBy(col);
      setSortDir(col === "created_at" ? "desc" : "asc");
      setPage(1);
      return;
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    setPage(1);
  };

  const clearAll = () => {
    setSearch("");
    setSortBy("created_at");
    setSortDir("desc");
    setPage(1);
  };

  const exportCurrentPage = () => {
    downloadCSV(
      `contact_messages_page_${page}.csv`,
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        message: r.message,
        created_at: r.created_at,
      }))
    );
  };

  const handleCopy = async (text: string, label: string) => {
    const ok = await copyText(text);
    setCopiedMsg(ok ? `${label} copied` : `Failed to copy ${label.toLowerCase()}`);
  };

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return rows.filter((r) => new Date(r.created_at).toDateString() === today).length;
  }, [rows]);

  return (
    <div className="p-6 space-y-6">
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        row={selected}
        onCopy={handleCopy}
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Messages</h1>
          <p className="text-slate-500 mt-1">
            Contact form messages from visitors and schools.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Pill className="bg-slate-50 text-slate-700 border-slate-200">
            Total messages: {total}
          </Pill>

          {copiedMsg && (
            <Pill className="bg-green-50 text-green-700 border-green-200">
              {copiedMsg}
            </Pill>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total messages"
          value={total}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" stroke="currentColor" strokeWidth="2" />
            </svg>
          }
        />

        <StatCard
          title="On this page"
          value={rows.length}
          tone="bg-emerald-50 text-emerald-700 border-emerald-100"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />

        <StatCard
          title="Today"
          value={todayCount}
          tone="bg-amber-50 text-amber-700 border-amber-100"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <rect x="3" y="6" width="18" height="15" rx="2" stroke="currentColor" strokeWidth="2" />
            </svg>
          }
        />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-7">
            <label className="text-xs font-semibold text-slate-600">Search</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or message..."
              className="w-full mt-1"
            />
          </div>

          <div className="md:col-span-5 flex flex-wrap gap-2 justify-end">
            <SecondaryButton onClick={clearAll}>Clear</SecondaryButton>
            <SecondaryButton onClick={exportCurrentPage} disabled={!rows.length}>
              Export CSV
            </SecondaryButton>
            <Button onClick={fetchData}>Refresh</Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-4">
        {loading ? (
          <div className="text-slate-500 py-12 text-center">Loading messages...</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" stroke="currentColor" strokeWidth="2.5" />
              </svg>
            </div>
            <p className="mt-3 font-semibold text-slate-900">No messages found</p>
            <p className="text-sm text-slate-500 mt-1">Try another search or refresh the page.</p>
            <div className="mt-4 flex justify-center gap-2">
              <SecondaryButton onClick={clearAll}>Clear filters</SecondaryButton>
              <Button onClick={fetchData}>Refresh</Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[620px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th
                    className="py-3 pr-3 cursor-pointer select-none"
                    onClick={() => onSort("name")}
                    title="Sort by name"
                  >
                    Sender
                    <SortIcon active={sortBy === "name"} dir={sortBy === "name" ? sortDir : "asc"} />
                  </th>

                  <th
                    className="py-3 pr-3 cursor-pointer select-none"
                    onClick={() => onSort("email")}
                    title="Sort by email"
                  >
                    Email
                    <SortIcon active={sortBy === "email"} dir={sortBy === "email" ? sortDir : "asc"} />
                  </th>

                  <th className="py-3 pr-3">Message</th>

                  <th
                    className="py-3 pr-3 cursor-pointer select-none"
                    onClick={() => onSort("created_at")}
                    title="Sort by date"
                  >
                    Date
                    <SortIcon active={sortBy === "created_at"} dir={sortBy === "created_at" ? sortDir : "desc"} />
                  </th>

                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <Avatar initials={computeInitials(r.name)} />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{r.name}</div>
                          <div className="text-xs text-slate-500">Message #{r.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-slate-700 truncate max-w-[220px]">{r.email}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(r.email, "Email")}
                          className="shrink-0 p-1.5 rounded-lg hover:bg-slate-200 text-slate-600"
                          title="Copy email"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" />
                          </svg>
                        </button>
                      </div>
                    </td>

                    <td className="py-3 pr-3 text-slate-700 max-w-[420px]">
                      <div className="truncate">{truncateText(r.message, 110)}</div>
                    </td>

                    <td className="py-3 pr-3 text-slate-700 whitespace-nowrap">
                      <div>{formatDate(r.created_at)}</div>
                      <div className="text-xs text-slate-500">{formatTime(r.created_at)}</div>
                    </td>

                    <td className="py-3 text-right">
  <div className="flex items-center justify-end gap-2">
    <button
      type="button"
      onClick={() => handleCopy(r.email, "Email")}
      className="px-3 py-1.5 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
      title="Copy email"
    >
      Copy Email
    </button>

    <a
      href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        r.email
      )}&su=${encodeURIComponent(
        "Reply to your message"
      )}&body=${encodeURIComponent(`Hello ${r.name},\n\n`)}`}
      target="_blank"
      rel="noreferrer"
      className="px-3 py-1.5 rounded-xl font-semibold bg-blue-700 text-white hover:bg-blue-800"
    >
      Gmail
    </a>

    <button
      type="button"
      onClick={() => {
        setSelected(r);
        setDrawerOpen(true);
      }}
      className="px-3 py-1.5 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
    >
      View
    </button>
  </div>
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
      </Card>
    </div>
  );
};

export default AdminMessagesPage;