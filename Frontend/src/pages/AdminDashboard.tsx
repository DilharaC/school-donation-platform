// src/pages/AdminDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "../css/index.css";
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  BellAlertIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

/* ======================= Types ======================= */
interface CardProps {
  children: React.ReactNode;
  className?: string;
}
interface ProgressProps {
  value: number;
  className?: string;
}
interface AvatarProps {
  children: React.ReactNode;
  className?: string;
}
interface ButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

type ChangeState = "ok" | "new" | "zero";
type ChangeObj = { pct: number | null; state: ChangeState };

interface Stat {
  label: string;
  value: string | number; // TODAY value
  change: ChangeObj; // weekly % (7d vs prev 7d)
  icon: React.FC;
  trend?: { x: string; y: number }[];
}

type RangeKey = "6M" | "12M" | "ALL";

/* ======================= Small UI Components ======================= */
const Card: React.FC<CardProps> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />
);

const Progress: React.FC<ProgressProps> = ({ value, className = "" }) => (
  <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${className}`}>
    {/* ✅ keep your blue */}
    <div
      className="h-full bg-blue-600 transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

const Avatar: React.FC<AvatarProps> = ({ children, className = "" }) => (
  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${className}`}>
    {children}
  </div>
);

const Pill: React.FC<{
  tone?: "green" | "amber" | "blue" | "slate" | "rose";
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
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${tones[tone]}`}>
      {children}
    </span>
  );
};

const Button: React.FC<ButtonProps> = ({
  children,
  className = "",
  onClick,
  disabled,
  type = "button",
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors
      focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
      px-4 py-2 text-sm bg-blue-700 text-white hover:bg-blue-800
      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-700 ${className}`}
  >
    {children}
  </button>
);

