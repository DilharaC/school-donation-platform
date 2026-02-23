// src/pages/Donor.tsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/* ===================== UI ===================== */
const Card: React.FC<{
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
}> = ({ title, children, className = "", headerRight }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
    {(title || headerRight) && (
      <div className="px-5 pt-5 flex items-start justify-between gap-3">
        {title ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : <div />}
        {headerRight}
      </div>
    )}
    <div className={(title || headerRight) ? "p-5 pt-4" : "p-5"}>{children}</div>
  </div>
);

const PrimaryButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}> = ({ children, onClick, disabled, className = "" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center rounded-lg font-medium transition
      focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
      px-4 py-2 text-sm bg-blue-700 text-white hover:bg-blue-800
      disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

const SecondaryButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}> = ({ children, onClick, disabled, className = "" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center rounded-lg font-medium transition
      focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2
      px-4 py-2 text-sm bg-slate-100 text-slate-700 hover:bg-slate-200
      disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

const GhostButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}> = ({ children, onClick, disabled, className = "" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center rounded-lg font-medium transition
      focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2
      px-4 py-2 text-sm text-slate-700 hover:bg-slate-50
      disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

const TabButton: React.FC<{
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}> = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg border text-sm font-medium transition
      ${active ? "bg-blue-700 border-blue-700 text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
  >
    {children}
  </button>
);

const Badge: React.FC<{ variant?: "green" | "slate" | "amber" | "blue"; children: React.ReactNode }> = ({
  variant = "slate",
  children,
}) => {
  const styles = {
    green: "bg-green-50 text-green-700 border-green-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${styles[variant]}`}>
      {children}
    </span>
  );
};

const SortIcon: React.FC<{ dir?: "asc" | "desc" | null }> = ({ dir }) => (
  <span className="ml-1 inline-flex items-center text-slate-400">
    {dir === "asc" ? "▲" : dir === "desc" ? "▼" : "↕"}
  </span>
);

/* ===================== Drawer ===================== */
const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* overlay */}
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      {/* panel */}
      <div className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Donor</p>
            <h3 className="text-lg font-semibold text-slate-900">{title ?? "Details"}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg hover:bg-slate-100 text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

/* ===================== Types ===================== */
interface Donor {
  donor_id: number;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  initials: string;
  active_donations_count: number;
  total_donated: number;
  has_active_donations: boolean;
}

/* ===================== Helpers ===================== */
const toInitials = (name?: string) => {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "-";
  }
};

const getDonorLevel = (total: number) => {
  const n = Number(total || 0);
  if (n >= 10000) return { label: "Gold", variant: "amber" as const };
  if (n >= 1000) return { label: "Silver", variant: "slate" as const };
  return { label: "Bronze", variant: "blue" as const };
};

/* ===================== Page ===================== */
type FilterMode = "active" | "all";
type SortKey = "name" | "joined" | "active" | "total";
type SortDir = "asc" | "desc";

const DonorPage: React.FC = () => {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [page, setPage] = useState(1);
  const limit = 10;

  // Drawer
  const [selected, setSelected] = useState<Donor | null>(null);
  const drawerOpen = !!selected;

  /* ===================== Fetch BOTH APIs ===================== */
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError("");

    Promise.all([
      axios.get("http://localhost:8000/api/registered-donors"),
      axios.get("http://localhost:8000/api/donors-active"),
    ])
      .then(([allRes, activeRes]) => {
        if (!isMounted) return;

        const allRaw = Array.isArray(allRes.data) ? allRes.data : allRes.data?.data ?? [];
        const activeRaw = Array.isArray(activeRes.data) ? activeRes.data : activeRes.data?.data ?? [];

        const activeMap = new Map<number, any>();
        activeRaw.forEach((d: any) => activeMap.set(d.donor_id ?? d.id, d));

        const merged: Donor[] = allRaw.map((d: any) => {
          const id = d.donor_id ?? d.id;
          const active = activeMap.get(id);

          const name = d.donor_name ?? d.full_name ?? d.name ?? "Unknown";

          return {
            donor_id: id,
            full_name: name,
            email: d.donor_email ?? d.email ?? "-",
            phone: d.donor_phone ?? d.phone ?? "-",
            created_at: d.created_at ?? new Date().toISOString(),
            initials: d.initials ?? toInitials(name),
            active_donations_count: Number(active?.active_donations_count ?? 0),
            total_donated: Number(active?.total_donated ?? d.total_donated ?? 0),
            has_active_donations: !!active,
          };
        });

        setDonors(merged);
        setPage(1);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load donors");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /* ===================== Filter + Search + Sort ===================== */
  const visibleDonors = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = donors
      .filter((d) => (filter === "active" ? d.has_active_donations : true))
      .filter((d) => {
        if (!q) return true;
        return (
          d.full_name.toLowerCase().includes(q) ||
          d.email.toLowerCase().includes(q) ||
          d.phone.toLowerCase().includes(q)
        );
      });

    const dir = sortDir === "asc" ? 1 : -1;

    list = [...list].sort((a, b) => {
      if (sortKey === "name") return a.full_name.localeCompare(b.full_name) * dir;
      if (sortKey === "joined") return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      if (sortKey === "active") return (a.active_donations_count - b.active_donations_count) * dir;
      // total
      return (a.total_donated - b.total_donated) * dir;
    });

    return list;
  }, [donors, filter, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(visibleDonors.length / limit));
  const safePage = Math.min(page, totalPages);
  const paginated = visibleDonors.slice((safePage - 1) * limit, safePage * limit);

  /* ===================== Stats ===================== */
  const totalDonors = donors.length;
  const activeDonors = donors.filter((d) => d.has_active_donations).length;
  const totalDonations = donors.reduce((sum, d) => sum + Number(d.total_donated || 0), 0);

  const startRow = visibleDonors.length === 0 ? 0 : (safePage - 1) * limit + 1;
  const endRow = Math.min(safePage * limit, visibleDonors.length);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      setPage(1);
      return;
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    setPage(1);
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortDir;
  };

  const onExportCsv = () => {
    const headers = ["Name", "Email", "Phone", "Joined", "Active Donations", "Total Donated"];
    const rows = visibleDonors.map((d) => [
      d.full_name,
      d.email,
      d.phone,
      formatDate(d.created_at),
      String(d.active_donations_count),
      String(d.total_donated),
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "donors.csv";
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* ================= Header + Toolbar ================= */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Donors</h1>
            <p className="text-sm text-slate-500">Manage donor records and contribution stats</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-2">
              <TabButton active={filter === "active"} onClick={() => { setFilter("active"); setPage(1); }}>
                Active Donors
              </TabButton>
              <TabButton active={filter === "all"} onClick={() => { setFilter("all"); setPage(1); }}>
                All Donors
              </TabButton>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search donors..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="border border-slate-200 bg-white px-3 py-2 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />

              <SecondaryButton onClick={onExportCsv}>Export CSV</SecondaryButton>
            </div>
          </div>
        </div>
      </div>

      {/* ================= Stats ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="transition hover:shadow-md" title="Total Donors">
          <p className="text-3xl font-bold text-slate-900">{totalDonors}</p>
          <p className="text-sm text-slate-500 mt-1">All registered donors</p>
        </Card>

        <Card className="transition hover:shadow-md" title="Active Donors">
          <p className="text-3xl font-bold text-green-600">{activeDonors}</p>
          <p className="text-sm text-slate-500 mt-1">Donors with paid donations</p>
        </Card>

        {/* Premium revenue card */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl shadow-sm transition hover:shadow-md">
          <div className="px-5 pt-5">
            <h2 className="text-lg font-semibold text-slate-900">Total Donations</h2>
          </div>
          <div className="p-5 pt-4">
            <p className="text-3xl font-bold text-blue-800">{formatMoney(totalDonations)}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="blue">Revenue</Badge>
              <span className="text-sm text-slate-600">Lifetime collected amount</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= Table ================= */}
      <Card
        title="Donor List"
        headerRight={
          <div className="flex items-center gap-2">
            <Badge variant="slate">{visibleDonors.length} results</Badge>
          </div>
        }
      >
        {loading ? (
          <p className="text-center py-10 text-slate-600">Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : paginated.length === 0 ? (
          // Premium empty state
          <div className="py-16 text-center">
            <p className="text-slate-900 font-semibold">No donors found</p>
            <p className="text-slate-500 text-sm mt-1">Try changing filters or search keywords.</p>
            <PrimaryButton className="mt-4" onClick={() => { setSearch(""); setFilter("all"); }}>
              Reset filters
            </PrimaryButton>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 sticky top-0">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold">Donor</th>

                    <th className="px-4 py-3 font-semibold cursor-pointer hover:text-blue-800" onClick={() => toggleSort("name")}>
                      Name <SortIcon dir={sortIndicator("name")} />
                    </th>

                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>

                    <th className="px-4 py-3 font-semibold cursor-pointer hover:text-blue-800" onClick={() => toggleSort("joined")}>
                      Joined <SortIcon dir={sortIndicator("joined")} />
                    </th>

                    <th className="px-4 py-3 font-semibold cursor-pointer hover:text-blue-800" onClick={() => toggleSort("active")}>
                      Active <SortIcon dir={sortIndicator("active")} />
                    </th>

                    <th className="px-4 py-3 font-semibold text-right cursor-pointer hover:text-blue-800" onClick={() => toggleSort("total")}>
                      Total Donated <SortIcon dir={sortIndicator("total")} />
                    </th>

                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginated.map((d, idx) => {
                    const level = getDonorLevel(d.total_donated);
                    return (
                      <tr
                        key={d.donor_id}
                        onClick={() => setSelected(d)}
                        className={`border-t border-slate-200 hover:bg-slate-50 transition cursor-pointer ${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-semibold">
                              {d.initials}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{d.full_name}</p>
                              <p className="text-xs text-slate-500">ID: {d.donor_id}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{d.full_name}</span>
                            <Badge variant={level.variant}>{level.label}</Badge>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-700">{d.email}</td>
                        <td className="px-4 py-3 text-slate-700">{d.phone}</td>

                        <td className="px-4 py-3 text-slate-700">{formatDate(d.created_at)}</td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${
                              d.active_donations_count > 0
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {d.active_donations_count}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {formatMoney(d.total_donated)}
                        </td>

                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <PrimaryButton className="px-3 py-1.5 text-xs" onClick={() => setSelected(d)}>
                            View
                          </PrimaryButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 flex-wrap gap-3">
              <p className="text-sm text-slate-500">
                Showing <span className="font-semibold text-slate-700">{startRow}</span>–
                <span className="font-semibold text-slate-700">{endRow}</span> of{" "}
                <span className="font-semibold text-slate-700">{visibleDonors.length}</span>
              </p>

              <div className="flex items-center gap-2">
                <SecondaryButton
                  disabled={safePage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-2"
                >
                  Prev
                </SecondaryButton>

                <span className="text-sm text-slate-600 px-2">
                  Page <span className="font-semibold text-slate-900">{safePage}</span> / {totalPages}
                </span>

                <PrimaryButton
                  disabled={safePage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-2"
                >
                  Next
                </PrimaryButton>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ================= Drawer ================= */}
      <Drawer
        open={drawerOpen}
        onClose={() => setSelected(null)}
        title={selected?.full_name}
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg">
                {selected.initials}
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">{selected.full_name}</p>
                <p className="text-sm text-slate-500">Donor ID: {selected.donor_id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Total Donated</p>
                <p className="text-lg font-bold text-slate-900">{formatMoney(selected.total_donated)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Active Donations</p>
                <p className="text-lg font-bold text-slate-900">{selected.active_donations_count}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 col-span-2">
                <p className="text-xs text-slate-500">Joined</p>
                <p className="text-sm font-semibold text-slate-900">{formatDate(selected.created_at)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-2">
              <p className="text-sm font-semibold text-slate-900">Contact</p>
              <p className="text-sm text-slate-700">
                <span className="text-slate-500">Email: </span>{selected.email}
              </p>
              <p className="text-sm text-slate-700">
                <span className="text-slate-500">Phone: </span>{selected.phone}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <GhostButton onClick={() => setSelected(null)}>Close</GhostButton>
              <PrimaryButton onClick={() => alert("Wire this to your route: /donors/:id")}>
                Open full profile
              </PrimaryButton>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};

export default DonorPage;