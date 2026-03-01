// src/pages/Campaign.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

/* =======================
   API (edit endpoints here)
======================= */
const API = {
list: "http://localhost:8000/api/admin/donation_requests",
  delete: (id: number) => `http://localhost:8000/api/donation_requests/${id}`,

  // Optional (recommended):
  detail: (id: number) => `http://localhost:8000/api/donation_requests/${id}`,

  // Optional (recommended):
  updateStatus: (id: number) => `http://localhost:8000/api/donation_requests/${id}/status`,

  // Optional (recommended):
  donations: (id: number) => `http://localhost:8000/api/donation_requests/${id}/donations`,
};

/* =======================
   Small UI primitives
======================= */
const Card: React.FC<{
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${className}`}>
    {(title || subtitle) && (
      <div className="px-6 pt-6">
        {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
    )}
    <div className={`${title || subtitle ? "px-6 pb-6 pt-4" : "p-6"}`}>{children}</div>
  </div>
);

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  className?: string;
  type?: "button" | "submit";
}> = ({ children, onClick, disabled, variant = "primary", className = "", type = "button" }) => {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
};

const IconButton: React.FC<{
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  ariaLabel: string;
}> = ({ onClick, disabled, className = "", children, ariaLabel }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

const Pill: React.FC<{ children: React.ReactNode; tone?: "green" | "amber" | "blue" | "slate" }> = ({
  children,
  tone = "slate",
}) => {
  const tones: Record<string, string> = {
    green: "bg-green-50 text-green-700 border-green-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${tones[tone]}`}>
      {children}
    </span>
  );
};

const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="w-full">
    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
      <div
        className="h-2 rounded-full bg-green-600 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  </div>
);

const fmtMoney = (n: number) => `LKR ${Number(n || 0).toLocaleString()}`;

/* =======================
   Types
======================= */
interface Campaign {
  request_id: number;
  request_title: string;
  school_name: string;
  category: string;
  estimated_price: number;
  amount_raised: number;
  status: "Approved" | "Pending";

  // Optional extra fields (if backend provides)
  description?: string;
  image_url?: string | null;
  document_url?: string | null;
}

interface DonationRow {
  donation_id?: number;
  donor_name?: string;
  donor_email?: string;
  amount: number;
  created_at?: string;
  status?: string;
}

/* =======================
   Helpers
======================= */
const getProgress = (c: Campaign) => {
  const target = Number(c.estimated_price || 0);
  const raised = Number(c.amount_raised || 0);
  if (target <= 0) return 0;
  return Math.min(Math.round((raised / target) * 100), 100);
};

const statusTone = (s: Campaign["status"]) => (s === "Approved" ? "green" : "amber");

/* =======================
   Drawer Component
======================= */
const Drawer: React.FC<{
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ open, title, onClose, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Campaign</p>
            <h3 className="text-lg font-bold text-slate-900 truncate max-w-[360px]">{title}</h3>
          </div>
          <button
            className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
};

/* =======================
   Small dropdown (no library)
======================= */
const KebabIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="5" r="2" fill="currentColor" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <circle cx="12" cy="19" r="2" fill="currentColor" />
  </svg>
);

const useOutsideClick = (handler: () => void) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) handler();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [handler]);

  return ref;
};