const SecondaryButton: React.FC<ButtonProps> = ({
  children,
  className = "",
  onClick,
  disabled,
  type = "button",
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors
      focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2
      px-4 py-2 text-sm bg-slate-100 text-slate-700 hover:bg-slate-200
      disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

/** ✅ Sparkline with UNIQUE gradient id (prevents collisions) */
const MiniSpark: React.FC<{ data?: { x: string; y: number }[]; gid: string }> = ({ data, gid }) => {
  if (!data || data.length < 2) return <div className="h-9" />;
  const safe = data.map((d) => ({ ...d, y: Number(d.y || 0) }));
  const fillId = `sparkFill-${gid}`;

  return (
    <div className="h-9 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={safe} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            {/* ✅ keep your blue */}
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="10%" stopColor="#1d4ed8" stopOpacity={0.25} />
              <stop offset="90%" stopColor="#1d4ed8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="y" stroke="#1d4ed8" fill={`url(#${fillId})`} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ======================= Helpers ======================= */
// const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

const toInitials = (name?: string) => {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
};

const fmtMoney = (n: number) => `LKR ${Number(n || 0).toLocaleString()}`;

const normalizeChange = (x: any): ChangeObj => {
  const state: ChangeState = x?.state === "new" || x?.state === "zero" ? x.state : "ok";
  const pct = x?.pct === null || x?.pct === undefined ? null : Number(x.pct);
  return { pct, state };
};

const alertIcon = (tone: "amber" | "rose" | "blue") => {
  if (tone === "amber") return <ExclamationTriangleIcon className="h-5 w-5 text-amber-700" />;
  if (tone === "rose") return <BellAlertIcon className="h-5 w-5 text-rose-700" />;
  return <ChartBarIcon className="h-5 w-5 text-blue-700" />;
};

/* ======================= Page ======================= */
const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);

  const [recentDonors, setRecentDonors] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [range, setRange] = useState<RangeKey>("12M");

  // Top campaigns pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // Alerts
  const [alerts, setAlerts] = useState<
    Array<{ id: string; tone: "amber" | "rose" | "blue"; title: string; desc: string }>
  >([
    { id: "ending", tone: "amber", title: "Campaign ending soon", desc: "“Health Kits Drive” ends this week." },
    { id: "verify", tone: "rose", title: "Pending verification", desc: "3 donations require confirmation." },
    { id: "low", tone: "blue", title: "Low funding campaign", desc: "“Playground Project” is at 22%." },
  ]);

  const rangedChart = useMemo(() => {
    const base = Array.isArray(chartData) ? chartData : [];
    if (range === "6M") return base.slice(-6);
    if (range === "12M") return base.slice(-12);
    return base;
  }, [chartData, range]);

  const totalInRange = useMemo(() => {
    return rangedChart.reduce((sum: number, r: any) => sum + Number(r?.donations || 0), 0);
  }, [rangedChart]);

  const sortedTopCampaigns = useMemo(() => {
    return [...activeCampaigns].sort(
      (a: any, b: any) => Number(b.amount_raised || 0) - Number(a.amount_raised || 0)
    );
  }, [activeCampaigns]);

  const displayedCampaigns = useMemo(() => {
    return sortedTopCampaigns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [sortedTopCampaigns, currentPage]);

  const hasNextPage = currentPage * itemsPerPage < sortedTopCampaigns.length;

  useEffect(() => {
    let alive = true;
    let inFlight = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const fetchDashboardData = async (silent = false) => {
      if (!alive) return;
      if (inFlight) return;
      inFlight = true;

      try {
        if (!silent && alive) setLoading(true);

        const [campaignRes, donorsRes, chartRes, kpiRes] = await Promise.all([
          axios.get("http://localhost:8000/api/donation_requests?status=Approved&limit=1000&page=1"),
          axios.get("http://localhost:8000/api/recent-donors"),
          axios.get("http://localhost:8000/api/donation-trends"),
          axios.get("http://localhost:8000/api/dashboard/kpis-today-weekly"),
        ]);

        if (!alive) return;

        const projects = campaignRes.data?.projects || [];
        setActiveCampaigns(projects);

        const donors = (donorsRes.data || []).map((d: any) => ({
          ...d,
          initials: d.initials || toInitials(d.name),
        }));
        setRecentDonors(donors);

        const trendData = Array.isArray(chartRes.data) ? chartRes.data : [];
        setChartData(trendData);

        const today = kpiRes.data?.today || { donors: 0, raised: 0, campaigns: 0, avg: 0 };
        const change7d = kpiRes.data?.change7d || {};

        const donorsChange = normalizeChange(change7d.donors);
        const raisedChange = normalizeChange(change7d.raised);
        const campaignsChange = normalizeChange(change7d.campaigns);
        const avgChange = normalizeChange(change7d.avg);

        const todayDonors = Number(today.donors || 0);
        const todayRaised = Number(today.raised || 0);
        const todayCampaigns = Number(today.campaigns || 0);
        const todayAvg = Number(today.avg || 0);

        const chartMini = trendData.slice(-8).map((r: any, i: number) => ({
          x: r.month ?? String(i),
          y: Number(r?.donations || 0),
        }));

        const donorsMini = chartMini.map((p: any) => ({ ...p, y: Math.max(0, Math.round(p.y / 800)) }));
        const avgMini = chartMini.map((p: any) => ({ ...p, y: Math.max(0, Math.round(p.y / 30)) }));
        const activeMini = chartMini.map((p: any, idx: number) => ({
          ...p,
          y: chartMini.length
            ? Math.max(0, Math.round((idx + 1) * (todayCampaigns / chartMini.length)))
            : 0,
        }));

        // ✅ use Heroicons but keep blue theme
        setStats([
          { label: "Today Donors", value: todayDonors.toLocaleString(), change: donorsChange, icon: UsersIcon as any, trend: donorsMini },
          { label: "Today Raised (LKR)", value: todayRaised.toLocaleString(), change: raisedChange, icon: BanknotesIcon as any, trend: chartMini },
          { label: "Today Campaigns", value: todayCampaigns.toLocaleString(), change: campaignsChange, icon: HeartIcon as any, trend: activeMini },
          { label: "Today Avg Donation", value: Math.round(todayAvg).toLocaleString(), change: avgChange, icon: ArrowTrendingUpIcon as any, trend: avgMini },
        ]);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        inFlight = false;
        if (!silent && alive) setLoading(false);
      }
    };

    fetchDashboardData(false);
    interval = setInterval(() => fetchDashboardData(true), 20000);

    return () => {
      alive = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10" />
                    <Skeleton className="w-28 h-4" />
                  </div>
                  <Skeleton className="w-14 h-6" />
                </div>
                <Skeleton className="mt-4 w-24 h-7" />
                <Skeleton className="mt-3 w-24 h-9" />
              </Card>
            ))
          : stats.map((stat, idx) => {
              const Icon = stat.icon as any;

              const pct = stat.change.pct ?? 0;
              const isUp = pct >= 0;

              const badgeText =
                stat.change.state === "new"
                  ? "NEW"
                  : stat.change.state === "zero"
                  ? "0.0%"
                  : `${Math.abs(pct).toFixed(1)}%`;

              const badgeClass =
                stat.change.state === "new"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : isUp
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-rose-50 text-rose-700 border-rose-200";

              return (
                <Card key={stat.label} className="p-5 hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* ✅ keep your blue badge */}
                      <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">{stat.label}</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{stat.value}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeClass}`}
                        title="Weekly change (last 7 days vs previous 7 days)"
                      >
                        {stat.change.state === "new" ? "" : isUp ? "▲" : "▼"} {badgeText}
                      </span>

                      {/* ✅ unique gradient id */}
                      <MiniSpark data={stat.trend} gid={`${idx}-${stat.label.replace(/\s+/g, "-")}`} />
                    </div>
                  </div>
                </Card>
              );
            })}
      </div>

      {/* Chart + Top Campaigns */}
      <div className="grid gap-6 lg:grid-cols-7 items-stretch">
        {/* Chart */}
        <Card className="p-6 lg:col-span-4 flex flex-col h-full">
          <div className="flex items-start justify-between mb-5 gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 inline-flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-blue-700" />
                Donations Trend
              </h3>
              <p className="text-sm text-slate-500">Monthly donation overview</p>
              <div className="mt-2">
                <Pill tone="blue">Total in range: {fmtMoney(totalInRange)}</Pill>
              </div>
            </div>

            <select
              value={range}
              onChange={(e) => setRange(e.target.value as RangeKey)}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700"
            >
              <option value="6M">Last 6 Months</option>
              <option value="12M">Last 12 Months</option>
              <option value="ALL">All Time</option>
            </select>
          </div>

          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={rangedChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  {/* ✅ keep your blue */}
                  <linearGradient id="fillDonations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} stroke="#64748b" />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                  stroke="#64748b"
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "8px 12px",
                  }}
                  formatter={(value: any) => [`LKR ${Number(value || 0).toLocaleString()}`, "Donations"]}
                />

                {/* ✅ keep your blue */}
                <Area
                  type="monotone"
                  dataKey="donations"
                  stroke="#1d4ed8"
                  fillOpacity={1}
                  fill="url(#fillDonations)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Top Campaigns */}
        <Card className="p-6 lg:col-span-3 flex flex-col h-full">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 inline-flex items-center gap-2">
                <HeartIcon className="h-5 w-5 text-blue-700" />
                Top Campaigns
              </h3>
              <p className="text-sm text-slate-500">Sorted by raised amount</p>
            </div>
            <Pill tone="slate">{sortedTopCampaigns.length} total</Pill>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-2 w-full mt-3" />
                  <Skeleton className="h-3 w-56 mt-3" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {displayedCampaigns.map((campaign: any) => {
                  const raised = Number(campaign.amount_raised || 0);
                  const target = Number(campaign.estimated_price || 0);
                  const progress = target > 0 ? (raised / target) * 100 : 0;
                  const remaining = Math.max(target - raised, 0);

                  return (
                    <div
                      key={campaign.request_id}
                      className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-900 truncate">{campaign.request_title}</h4>
                          <p className="text-sm text-slate-500 truncate mt-1 inline-flex items-center gap-1.5">
                            <BuildingOffice2Icon className="h-4 w-4 text-slate-400" />
                            {campaign.school_name}
                          </p>
                        </div>

                        <Pill tone={progress >= 100 ? "green" : "blue"}>
                          {Math.min(100, Math.round(progress))}%
                        </Pill>
                      </div>

                      <div className="mt-3">
                        <Progress value={progress} className="h-2" />
                        <div className="mt-2 flex items-center justify-between text-sm">
                          <span className="text-slate-700 font-semibold">
                            {fmtMoney(raised)} / {fmtMoney(target)}
                          </span>
                          <span className="text-slate-500">Remaining: {fmtMoney(remaining)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto pt-4 border-t border-slate-200 flex justify-between">
                <SecondaryButton
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-6"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                  Previous
                </SecondaryButton>

                <Button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={!hasNextPage}
                  className="px-6"
                >
                  Next
                  <ChevronRightIcon className="h-5 w-5" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Recent Donations + Alerts */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Recent Donations */}
        <Card className="p-6 lg:col-span-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 inline-flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-blue-700" />
                Recent Donations
              </h3>
              <p className="text-sm text-slate-500">Latest contributions</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24 mt-2" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-3 pr-3">Donor</th>
                    <th className="py-3 pr-3">Amount</th>
                    <th className="py-3 pr-3">Campaign</th>
                    <th className="py-3 pr-3">Status</th>
                    <th className="py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDonors.slice(0, 8).map((donor: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="bg-blue-50 text-blue-700 font-semibold text-sm">
                            {donor.initials}
                          </Avatar>
                          <div>
                            <p className="font-semibold text-slate-900">{donor.name}</p>
                            <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                              <ClockIcon className="h-4 w-4 text-slate-400" />
                              {donor.email || donor.time}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3 font-semibold text-slate-900">
                        {fmtMoney(Number(donor.amount || 0))}
                      </td>
                      <td className="py-3 pr-3 text-slate-700">{donor.campaign || "—"}</td>
                      <td className="py-3 pr-3">
                        <Pill tone="green">
                          <CheckCircleIcon className="h-4 w-4" />
                          Paid
                        </Pill>
                      </td>
                      <td className="py-3 text-slate-700">{donor.date || donor.time || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {recentDonors.length === 0 && (
                <div className="text-center py-10 text-slate-500">No recent donations found.</div>
              )}
            </div>
          )}
        </Card>

        {/* Alerts */}
        <Card className="p-6 lg:col-span-3">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 inline-flex items-center gap-2">
              <BellAlertIcon className="h-5 w-5 text-blue-700" />
              Alerts & Tasks
            </h3>
            <p className="text-sm text-slate-500">Things to review</p>
          </div>

          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-sm text-slate-500 p-4 rounded-2xl border border-slate-200">
                No alerts right now 🎉
              </div>
            ) : (
              alerts.map((a) => (
                <div
                  key={a.id}
                  className={`p-4 rounded-2xl border flex items-start gap-3 ${
                    a.tone === "amber"
                      ? "bg-amber-50 border-amber-200"
                      : a.tone === "rose"
                      ? "bg-rose-50 border-rose-200"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-white/60 border border-white/40 grid place-items-center">
                    {alertIcon(a.tone)}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                    <p className="text-sm text-slate-600 mt-1">{a.desc}</p>
                  </div>

                  <button
                    className="text-slate-500 hover:text-slate-700 font-semibold"
                    onClick={() => setAlerts((prev) => prev.filter((x) => x.id !== a.id))}
                    aria-label="Dismiss alert"
                    title="Dismiss"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;