// src/pages/SchoolsPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
// import "../css/index.css";

type SchoolRow = {
  school_id: number;
  school_name: string;
  registration_no?: string;
  contact_email?: string;
  contact_phone?: string;
  district?: string;
  province?: string;
  address?: string;
  status: "active" | "inactive" | string;
  verified: number;
  need_score: number;
  total_received: number;
  campaigns_count: number;
  created_at: string;
  initials?: string;

  donations_count?: number;
  last_donation_at?: string | null;

  // ✅ document for verification
  document_link?: string | null;
};

const fmtMoney = (n: number) => `LKR ${Number(n || 0).toLocaleString()}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString();
const fmtTime = (d: string) => new Date(d).toLocaleTimeString();

const Card: React.FC<{ children: any; className?: string }> = ({ children, className = "" }) => (
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

const GhostButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
  <button
    {...props}
    className={`px-3 py-2 rounded-xl font-semibold bg-transparent border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed ${props.className || ""}`}
  />
);

const Pill: React.FC<{ className?: string; children: any }> = ({ className = "", children }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${className}`}>
    {children}
  </span>
);

const needUI = (need: number) => {
  if (need >= 70) return "bg-rose-50 text-rose-700 border-rose-200";
  if (need >= 40) return "bg-amber-50 text-amber-700 border-amber-200";
  if (need >= 10) return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-green-50 text-green-700 border-green-200";
};

const needLabel = (need: number) => {
  if (need >= 70) return "High";
  if (need >= 40) return "Medium";
  if (need >= 10) return "Low";
  return "Very Low";
};

const statusUI = (s: string) => {
  const st = (s || "").toLowerCase();
  if (st === "active") return "bg-green-50 text-green-700 border-green-200";
  if (st === "inactive") return "bg-slate-50 text-slate-700 border-slate-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
};

const verifiedUI = (v: number) =>
  v ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-600 border-slate-200";

const downloadCSV = (filename: string, rows: Array<Record<string, any>>) => {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };

  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
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

const SortIcon: React.FC<{ active: boolean; dir: "asc" | "desc" }> = ({ active, dir }) => {
  const upActive = active && dir === "asc";
  const downActive = active && dir === "desc";
  return (
    <span className="ml-1 inline-flex flex-col leading-none select-none">
      <span className={`${upActive ? "text-blue-700" : "text-slate-300"}`}>▲</span>
      <span className={`${downActive ? "text-blue-700" : "text-slate-300"} -mt-1`}>▼</span>
    </span>
  );
};

const Chip: React.FC<{ active?: boolean; onClick?: () => void; children: any }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition
      ${active ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
  >
    {children}
  </button>
);