/* =======================
   Page
======================= */
const CampaignPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Approved" | "Pending">("All");
  const [sortBy, setSortBy] = useState<"newest" | "progress" | "title" | "estimated" | "raised">("newest");

  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [drawerError, setDrawerError] = useState<string>("");

  // Actions menu
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useOutsideClick(() => setOpenMenuId(null));

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelected(null);
    setDonations([]);
    setDrawerError("");
  };

  // Counts for tabs
  const counts = useMemo(() => {
    const approved = campaigns.filter((c) => c.status === "Approved").length;
    const pending = campaigns.filter((c) => c.status === "Pending").length;
    return { all: campaigns.length, approved, pending };
  }, [campaigns]);

  /* =======================
     Fetch campaigns list
  ======================= */
  useEffect(() => {
    setLoading(true);
    setError("");
    axios
      .get(API.list, { params: { page, limit } })
      .then((res) => {
        setCampaigns(res.data.projects || []);
        const total = Number(res.data.total || 0);
        setTotalPages(Math.max(1, Math.ceil(total / limit)));
      })
      .catch(() => setError("Failed to load campaigns"))
      .finally(() => setLoading(false));
  }, [page]);

  /* =======================
     Filter + Sort
  ======================= */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const base = campaigns
      .filter((c) => (statusFilter === "All" ? true : c.status === statusFilter))
      .filter((c) => {
        if (!q) return true;
        return (
          c.request_title.toLowerCase().includes(q) ||
          (c.school_name || "").toLowerCase().includes(q) ||
          (c.category || "").toLowerCase().includes(q)
        );
      });

    return base.sort((a, b) => {
  switch (sortBy) {
    case "newest":
      return Number(b.request_id) - Number(a.request_id); // newest first
    case "title":
      return a.request_title.localeCompare(b.request_title);
    case "estimated":
      return Number(b.estimated_price) - Number(a.estimated_price);
    case "raised":
      return Number(b.amount_raised) - Number(a.amount_raised);
    default:
      return getProgress(b) - getProgress(a);
  }
});
  }, [campaigns, search, statusFilter, sortBy]);

  /* =======================
     Open drawer + fetch details
  ======================= */
  const openView = async (c: Campaign) => {
    setDrawerOpen(true);
    setDrawerError("");
    setSelected(c);
    setDonations([]);
    setOpenMenuId(null);

    setDetailLoading(true);
    try {
      const res = await axios.get(API.detail(c.request_id));
      const detail = res.data?.project ?? res.data ?? null;
      if (detail) setSelected((prev) => ({ ...(prev as Campaign), ...detail }));
    } catch {
      // optional endpoint
    } finally {
      setDetailLoading(false);
    }

    setDonationsLoading(true);
    try {
      const res = await axios.get(API.donations(c.request_id));
      const rows = Array.isArray(res.data) ? res.data : res.data?.donations ?? [];
      setDonations(rows);
    } catch {
      // optional endpoint
    } finally {
      setDonationsLoading(false);
    }
  };

  /* =======================
     Update status
  ======================= */
  const changeStatus = async (id: number, status: "Approved" | "Pending") => {
    try {
      await axios.put(API.updateStatus(id), { status });
      setCampaigns((prev) => prev.map((c) => (c.request_id === id ? { ...c, status } : c)));
      setSelected((prev) => (prev && prev.request_id === id ? { ...prev, status } : prev));
    } catch (e: any) {
      setDrawerError(e?.response?.data?.message || "Failed to update status (check your endpoint).");
    }
  };

  /* =======================
     Delete
  ======================= */
  const handleDelete = async (id: number) => {
    setOpenMenuId(null);
    if (!confirm("Delete this campaign? This cannot be undone.")) return;
    try {
      await axios.delete(API.delete(id));
      setCampaigns((prev) => prev.filter((c) => c.request_id !== id));
      if (selected?.request_id === id) closeDrawer();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to delete campaign");
    }
  };

  /* =======================
     CSV export
  ======================= */
  const downloadCSV = (rows: Campaign[], filename = "campaigns.csv") => {
    const headers = ["ID", "Title", "School", "Category", "Estimated", "Raised", "Remaining", "Progress", "Status"];
    const escape = (v: any) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.request_id,
          r.request_title,
          r.school_name,
          r.category,
          r.estimated_price,
          r.amount_raised,
          Math.max(Number(r.estimated_price) - Number(r.amount_raised), 0),
          `${getProgress(r)}%`,
          r.status,
        ]
          .map(escape)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setSortBy("progress");
    setPage(1);
  };

  return (
    <div className="p-6 space-y-6">
      {/* ================= Header ================= */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
          <p className="text-sm text-slate-500 mt-1">Manage donation requests, funding progress, and approvals</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            className="w-64 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Status</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest </option>
            <option value="progress">Sort by Progress</option>
            <option value="title">Sort by Title</option>
            <option value="estimated">Sort by Estimated</option>
            <option value="raised">Sort by Raised</option>
          </select>

          <Button variant="secondary" onClick={() => downloadCSV(filtered, `campaigns_page_${page}.csv`)}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* ================= Tabs ================= */}
      <div className="flex items-center gap-2">
        {[
          { key: "All", label: "All", count: counts.all },
          { key: "Approved", label: "Approved", count: counts.approved },
          { key: "Pending", label: "Pending", count: counts.pending },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setStatusFilter(t.key as any);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
              statusFilter === (t.key as any)
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {t.label}{" "}
            <span className={`ml-2 text-xs ${statusFilter === (t.key as any) ? "text-white/90" : "text-slate-500"}`}>
              ({t.count})
            </span>
          </button>
        ))}
      </div>

      {/* ================= Stats ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Total Campaigns" subtitle="Campaigns on this page">
          <p className="text-3xl font-bold text-slate-900">{campaigns.length}</p>
        </Card>

        <Card title="Approved" subtitle="Ready for donations">
          <p className="text-3xl font-bold text-green-600">{campaigns.filter((c) => c.status === "Approved").length}</p>
        </Card>

        <Card title="Pending" subtitle="Waiting for approval">
          <p className="text-3xl font-bold text-amber-600">{campaigns.filter((c) => c.status === "Pending").length}</p>
        </Card>
      </div>

      {/* ================= List ================= */}
      <Card title="Campaign List" subtitle="Track funding, status, and actions">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-rose-600">{error}</p>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
              ⌁
            </div>
            <p className="mt-4 font-semibold text-slate-900">No campaigns found</p>
            <p className="text-sm text-slate-500 mt-1">Try clearing filters or changing your search.</p>
            <div className="mt-4">
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* ====== TABLE upgrades:
                1) Sticky header
                2) Zebra rows
                3) Better progress cell (raised/target + funded badge)
                4) Safe actions dropdown with delete inside
            */}
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 border border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Title</th>
                  <th className="px-4 py-3 text-left font-semibold">School</th>
                  <th className="px-4 py-3 text-left font-semibold">Category</th>
                  <th className="px-4 py-3 text-left font-semibold">Estimated</th>
                  <th className="px-4 py-3 text-left font-semibold">Raised</th>
                  <th className="px-4 py-3 text-left font-semibold">Remaining</th>
                  <th className="px-4 py-3 text-left font-semibold">Progress</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((c) => {
                  const progress = getProgress(c);
                  const remaining = Math.max(Number(c.estimated_price) - Number(c.amount_raised), 0);
                  const funded = progress >= 100;

                  return (
                    <tr
                      key={c.request_id}
                      className="border-b border-slate-100 hover:bg-slate-50 odd:bg-slate-50/30"
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">{c.request_title}</div>
                        <div className="text-xs text-slate-500 mt-1">ID: {c.request_id}</div>
                      </td>

                      <td className="px-4 py-4 text-slate-700">{c.school_name}</td>

                      <td className="px-4 py-4">
                        <Pill tone="slate">{c.category || "—"}</Pill>
                      </td>

                      <td className="px-4 py-4 text-slate-700">{fmtMoney(c.estimated_price)}</td>
                      <td className="px-4 py-4 font-semibold text-slate-900">{fmtMoney(c.amount_raised)}</td>
                      <td className="px-4 py-4 text-slate-700">{fmtMoney(remaining)}</td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-32">
                            <ProgressBar value={progress} />
                            <p className="text-[11px] text-slate-500 mt-2">
                              {fmtMoney(c.amount_raised)} / {fmtMoney(c.estimated_price)}
                            </p>
                          </div>

                          <div className="flex flex-col items-start gap-2">
                            <span className="text-xs font-semibold text-slate-700">{progress}%</span>
                            {funded }
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <Pill tone={statusTone(c.status)}>{c.status === "Approved" ? " Approved" : " Pending"}</Pill>
                      </td>

                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <Button variant="secondary" onClick={() => openView(c)}>
                            View
                          </Button>

                          {/* safer delete in dropdown */}
                          <div className="relative" ref={openMenuId === c.request_id ? menuRef : undefined}>
                            <IconButton
                              ariaLabel="More actions"
                              onClick={() => setOpenMenuId((prev) => (prev === c.request_id ? null : c.request_id))}
                            >
                              <span className="text-slate-700">
                                <KebabIcon />
                              </span>
                            </IconButton>

                            {openMenuId === c.request_id && (
                              <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden z-20">
                                <button
                                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    openView(c);
                                  }}
                                >
                                  Open details
                                </button>

                                <div className="border-t border-slate-100" />

                                <button
                                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-rose-50 text-rose-600 font-semibold"
                                  onClick={() => handleDelete(c.request_id)}
                                >
                                  Delete…
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-slate-500">
                Page <span className="font-semibold text-slate-700">{page}</span> / {totalPages}
              </p>

              <div className="flex gap-2">
                <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Prev
                </Button>
                <Button
                  variant="primary"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ================= Drawer ================= */}
      <Drawer open={drawerOpen} title={selected?.request_title || "Campaign"} onClose={closeDrawer}>
        {!selected ? null : (
          <div className="space-y-6">
            {/* Summary */}
            <Card className="p-0">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">{selected.request_title}</h4>
                    <p className="text-sm text-slate-500 mt-1">{selected.school_name}</p>
                  </div>
                  <Pill tone={statusTone(selected.status)}>
                    {selected.status === "Approved" ? "✅ Approved" : "⏳ Pending"}
                  </Pill>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Pill tone="blue">ID: {selected.request_id}</Pill>
                  <Pill tone="slate">{selected.category || "—"}</Pill>
                </div>

                {detailLoading && (
                  <div className="text-sm text-slate-500 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
                    Loading details...
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500">Estimated</p>
                    <p className="font-bold text-slate-900 mt-1">{fmtMoney(selected.estimated_price)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500">Raised</p>
                    <p className="font-bold text-slate-900 mt-1">{fmtMoney(selected.amount_raised)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500">Remaining</p>
                    <p className="font-bold text-slate-900 mt-1">
                      {fmtMoney(Math.max(Number(selected.estimated_price) - Number(selected.amount_raised), 0))}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-semibold text-slate-700">Progress</p>
                    <p className="font-bold text-slate-900">{getProgress(selected)}%</p>
                  </div>
                  <ProgressBar value={getProgress(selected)} />
                </div>
              </div>
            </Card>

            {/* Description + Media */}
            <Card title="Details">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-2">Description</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {selected.description?.trim() ? selected.description : "—"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selected.image_url ? (
                    <Button variant="secondary" onClick={() => window.open(selected.image_url as string, "_blank")}>
                      View Image
                    </Button>
                  ) : (
                    <Button variant="secondary" disabled>
                      No Image
                    </Button>
                  )}

                  {selected.document_url ? (
                    <Button variant="secondary" onClick={() => window.open(selected.document_url as string, "_blank")}>
                      View Document
                    </Button>
                  ) : (
                    <Button variant="secondary" disabled>
                      No Document
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Admin Actions */}
            <Card title="Admin Actions" subtitle="Approve pending campaigns or remove invalid ones">
              {drawerError && <p className="text-sm text-rose-600 mb-3">{drawerError}</p>}

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  disabled={selected.status === "Approved"}
                  onClick={() => changeStatus(selected.request_id, "Approved")}
                >
                  Approve
                </Button>

                <Button
                  variant="secondary"
                  disabled={selected.status === "Pending"}
                  onClick={() => changeStatus(selected.request_id, "Pending")}
                >
                  Mark Pending
                </Button>

                <Button variant="danger" onClick={() => handleDelete(selected.request_id)} className="ml-auto">
                  Delete Campaign
                </Button>
              </div>
            </Card>

            {/* Donations list (optional) */}
            <Card title="Donations" subtitle="Recent donations for this campaign">
              {donationsLoading ? (
                <div className="text-sm text-slate-500 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
                  Loading donations...
                </div>
              ) : donations.length === 0 ? (
                <p className="text-sm text-slate-500">No donations found (or endpoint not available).</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 pr-3">Donor</th>
                        <th className="py-2 pr-3">Amount</th>
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donations.slice(0, 8).map((d, idx) => (
                        <tr key={d.donation_id ?? idx} className="border-b border-slate-100">
                          <td className="py-2 pr-3">
                            <p className="font-semibold text-slate-900">{d.donor_name || "Anonymous"}</p>
                            <p className="text-xs text-slate-500">{d.donor_email || ""}</p>
                          </td>
                          <td className="py-2 pr-3 font-semibold text-slate-900">{fmtMoney(d.amount)}</td>
                          <td className="py-2 pr-3 text-slate-700">
                            {d.created_at ? new Date(d.created_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-2">
                            <Pill tone={d.status === "paid" ? "green" : "slate"}>{d.status || "—"}</Pill>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {donations.length > 8 && (
                    <p className="text-xs text-slate-500 mt-3">Showing 8 of {donations.length} donations.</p>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default CampaignPage;