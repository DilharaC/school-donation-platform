// src/pages/AnalyticsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Popup, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

// import ".../css/index.css";

/* ===================== Types ===================== */
interface School {
  school_id: number;
  school_name: string;
  district: string;
  province: string;
  latitude: number;
  longitude: number;
  total_received: number;
  need_score?: number;
}

interface Trend {
  month: string;
  donations: number; // total amount per month
}

/* ===================== Sri Lanka Bounds ===================== */
const SRI_LANKA_BOUNDS: L.LatLngBoundsExpression = [
  [5.8, 79.5],
  [9.9, 81.9],
];

/* ===================== Need Buckets ===================== */
type NeedBucket = "High" | "Medium" | "Low" | "Very Low";
type NeedFilter = "ALL" | NeedBucket;

const getNeedBucket = (need: number): NeedBucket => {
  if (need >= 70) return "High";
  if (need >= 40) return "Medium";
  if (need >= 10) return "Low";
  return "Very Low";
};

const getNeedColor = (need: number) => {
  if (need >= 70) return "#ef4444"; // red-500
  if (need >= 40) return "#fb923c"; // orange-400
  if (need >= 10) return "#facc15"; // yellow-400
  return "#22c55e"; // green-500
};

const formatMoney = (value: number) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

/* ===================== Small UI ===================== */
const ShellCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />
);

const Pill: React.FC<{
  tone?: "green" | "amber" | "blue" | "rose" | "slate";
  children: React.ReactNode;
}> = ({ tone = "slate", children }) => {
  const tones: Record<string, string> = {
    green: "bg-green-50 text-green-700 border-green-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${tones[tone]}`}>
      {children}
    </span>
  );
};

const KpiCard: React.FC<{
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, value, sub, icon }) => (
  <ShellCard className="p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <div className="mt-2 text-3xl font-extrabold text-slate-900 whitespace-nowrap">
  {value}
</div>
        {sub && <div className="mt-1 text-sm text-slate-500">{sub}</div>}
      </div>
      {icon && <div className="p-2 rounded-xl bg-blue-50 text-blue-700 shrink-0">{icon}</div>}
    </div>
  </ShellCard>
);

const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
    <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
);

const BarRow: React.FC<{
  label: string;
  metaLeft: string;
  right: string;
  value: number;
}> = ({ label, metaLeft, right, value }) => (
  <div className="space-y-2">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold text-slate-900 truncate">{label}</p>
        <p className="text-xs text-slate-500 truncate mt-1">{metaLeft}</p>
      </div>
      <p className="text-sm font-semibold text-slate-900 whitespace-nowrap">{right}</p>
    </div>
    <ProgressBar value={value} />
    <div className="flex justify-between text-xs text-slate-500">
      <span>0</span>
      <span>{Math.round(value)}%</span>
    </div>
  </div>
);

const MiniLegendRow: React.FC<{ color: string; label: string; value: number }> = ({
  color,
  label,
  value,
}) => (
  <div className="flex items-center justify-between text-sm">
    <span className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
    <span className="font-semibold text-slate-900">{value}</span>
  </div>
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className={`text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
      props.className || ""
    }`}
  />
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
      props.className || ""
    }`}
  />
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
  <button
    {...props}
    className={`px-4 py-2 rounded-xl font-semibold bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed ${
      props.className || ""
    }`}
  />
);

const SecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
  <button
    {...props}
    className={`px-4 py-2 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed ${
      props.className || ""
    }`}
  />
);

const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <label className="inline-flex items-center gap-2 text-sm text-slate-700 select-none cursor-pointer">
    <span
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-10 h-6 rounded-full transition flex items-center px-1 ${
        checked ? "bg-blue-600" : "bg-slate-200"
      }`}
    >
      <span className={`w-4 h-4 rounded-full bg-white transition ${checked ? "translate-x-4" : ""}`} />
    </span>
    {label}
  </label>
);

/* ===================== CSV Export ===================== */
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