const Drawer: React.FC<{ open: boolean; onClose: () => void; title?: string; children: any }> = ({
  open,
  onClose,
  title = "Details",
  children,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`}>
      <div className={`absolute inset-0 bg-black/30 transition ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div
        className={`absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white border-l border-slate-200 shadow-xl transition transform
          ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-500">School</div>
            <div className="text-lg font-extrabold text-slate-900 truncate">{title}</div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-5 overflow-y-auto h-[calc(100%-72px)]">{children}</div>
      </div>
    </div>
  );
};

const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
  const v = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
      <div className="h-full bg-slate-900/20" style={{ width: `${v}%` }} />
    </div>
  );
};

const SchoolsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SchoolRow[]>([]);
  const [total, setTotal] = useState(0);

  // filters
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState("all");
  const [district, setDistrict] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  // quick chips extra filters
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "verified" | "not_verified">("all");
  const [needBand, setNeedBand] = useState<"all" | "high" | "medium" | "low">("all");
  const [donationBand, setDonationBand] = useState<"all" | "has" | "zero">("all");

  // dropdown options from backend
  const [provinces, setProvinces] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);

  // pagination
  const [page, setPage] = useState(1);
  const limit = 10;

  // sorting
  const [sortBy, setSortBy] = useState<"created_at" | "school_name" | "need_score" | "total_received">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // drawer
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<SchoolRow | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const allOnPageSelected = useMemo(
    () => rows.length > 0 && rows.every((r) => selectedIds.has(r.school_id)),
    [rows, selectedIds]
  );

  // export menu
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!exportRef.current) return;
      if (!exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8000/api/schools", {
        params: {
          search,
          province,
          district,
          status,
          page,
          limit,
          sortBy,
          sortDir,
          verifiedFilter,
          needBand,
          donationBand,
        },
      });

      setRows(res.data?.schools || []);
      setTotal(Number(res.data?.total || 0));
      setProvinces(res.data?.filters?.provinces || []);
      setDistricts(res.data?.filters?.districts || []);
    } catch (e) {
      console.error("Schools load error", e);
      setRows([]);
      setTotal(0);
      setProvinces([]);
      setDistricts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [page, province, district, status, sortBy, sortDir, verifiedFilter, needBand, donationBand]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchData();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [search]);

  // if province changes, reset district
  useEffect(() => {
    setDistrict("all");
  }, [province]);

  // clear selected on page change / filter change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, province, district, status, search, verifiedFilter, needBand, donationBand]);

  const totals = useMemo(() => {
    const avgNeed = rows.length ? rows.reduce((s, r) => s + Number(r.need_score || 0), 0) / rows.length : 0;
    const activeCount = rows.filter((r) => (r.status || "").toLowerCase() === "active").length;
    const highNeedCount = rows.filter((r) => Number(r.need_score || 0) >= 70).length;
    const unverifiedCount = rows.filter((r) => Number(r.verified || 0) === 0).length;
    const zeroDonationCount = rows.filter((r) => Number(r.total_received || 0) === 0).length;
    return { avgNeed, activeCount, highNeedCount, unverifiedCount, zeroDonationCount };
  }, [rows]);

  const onSort = (key: typeof sortBy) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("desc");
    }
    setPage(1);
  };

  const exportRowsToCSV = (filename: string, data: SchoolRow[]) => {
    downloadCSV(
      filename,
      data.map((s) => ({
        school_id: s.school_id,
        school_name: s.school_name,
        province: s.province,
        district: s.district,
        status: s.status,
        verified: s.verified,
        need_score: s.need_score,
        total_received: s.total_received,
        campaigns_count: s.campaigns_count,
        donations_count: s.donations_count ?? "",
        last_donation_at: s.last_donation_at ?? "",
        created_at: s.created_at,
        registration_no: s.registration_no ?? "",
        contact_email: s.contact_email ?? "",
        contact_phone: s.contact_phone ?? "",
        address: s.address ?? "",
        document_link: s.document_link ?? "",
      }))
    );
  };

  const exportCurrentPage = () => exportRowsToCSV("schools_page.csv", rows);

  const exportFilteredAll = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:8000/api/schools", {
        params: {
          search,
          province,
          district,
          status,
          page: 1,
          limit: 1000,
          sortBy,
          sortDir,
          verifiedFilter,
          needBand,
          donationBand,
        },
      });
      const all = (res.data?.schools || []) as SchoolRow[];
      exportRowsToCSV("schools_filtered.csv", all);
    } catch (e) {
      console.error("Export filtered failed", e);
      alert("Export failed. Try exporting current page.");
    } finally {
      setLoading(false);
    }
  };

  const exportOnlyActive = () =>
    exportRowsToCSV(
      "schools_active_page.csv",
      rows.filter((r) => (r.status || "").toLowerCase() === "active")
    );

  const exportOnlyHighNeed = () =>
    exportRowsToCSV(
      "schools_high_need_page.csv",
      rows.filter((r) => Number(r.need_score || 0) >= 70)
    );

  const exportSelected = () => exportRowsToCSV("schools_selected.csv", rows.filter((r) => selectedIds.has(r.school_id)));

  const toggleRow = (id: number) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAllOnPage = () => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (rows.every((r) => n.has(r.school_id))) rows.forEach((r) => n.delete(r.school_id));
      else rows.forEach((r) => n.add(r.school_id));
      return n;
    });
  };

  const bulkUpdate = async (payload: any) => {
    if (selectedIds.size === 0) return;
    try {
      setLoading(true);
      await axios.post("http://localhost:8000/api/schools/bulk-update", {
        school_ids: Array.from(selectedIds),
        ...payload,
      });
      await fetchData();
      setSelectedIds(new Set());
    } catch (e) {
      console.error("Bulk update failed", e);
      alert("Bulk action failed. Add /api/schools/bulk-update backend endpoint.");
    } finally {
      setLoading(false);
    }
  };

  const applyNeedBand = (band: typeof needBand) => {
    setNeedBand(band);
    setPage(1);
  };

  const applyDonationBand = (band: typeof donationBand) => {
    setDonationBand(band);
    setPage(1);
  };

  // ✅ Drawer loads full details from backend
  const openView = async (r: SchoolRow) => {
    setViewOpen(true);
    setDrawerLoading(true);
    setSelectedRow(r);

    try {
      const res = await axios.get(`http://localhost:8000/api/schools/${r.school_id}`);
      const full = res.data?.school;

      setSelectedRow({
        ...r,
        ...full,
        document_link: full?.document_link ?? r.document_link ?? null,
        total_received: res.data?.donation_summary?.total_received ?? r.total_received,
        donations_count: res.data?.donation_summary?.donations_count ?? r.donations_count,
        last_donation_at: res.data?.donation_summary?.last_donation_at ?? r.last_donation_at,
      });
    } catch (e) {
      console.error("Failed to load school details", e);
      // keep fallback row
    } finally {
      setDrawerLoading(false);
    }
  };

  const clearAll = () => {
    setSearch("");
    setProvince("all");
    setDistrict("all");
    setStatus("all");
    setVerifiedFilter("all");
    setNeedBand("all");
    setDonationBand("all");
    setSortBy("created_at");
    setSortDir("desc");
    setPage(1);
  };

  const displayedRows = useMemo(() => {
    let r = [...rows];

    if (verifiedFilter !== "all") {
      r = r.filter((x) => (verifiedFilter === "verified" ? Number(x.verified || 0) === 1 : Number(x.verified || 0) === 0));
    }
    if (needBand !== "all") {
      r = r.filter((x) => {
        const n = Number(x.need_score || 0);
        if (needBand === "high") return n >= 70;
        if (needBand === "medium") return n >= 40 && n < 70;
        return n < 40;
      });
    }
    if (donationBand !== "all") {
      r = r.filter((x) => {
        const t = Number(x.total_received || 0);
        return donationBand === "has" ? t > 0 : t === 0;
      });
    }
    return r;
  }, [rows, verifiedFilter, needBand, donationBand]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Schools</h1>
          <p className="text-slate-500 mt-1">All registered schools with need score and donations summary.</p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500 font-semibold">Need legend:</span>
            <Pill className="bg-rose-50 text-rose-700 border-rose-200">High (70+)</Pill>
            <Pill className="bg-amber-50 text-amber-700 border-amber-200">Medium (40–69)</Pill>
            <Pill className="bg-yellow-50 text-yellow-700 border-yellow-200">Low (10–39)</Pill>
            <Pill className="bg-green-50 text-green-700 border-green-200">Very Low (&lt;10)</Pill>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Pill className="bg-slate-50 text-slate-700 border-slate-200">Total results: {total}</Pill>
          <Pill className="bg-blue-50 text-blue-700 border-blue-200">Avg need (this page): {totals.avgNeed.toFixed(1)}</Pill>
          <Pill className="bg-green-50 text-green-700 border-green-200">Active (this page): {totals.activeCount}</Pill>
          <Pill className="bg-rose-50 text-rose-700 border-rose-200">High-Need (70+): {totals.highNeedCount}</Pill>
          <Pill className="bg-slate-50 text-slate-700 border-slate-200">Unverified: {totals.unverifiedCount}</Pill>
          <Pill className="bg-slate-50 text-slate-700 border-slate-200">0 Donations: {totals.zeroDonationCount}</Pill>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label className="text-xs font-semibold text-slate-600">Search</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="School / Email / Province / District / Reg No..."
              className="w-full mt-1"
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-slate-600">Province</label>
            <Select
              value={province}
              onChange={(e) => {
                setProvince(e.target.value);
                setPage(1);
              }}
              className="w-full mt-1"
            >
              <option value="all">All</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">District</label>
            <Select
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setPage(1);
              }}
              className="w-full mt-1"
            >
              <option value="all">All</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Status</label>
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as any);
                setPage(1);
              }}
              className="w-full mt-1"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          {/* Quick filter chips */}
          <div className="md:col-span-12 mt-2 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 mr-1">Quick:</span>

              <Chip active={status === "all"} onClick={() => setStatus("all")}>
                All
              </Chip>
              <Chip active={status === "active"} onClick={() => setStatus("active")}>
                Active
              </Chip>
              <Chip active={status === "inactive"} onClick={() => setStatus("inactive")}>
                Inactive
              </Chip>

              <span className="w-4" />

              <Chip active={verifiedFilter === "all"} onClick={() => setVerifiedFilter("all")}>
                All
              </Chip>
              <Chip active={verifiedFilter === "verified"} onClick={() => setVerifiedFilter("verified")}>
                Verified
              </Chip>
              <Chip active={verifiedFilter === "not_verified"} onClick={() => setVerifiedFilter("not_verified")}>
                Not Verified
              </Chip>

              <span className="w-4" />

              <Chip active={needBand === "all"} onClick={() => applyNeedBand("all")}>
                Need: All
              </Chip>
              <Chip active={needBand === "high"} onClick={() => applyNeedBand("high")}>
                Need High (70+)
              </Chip>
              <Chip active={needBand === "medium"} onClick={() => applyNeedBand("medium")}>
                Need Medium
              </Chip>
              <Chip active={needBand === "low"} onClick={() => applyNeedBand("low")}>
                Need Low
              </Chip>

              <span className="w-4" />

              <Chip active={donationBand === "all"} onClick={() => applyDonationBand("all")}>
                Donations: All
              </Chip>
              <Chip active={donationBand === "has"} onClick={() => applyDonationBand("has")}>
                Has Donations
              </Chip>
              <Chip active={donationBand === "zero"} onClick={() => applyDonationBand("zero")}>
                0 Donations
              </Chip>
            </div>

            <div className="flex flex-wrap justify-between gap-2">
              <div className="flex gap-2">
                <SecondaryButton onClick={clearAll}>Clear</SecondaryButton>
                <Button onClick={() => fetchData()}>Refresh</Button>
              </div>

              <div className="relative" ref={exportRef}>
                <GhostButton onClick={() => setExportOpen((v) => !v)} disabled={!rows.length}>
                  Export ▾
                </GhostButton>

                {exportOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden z-50">
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700"
                      onClick={() => {
                        setExportOpen(false);
                        exportCurrentPage();
                      }}
                    >
                      Export current page (CSV)
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700"
                      onClick={() => {
                        setExportOpen(false);
                        exportFilteredAll();
                      }}
                    >
                      Export filtered results (best-effort)
                    </button>
                    <div className="border-t border-slate-100" />
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700"
                      onClick={() => {
                        setExportOpen(false);
                        exportOnlyActive();
                      }}
                    >
                      Export only Active (page)
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700"
                      onClick={() => {
                        setExportOpen(false);
                        exportOnlyHighNeed();
                      }}
                    >
                      Export only High-Need (page)
                    </button>
                    <div className="border-t border-slate-100" />
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700 disabled:opacity-50"
                      disabled={selectedIds.size === 0}
                      onClick={() => {
                        setExportOpen(false);
                        exportSelected();
                      }}
                    >
                      Export selected (page)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {selectedIds.size > 0 && (
              <div className="mt-2 p-3 rounded-2xl border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-slate-700">
                  <span className="font-bold">{selectedIds.size}</span> selected
                </div>

                <div className="flex flex-wrap gap-2">
                  <SecondaryButton onClick={() => bulkUpdate({ status: "active" })}>Mark Active</SecondaryButton>
                  <SecondaryButton onClick={() => bulkUpdate({ status: "inactive" })}>Mark Inactive</SecondaryButton>
                  <SecondaryButton onClick={() => bulkUpdate({ verified: 1 })}>Mark Verified</SecondaryButton>
                  <SecondaryButton onClick={() => bulkUpdate({ verified: 0 })}>Mark Not Verified</SecondaryButton>
                  <Button onClick={exportSelected}>Export selected</Button>
                </div>

                <div className="text-xs text-slate-500 w-full">
                  Note: Bulk update needs backend endpoint: <span className="font-mono">POST /api/schools/bulk-update</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="text-slate-500 py-10 text-center">Loading...</div>
        ) : displayedRows.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-3xl mb-2">🏫</div>
            <div className="text-slate-900 font-extrabold">No schools found</div>
            <div className="text-slate-500 text-sm mt-1">Try clearing filters or selecting a different quick filter.</div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <SecondaryButton onClick={clearAll}>Clear filters</SecondaryButton>
              <GhostButton onClick={() => setStatus("active")}>Show Active</GhostButton>
              <GhostButton onClick={() => setStatus("all")}>Show All</GhostButton>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[560px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-20">
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="sticky left-0 bg-white z-30 py-3 px-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleAllOnPage}
                        className="w-4 h-4 rounded border-slate-300"
                        aria-label="Select all on page"
                      />
                      <span>School</span>
                    </div>
                  </th>

                  <th className="py-3 px-4 cursor-pointer select-none" onClick={() => onSort("need_score")} title="Sort by need score">
                    Need <SortIcon active={sortBy === "need_score"} dir={sortDir} />
                  </th>

                  <th
                    className="py-3 px-4 text-right cursor-pointer select-none"
                    onClick={() => onSort("total_received")}
                    title="Sort by total received"
                  >
                    Total Received <SortIcon active={sortBy === "total_received"} dir={sortDir} />
                  </th>

                  <th className="py-3 px-4">Donation Activity</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Status</th>

                  <th className="py-3 px-4 cursor-pointer select-none" onClick={() => onSort("created_at")} title="Sort by created date">
                    Created <SortIcon active={sortBy === "created_at"} dir={sortDir} />
                  </th>

                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {displayedRows.map((r) => {
                  const need = Number(r.need_score || 0);
                  const needClass = needUI(need);

                  return (
                    <tr key={r.school_id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="sticky left-0 bg-white py-3 px-4 z-10">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.school_id)}
                            onChange={() => toggleRow(r.school_id)}
                            className="w-4 h-4 rounded border-slate-300"
                            aria-label={`Select ${r.school_name}`}
                          />

                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0">
                            {r.initials || "S"}
                          </div>

                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">{r.school_name}</div>
                            <div className="text-xs text-slate-500 truncate">
                              {r.contact_email || "—"}
                              {r.registration_no ? ` • ${r.registration_no}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-2 min-w-[140px]">
                          <Pill className={needClass}>
                            {need.toFixed(1)} <span className="text-[10px] opacity-80">({needLabel(need)})</span>
                          </Pill>
                          <ProgressBar value={need} />
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="font-semibold text-slate-900">{fmtMoney(Number(r.total_received || 0))}</div>
                        <div className="text-xs text-slate-500">Campaigns: {Number(r.campaigns_count || 0)}</div>
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        <div className="font-semibold">
                          {typeof r.donations_count === "number" ? `${r.donations_count} donations` : "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          Last: {r.last_donation_at ? `${fmtDate(r.last_donation_at)} ${fmtTime(r.last_donation_at)}` : "—"}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        <div className="font-semibold">{r.district || "—"}</div>
                        <div className="text-xs text-slate-500">{r.province || ""}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          <Pill className={statusUI(r.status)}>{(r.status || "inactive").toString().toUpperCase()}</Pill>
                          <Pill className={verifiedUI(r.verified)}>{r.verified ? "Verified" : "Not Verified"}</Pill>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        <div className="text-sm">{fmtDate(r.created_at)}</div>
                        <div className="text-xs text-slate-500">{fmtTime(r.created_at)}</div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <GhostButton onClick={() => openView(r)} className="border-slate-200 hover:bg-slate-50">
                          View
                        </GhostButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 py-4 border-t border-slate-200 flex items-center justify-between">
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

      {/* View Drawer */}
      <Drawer open={viewOpen} onClose={() => setViewOpen(false)} title={selectedRow?.school_name || "School Details"}>
        {drawerLoading ? (
          <div className="text-center py-10 text-slate-500">Loading details...</div>
        ) : !selectedRow ? (
          <div className="text-slate-500">No school selected.</div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-700 font-extrabold text-lg">
                {selectedRow.initials || "S"}
              </div>
              <div className="min-w-0">
                <div className="text-xl font-extrabold text-slate-900 truncate">{selectedRow.school_name}</div>
                <div className="text-sm text-slate-500 truncate">
                  {selectedRow.contact_email || "—"} {selectedRow.registration_no ? `• ${selectedRow.registration_no}` : ""}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Pill className={statusUI(selectedRow.status)}>{(selectedRow.status || "inactive").toUpperCase()}</Pill>
                  <Pill className={verifiedUI(selectedRow.verified)}>{selectedRow.verified ? "Verified" : "Not Verified"}</Pill>
                </div>
              </div>
            </div>

            <Card className="p-4">
              <div className="text-sm font-extrabold text-slate-900 mb-3">Contact & Address</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Phone</div>
                  <div className="text-slate-900">{selectedRow.contact_phone || "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">Province</div>
                  <div className="text-slate-900">{selectedRow.province || "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">District</div>
                  <div className="text-slate-900">{selectedRow.district || "—"}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs font-semibold text-slate-500">Address</div>
                  <div className="text-slate-900">{selectedRow.address || "—"}</div>
                </div>
              </div>
            </Card>

            {/* ✅ Verification Document */}
            <Card className="p-4">
              <div className="text-sm font-extrabold text-slate-900 mb-3">Verification Document</div>

              {selectedRow.document_link ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-slate-700 truncate">{selectedRow.document_link}</div>
                  <a
                    href={selectedRow.document_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 shrink-0"
                  >
                    View Document
                  </a>
                </div>
              ) : (
                <div className="text-sm text-slate-500">No document uploaded.</div>
              )}
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-extrabold text-slate-900">Need Score</div>
                <Pill className={needUI(Number(selectedRow.need_score || 0))}>
                  {Number(selectedRow.need_score || 0).toFixed(1)} ({needLabel(Number(selectedRow.need_score || 0))})
                </Pill>
              </div>
              <div className="mt-3">
                <ProgressBar value={Number(selectedRow.need_score || 0)} />
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-sm font-extrabold text-slate-900 mb-3">Donation Summary</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Total received</div>
                  <div className="text-slate-900 font-extrabold">{fmtMoney(Number(selectedRow.total_received || 0))}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">Campaigns</div>
                  <div className="text-slate-900 font-extrabold">{Number(selectedRow.campaigns_count || 0)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">Donations count</div>
                  <div className="text-slate-900">{typeof selectedRow.donations_count === "number" ? selectedRow.donations_count : "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">Last donated</div>
                  <div className="text-slate-900">
                    {selectedRow.last_donation_at ? `${fmtDate(selectedRow.last_donation_at)} ${fmtTime(selectedRow.last_donation_at)}` : "—"}
                  </div>
                </div>
              </div>
            </Card>

            {/* ✅ Admin actions */}
            <div className="flex flex-wrap gap-2">
              {!selectedRow.verified && (
                <Button
                  onClick={async () => {
                    try {
                      await axios.post("http://localhost:8000/api/schools/bulk-update", {
                        school_ids: [selectedRow.school_id],
                        verified: 1,
                      });
                      await fetchData();
                      setViewOpen(false);
                    } catch {
                      alert("Verification failed.");
                    }
                  }}
                >
                  Mark Verified
                </Button>
              )}

              {selectedRow.status?.toLowerCase() !== "active" && (
                <SecondaryButton
                  onClick={async () => {
                    try {
                      await axios.post("http://localhost:8000/api/schools/bulk-update", {
                        school_ids: [selectedRow.school_id],
                        status: "active",
                      });
                      await fetchData();
                      setViewOpen(false);
                    } catch {
                      alert("Status update failed.");
                    }
                  }}
                >
                  Activate
                </SecondaryButton>
              )}

              <GhostButton onClick={() => setViewOpen(false)}>Close</GhostButton>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default SchoolsPage;