/* ===================== Component ===================== */
const AnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);

  const [schools, setSchools] = useState<School[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [range, setRange] = useState<"6M" | "12M" | "ALL">("12M");

  // ✅ Filters (added)
  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState<string>("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [needFilter, setNeedFilter] = useState<NeedFilter>("ALL");
  const [hideZero, setHideZero] = useState<boolean>(false);

  // ✅ Pagination (your request)
  const [provincePage, setProvincePage] = useState(1);
  const [schoolPage, setSchoolPage] = useState(1);
  const provincesPerPage = 8;
  const schoolsPerPage = 4;

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);

        const [schoolsRes, trendsRes] = await Promise.all([
          axios.get("http://localhost:8000/api/analytics/schools-map"),
          axios.get("http://localhost:8000/api/donation-trends"),
        ]);

        if (!alive) return;

const safeSchools: School[] = (schoolsRes.data || []).map((s: any) => ({
  school_id: Number(s.school_id),
  school_name: String(s.school_name ?? ""),
  district: String(s.district ?? "Unknown"),
  province: String(s.province ?? "Unknown"),
  latitude: Number(s.latitude),
  longitude: Number(s.longitude),

  // ✅ fund_balance comes from schools table
  // backend should return it as total_received (recommended)
  total_received: Number(s.total_received ?? s.fund_balance ?? 0),

  need_score: Number(s.need_score ?? 0),
}));
setSchools(safeSchools);

        const safeTrends: Trend[] = (trendsRes.data || []).map((t: any) => ({
          month: t.month,
          donations: Number(t.donations),
        }));
        setTrends(safeTrends);
      } catch (err) {
        console.error("Analytics load error:", err);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, []);

  /* ===================== Derived (Filters) ===================== */

  const uniqueProvinces = useMemo(() => {
    const set = new Set<string>();
    for (const s of schools) set.add((s.province || "Unknown").trim());
    return ["ALL", ...Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b))];
  }, [schools]);

  const uniqueDistricts = useMemo(() => {
    const set = new Set<string>();
    for (const s of schools) {
      // if province filter selected, show districts only from that province
      if (provinceFilter !== "ALL" && (s.province || "Unknown") !== provinceFilter) continue;
      set.add((s.district || "Unknown").trim());
    }
    return ["ALL", ...Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b))];
  }, [schools, provinceFilter]);

  const filteredSchools = useMemo(() => {
    const q = search.trim().toLowerCase();

    const out = schools.filter((s) => {
      const prov = (s.province || "Unknown").trim();
      const dist = (s.district || "Unknown").trim();
      const need = Number(s.need_score ?? 0);
      const bucket = getNeedBucket(need);

      if (provinceFilter !== "ALL" && prov !== provinceFilter) return false;
      if (districtFilter !== "ALL" && dist !== districtFilter) return false;
      if (needFilter !== "ALL" && bucket !== needFilter) return false;
      if (hideZero && Number(s.total_received || 0) <= 0) return false;

      if (!q) return true;
      const hay = `${s.school_name} ${dist} ${prov}`.toLowerCase();
      return hay.includes(q);
    });

    // remove duplicates by school_id (prevents repeated rows if backend duplicates)
    const seen = new Set<number>();
    const unique: School[] = [];
    for (const s of out) {
      if (seen.has(s.school_id)) continue;
      seen.add(s.school_id);
      unique.push(s);
    }
    return unique;
  }, [schools, search, provinceFilter, districtFilter, needFilter, hideZero]);

  // reset pages when filters change (avoid blank pages)
  useEffect(() => {
    setProvincePage(1);
    setSchoolPage(1);
  }, [search, provinceFilter, districtFilter, needFilter, hideZero]);

  /* ===================== Derived Analytics (use filteredSchools) ===================== */

  const totalRaisedFromSchools = useMemo(
    () => filteredSchools.reduce((sum, s) => sum + Number(s.total_received || 0), 0),
    [filteredSchools]
  );

  const rangedTrends = useMemo(() => {
    const base = Array.isArray(trends) ? trends : [];
    if (range === "6M") return base.slice(-6);
    if (range === "12M") return base.slice(-12);
    return base;
  }, [trends, range]);

  const totalRaisedInRange = useMemo(
    () => rangedTrends.reduce((sum, t) => sum + Number(t.donations || 0), 0),
    [rangedTrends]
  );

  const needBreakdown = useMemo(() => {
    const counts: Record<NeedBucket, number> = { High: 0, Medium: 0, Low: 0, "Very Low": 0 };
    for (const s of filteredSchools) {
      const bucket = getNeedBucket(Number(s.need_score ?? 0));
      counts[bucket] += 1;
    }
    return counts;
  }, [filteredSchools]);

  const topSchoolsAll = useMemo(() => {
    return [...filteredSchools].sort((a, b) => Number(b.total_received || 0) - Number(a.total_received || 0));
  }, [filteredSchools]);

  const topProvincesAll = useMemo(() => {
    const map = new Map<string, { province: string; total: number; schools: number }>();
    for (const s of filteredSchools) {
      const key = (s.province || "Unknown").trim();
      const current = map.get(key) ?? { province: key, total: 0, schools: 0 };
      current.total += Number(s.total_received || 0);
      current.schools += 1;
      map.set(key, current);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredSchools]);

  const displayedProvinces = useMemo(() => {
    const start = (provincePage - 1) * provincesPerPage;
    return topProvincesAll.slice(start, start + provincesPerPage);
  }, [topProvincesAll, provincePage, provincesPerPage]);

  const displayedSchools = useMemo(() => {
    const start = (schoolPage - 1) * schoolsPerPage;
    return topSchoolsAll.slice(start, start + schoolsPerPage);
  }, [topSchoolsAll, schoolPage, schoolsPerPage]);

  const provincesHasNext = provincePage * provincesPerPage < topProvincesAll.length;
  const schoolsHasNext = schoolPage * schoolsPerPage < topSchoolsAll.length;

  const maxSchoolTotal = useMemo(
    () => Math.max(1, ...topSchoolsAll.map((s) => Number(s.total_received || 0))),
    [topSchoolsAll]
  );

  const avgNeed = useMemo(() => {
    if (!filteredSchools.length) return 0;
    const sum = filteredSchools.reduce((acc, s) => acc + Number(s.need_score ?? 0), 0);
    return sum / filteredSchools.length;
  }, [filteredSchools]);

  const avgRaisedPerSchool = useMemo(() => {
    if (!filteredSchools.length) return 0;
    return totalRaisedFromSchools / filteredSchools.length;
  }, [filteredSchools.length, totalRaisedFromSchools]);

  const highNeedCount = useMemo(() => needBreakdown.High, [needBreakdown.High]);

  const highNeedZeroCount = useMemo(() => {
    return filteredSchools.filter((s) => (s.need_score ?? 0) >= 70 && Number(s.total_received || 0) <= 0).length;
  }, [filteredSchools]);

  // Month-to-month % change (based on trends, not filteredSchools)
  const lastMonth = rangedTrends.length ? rangedTrends[rangedTrends.length - 1] : null;
  const prevMonth = rangedTrends.length > 1 ? rangedTrends[rangedTrends.length - 2] : null;

  const monthChangePct = useMemo(() => {
    const a = Number(lastMonth?.donations || 0);
    const b = Number(prevMonth?.donations || 0);
    if (!prevMonth) return null;
    if (b === 0 && a > 0) return "NEW";
    if (b === 0 && a === 0) return "0.0%";
    const pct = ((a - b) / b) * 100;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
  }, [lastMonth, prevMonth]);

  const monthChangeTone = useMemo(() => {
    if (monthChangePct === null) return "slate" as const;
    if (monthChangePct === "NEW") return "blue" as const;
    if (monthChangePct === "0.0%") return "slate" as const;
    const pct = Number(monthChangePct.replace("%", ""));
    return pct >= 0 ? ("green" as const) : ("rose" as const);
  }, [monthChangePct]);

  // Province bar chart data (top 8 by raised)
  const provincesBarData = useMemo(() => {
    return topProvincesAll.slice(0, 8).map((p) => ({
      province: p.province,
      raised: Number(p.total || 0),
    }));
  }, [topProvincesAll]);

  const topProvince = useMemo(() => topProvincesAll[0] || null, [topProvincesAll]);
  const topSchool = useMemo(() => topSchoolsAll[0] || null, [topSchoolsAll]);

  /* ===================== Render ===================== */
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Analytics</h1>
            <p className="text-slate-500 mt-1">Donation trends, school distribution, and need-level insights.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="blue">Results: {filteredSchools.length}</Pill>
            <Pill tone="slate">Avg need: {avgNeed.toFixed(1)}</Pill>
            {provinceFilter !== "ALL" && <Pill tone="blue">Province: {provinceFilter}</Pill>}
            {districtFilter !== "ALL" && <Pill tone="blue">District: {districtFilter}</Pill>}
            {needFilter !== "ALL" && <Pill tone="amber">Need: {needFilter}</Pill>}
            {hideZero && <Pill tone="slate">Hide zero: ON</Pill>}
          </div>
        </div>

        {/* ✅ Filters Row (added) */}
        <ShellCard className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <label className="text-xs font-semibold text-slate-600">Search</label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="School / District / Province..."
                className="w-full mt-1"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-slate-600">Province</label>
              <Select
                value={provinceFilter}
                onChange={(e) => {
                  setProvinceFilter(e.target.value);
                  setDistrictFilter("ALL");
                }}
                className="w-full mt-1"
              >
                {uniqueProvinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-slate-600">District</label>
              <Select value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)} className="w-full mt-1">
                {uniqueDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Need Level</label>
              <Select value={needFilter} onChange={(e) => setNeedFilter(e.target.value as NeedFilter)} className="w-full mt-1">
                <option value="ALL">All</option>
                <option value="High">High (70+)</option>
                <option value="Medium">Medium (40–69)</option>
                <option value="Low">Low (10–39)</option>
                <option value="Very Low">Very Low (&lt;10)</option>
              </Select>
            </div>

            <div className="md:col-span-12 flex flex-wrap items-center justify-between gap-3 mt-1">
              <Toggle checked={hideZero} onChange={setHideZero} label="Hide schools with 0 donations" />

              <div className="flex flex-wrap gap-2">
                <SecondaryButton
                  onClick={() => {
                    setSearch("");
                    setProvinceFilter("ALL");
                    setDistrictFilter("ALL");
                    setNeedFilter("ALL");
                    setHideZero(false);
                  }}
                >
                  Clear filters
                </SecondaryButton>

                <SecondaryButton
                  onClick={() =>
                    downloadCSV(
                      "schools_filtered.csv",
                      topSchoolsAll.map((s) => ({
                        school_id: s.school_id,
                        school_name: s.school_name,
                        district: s.district,
                        province: s.province,
                        need_score: s.need_score ?? 0,
                        total_received: s.total_received ?? 0,
                      }))
                    )
                  }
                  disabled={!topSchoolsAll.length}
                >
                  Export schools CSV
                </SecondaryButton>

                <SecondaryButton
                  onClick={() =>
                    downloadCSV(
                      "provinces_filtered.csv",
                      topProvincesAll.map((p) => ({
                        province: p.province,
                        schools: p.schools,
                        raised: p.total,
                      }))
                    )
                  }
                  disabled={!topProvincesAll.length}
                >
                  Export provinces CSV
                </SecondaryButton>
              </div>
            </div>
          </div>
        </ShellCard>
      </div>

      {/* KPI Cards (✅ added 2 more KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <KpiCard
          title="Schools (Filtered)"
          value={loading ? <Skeleton className="h-9 w-24" /> : filteredSchools.length}
          sub="Count after filters"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10h18" />
              <path d="M7 10v10" />
              <path d="M17 10v10" />
              <path d="M5 6l7-3 7 3" />
              <path d="M6 20h12" />
            </svg>
          }
        />

        <KpiCard
          title="Total Raised (Filtered)"
          value={loading ? <Skeleton className="h-9 w-40" /> : `LKR ${formatMoney(totalRaisedFromSchools)}`}
          sub="Sum of filtered schools"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" x2="12" y1="2" y2="22" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />

        <KpiCard
          title={`Raised (${range})`}
          value={loading ? <Skeleton className="h-9 w-40" /> : `LKR ${formatMoney(totalRaisedInRange)}`}
          sub={
            <span className="inline-flex items-center gap-2">
              Trends sum for selected range
              {monthChangePct !== null && <Pill tone={monthChangeTone}>{monthChangePct}</Pill>}
            </span>
          }
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          }
        />

        <KpiCard
          title="High-Need Schools"
          value={loading ? <Skeleton className="h-9 w-20" /> : highNeedCount}
          sub="Need score ≥ 70"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" x2="12" y1="9" y2="13" />
              <line x1="12" x2="12.01" y1="17" y2="17" />
            </svg>
          }
        />

        <KpiCard
          title="Avg Raised / School"
          value={loading ? <Skeleton className="h-9 w-32" /> : `LKR ${formatMoney(avgRaisedPerSchool)}`}
          sub="Filtered total ÷ schools"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h18" />
              <path d="M12 3v18" />
            </svg>
          }
        />
      </div>

      {/* ✅ Insights Panel (added) */}
      <ShellCard className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Insights</h2>
            <p className="text-sm text-slate-500">Auto summary based on current filters</p>
          </div>
          <Pill tone="slate">Live</Pill>
        </div>

        {loading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <ul className="mt-4 space-y-2 text-sm text-slate-700 list-disc pl-5">
            <li>
              {topProvince
                ? `Top province by raised amount: ${topProvince.province} (LKR ${formatMoney(topProvince.total)}).`
                : "No province data for current filters."}
            </li>
            <li>
              {topSchool
                ? `Top funded school: ${topSchool.school_name} (LKR ${formatMoney(topSchool.total_received)}).`
                : "No school data for current filters."}
            </li>
            <li>
              {monthChangePct !== null
                ? `Latest month change (trend): ${monthChangePct} vs previous month.`
                : "Not enough monthly trend data to calculate change."}
            </li>
            <li>
              {highNeedZeroCount > 0
                ? `${highNeedZeroCount} high-need school(s) have 0 donations (consider prioritizing them).`
                : "No high-need schools with 0 donations in current filters."}
            </li>
          </ul>
        )}
      </ShellCard>

      {/* Trends + Need Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 items-stretch">
        {/* Trends */}
        <ShellCard className="p-6 lg:col-span-4 flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Monthly Donation Trends</h2>
              <p className="text-sm text-slate-500">Total donation amount per month</p>
              <div className="mt-2">
                <Pill tone="blue">Total in range: LKR {formatMoney(totalRaisedInRange)}</Pill>
              </div>
            </div>

            <Select value={range} onChange={(e) => setRange(e.target.value as any)}>
              <option value="6M">Last 6 Months</option>
              <option value="12M">Last 12 Months</option>
              <option value="ALL">All Time</option>
            </Select>
          </div>

          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={rangedTrends} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} stroke="#64748b" />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                  allowDecimals={false}
                  stroke="#64748b"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "8px 12px",
                  }}
                  formatter={(v: any) => [`LKR ${Number(v).toLocaleString()}`, "Donations"]}
                />
                <Line type="monotone" dataKey="donations" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}

          {!loading && trends.length === 0 && (
            <div className="text-center py-10 text-slate-500">No trend data yet.</div>
          )}
        </ShellCard>

        {/* Need Breakdown */}
        <ShellCard className="p-6 lg:col-span-3 flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Need Level Breakdown</h2>
              <p className="text-sm text-slate-500">School counts by need score bucket</p>
            </div>
            <Pill tone="slate">Total: {filteredSchools.length}</Pill>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
          ) : (
            <div className="space-y-3">
              <MiniLegendRow color={getNeedColor(70)} label="High (70+)" value={needBreakdown.High} />
              <MiniLegendRow color={getNeedColor(40)} label="Medium (40–69)" value={needBreakdown.Medium} />
              <MiniLegendRow color={getNeedColor(10)} label="Low (10–39)" value={needBreakdown.Low} />
              <MiniLegendRow color={getNeedColor(0)} label="Very Low (<10)" value={needBreakdown["Very Low"]} />

              <div className="pt-4 mt-2 border-t border-slate-200 text-sm text-slate-600">
                Tip: Red markers on the map indicate higher-need schools.
              </div>
            </div>
          )}
        </ShellCard>
      </div>

      {/* ✅ Donations by Province Chart (added) */}
      <ShellCard className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Donations by Province</h2>
            <p className="text-sm text-slate-500">Top 8 provinces by raised amount (filtered)</p>
          </div>
          <Pill tone="slate">{topProvincesAll.length} provinces</Pill>
        </div>

        {loading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : provincesBarData.length === 0 ? (
          <div className="text-center py-10 text-slate-500">No province data for current filters.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={provincesBarData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="province" tickLine={false} axisLine={false} tickMargin={10} stroke="#64748b" />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                allowDecimals={false}
                stroke="#64748b"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "8px 12px",
                }}
                formatter={(v: any) => [`LKR ${Number(v).toLocaleString()}`, "Raised"]}
              />
             <Bar dataKey="raised" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ShellCard>

      {/* Top Provinces + Top Schools */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 items-stretch">
        {/* Top Provinces */}
        <ShellCard className="p-6 lg:col-span-3 flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Top Provinces</h2>
              <p className="text-sm text-slate-500">Sorted by raised amount</p>
            </div>
            <Pill tone="slate">{topProvincesAll.length} total</Pill>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-3">Province</th>
                      <th className="py-2 pr-3">Schools</th>
                      <th className="py-2 text-right">Raised</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedProvinces.map((p) => (
                      <tr key={p.province} className="border-b border-slate-100">
                        <td className="py-2 pr-3 font-semibold text-slate-900">{p.province}</td>
                        <td className="py-2 pr-3 text-slate-700">{p.schools}</td>
                        <td className="py-2 text-right font-semibold text-slate-900">LKR {formatMoney(p.total)}</td>
                      </tr>
                    ))}
                    {topProvincesAll.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-slate-500">
                          No province data yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {topProvincesAll.length > provincesPerPage && (
                <div className="pt-4 mt-4 border-t border-slate-200 flex justify-between">
                  <SecondaryButton onClick={() => setProvincePage((p) => Math.max(1, p - 1))} disabled={provincePage === 1}>
                    Previous
                  </SecondaryButton>
                  <Button onClick={() => setProvincePage((p) => p + 1)} disabled={!provincesHasNext}>
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </ShellCard>

        {/* Top Schools */}
        <ShellCard className="p-6 lg:col-span-4 flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Top Schools by Donations</h2>
              <p className="text-sm text-slate-500">Shows {schoolsPerPage} per page (use next/previous)</p>
            </div>
            <Pill tone="slate">{topSchoolsAll.length} total</Pill>
          </div>

          {loading ? (
            <div className="space-y-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-2 w-full mt-3" />
                  <Skeleton className="h-3 w-1/2 mt-3" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-6 flex-1">
                {displayedSchools.map((s) => {
                  const pct = (Number(s.total_received || 0) / maxSchoolTotal) * 100;
                  const meta = `${s.district || ""}${s.province ? ` • ${s.province}` : ""}`;
                  return (
                    <BarRow
                      key={s.school_id}
                      label={s.school_name}
                      metaLeft={meta}
                      right={`LKR ${formatMoney(Number(s.total_received || 0))}`}
                      value={pct}
                    />
                  );
                })}

                {topSchoolsAll.length === 0 && <div className="text-center py-10 text-slate-500">No schools found.</div>}
              </div>

              {topSchoolsAll.length > schoolsPerPage && (
                <div className="pt-4 mt-4 border-t border-slate-200 flex justify-between">
                  <SecondaryButton onClick={() => setSchoolPage((p) => Math.max(1, p - 1))} disabled={schoolPage === 1}>
                    Previous
                  </SecondaryButton>
                  <Button onClick={() => setSchoolPage((p) => p + 1)} disabled={!schoolsHasNext}>
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </ShellCard>
      </div>

      {/* Map */}
      <ShellCard className="p-4 relative">
        <div className="flex items-start justify-between gap-4 mb-3 px-1">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Schools Benefited Map (Sri Lanka)</h2>
            <p className="text-sm text-slate-500">Click markers to view school details</p>
          </div>
          <Pill tone="blue">Markers: {filteredSchools.length}</Pill>
        </div>

        {loading ? (
          <Skeleton className="h-[500px] w-full" />
        ) : (
          <MapContainer
            bounds={SRI_LANKA_BOUNDS}
            maxBounds={SRI_LANKA_BOUNDS}
            maxBoundsViscosity={1.0}
            minZoom={7}
            maxZoom={14}
            style={{ height: "500px", width: "100%" }}
          >
            <TileLayer attribution="© OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {filteredSchools.map((school) => (
              <CircleMarker
                key={school.school_id}
                center={[school.latitude, school.longitude]}
                radius={6}
                pathOptions={{
                  color: getNeedColor(school.need_score ?? 0),
                  fillColor: getNeedColor(school.need_score ?? 0),
                  fillOpacity: 0.85,
                  weight: 1,
                }}
              >
                <Popup>
                  <div className="text-sm space-y-1">
                    <p className="font-semibold text-base">{school.school_name}</p>
                    <p>
                      {school.district} District, {school.province} Province
                    </p>
                    <p>
                      Need Score: <strong>{Number(school.need_score ?? 0)}</strong> ({getNeedBucket(Number(school.need_score ?? 0))})
                    </p>
                    <p>
                      Total Received: <strong>LKR {formatMoney(Number(school.total_received || 0))}</strong>
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}

        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-white p-3 rounded-xl shadow text-sm z-[1000] border border-slate-200">
          <p className="font-semibold mb-2 text-slate-900">Need Level</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getNeedColor(70) }} />
              <span>High (70+)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getNeedColor(40) }} />
              <span>Medium (40–69)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getNeedColor(10) }} />
              <span>Low (10–39)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getNeedColor(0) }} />
              <span>Very Low (&lt;10)</span>
            </div>
          </div>
        </div>

        {!loading && (
          <div className="px-1 pt-3 text-xs text-slate-500">
            Note: Trend chart uses your <b>donation-trends</b> endpoint (amount per month). For true donation <b>count</b>, add a backend endpoint that returns number of donation records.
          </div>
        )}
      </ShellCard>
    </div>
  );
};

export default AnalyticsPage;