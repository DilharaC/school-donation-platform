// src/pages/AdminDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ReactECharts from "echarts-for-react";
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

/* ======================= Notification API ======================= */
const API_BASE = "http://localhost:8000/api";
const NOTIF_API = `${API_BASE}/notifications`;
const NOTIF_MARK_READ = (id: string) => `${API_BASE}/notifications/${id}/read`;

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
  value: string | number;
  change: ChangeObj;
  icon: React.FC<any>;
  trend?: { x: string; y: number }[];
}

type RangeKey = "6M" | "12M" | "ALL";

type DashboardAlert = {
  id: string;
  tone: "amber" | "rose" | "blue";
  title: string;
  desc: string;
  created_at?: string | null;
};

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
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${tones[tone]}`}
    >
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

const MiniSpark: React.FC<{ data?: { x: string; y: number }[] }> = ({ data }) => {
  if (!data || data.length < 2) return <div className="h-10 w-24" />;

  const option = {
    animation: true,
    animationDuration: 700,
    grid: { left: 0, right: 0, top: 2, bottom: 2 },
    xAxis: {
      type: "category",
      data: data.map((d) => d.x),
      show: false,
      boundaryGap: false,
    },
    yAxis: {
      type: "value",
      show: false,
      splitLine: { show: false },
    },
    tooltip: { show: false },
    series: [
      {
        type: "line",
        data: data.map((d) => Number(d.y || 0)),
        smooth: true,
        symbol: "none",
        lineStyle: {
          width: 2.5,
          color: "#1d4ed8",
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(29,78,216,0.28)" },
              { offset: 1, color: "rgba(29,78,216,0.02)" },
            ],
          },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 40, width: 96 }} opts={{ renderer: "svg" }} />;
};

/* ======================= Helpers ======================= */
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

const safeJson = (v: any) => {
  if (!v) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

const pickAlertTone = (title: string, body: string): "amber" | "rose" | "blue" => {
  const text = `${title} ${body}`.toLowerCase();

  if (
    text.includes("verify") ||
    text.includes("pending") ||
    text.includes("urgent") ||
    text.includes("failed")
  ) {
    return "rose";
  }

  if (
    text.includes("ending") ||
    text.includes("low funding") ||
    text.includes("deadline") ||
    text.includes("expir")
  ) {
    return "amber";
  }

  return "blue";
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

  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

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

  const mainTrendOption = useMemo(() => {
    return {
      animation: true,
      animationDuration: 900,
      animationEasing: "cubicOut",
      grid: {
        left: 10,
        right: 10,
        top: 20,
        bottom: 10,
        containLabel: true,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(15,23,42,0.94)",
        borderWidth: 0,
        textStyle: {
          color: "#fff",
          fontSize: 12,
        },
        extraCssText:
          "border-radius:14px; box-shadow: 0 12px 30px rgba(0,0,0,0.18); backdrop-filter: blur(10px);",
        formatter: (params: any) => {
          const point = Array.isArray(params) ? params[0] : params;
          return `
            <div style="padding:2px 4px;">
              <div style="font-weight:700; margin-bottom:6px;">${point?.axisValue ?? ""}</div>
              <div>Donations: <b>LKR ${Number(point?.value ?? 0).toLocaleString()}</b></div>
            </div>
          `;
        },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: rangedChart.map((r: any) => r.month),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#64748b",
          fontSize: 12,
        },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: {
            color: "#e2e8f0",
            type: "dashed",
          },
        },
        axisLabel: {
          color: "#64748b",
          formatter: (v: number) => `${Math.round(Number(v) / 1000)}k`,
        },
      },
      series: [
        {
          name: "Donations",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          showSymbol: false,
          lineStyle: {
            width: 3.5,
            color: "#1d4ed8",
            shadowColor: "rgba(29,78,216,0.20)",
            shadowBlur: 10,
          },
          itemStyle: {
            color: "#1d4ed8",
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(29,78,216,0.24)" },
                { offset: 1, color: "rgba(29,78,216,0.02)" },
              ],
            },
          },
          data: rangedChart.map((r: any) => Number(r?.donations || 0)),
        },
      ],
    };
  }, [rangedChart]);

  const fetchUnreadAlerts = async () => {
    try {
      setAlertsLoading(true);

      const res = await axios.get(NOTIF_API, {
        withCredentials: true,
        params: {
          role: "admin",
          unread: 1,
          page: 1,
          limit: 3,
        },
      });

      const rows = res.data?.rows || [];

      const mapped: DashboardAlert[] = rows.map((r: any) => {
        const data = safeJson(r.data) || r.data_obj || {};
        const title = data?.title || "Notification";
        const desc = data?.body || "";
        const tone = pickAlertTone(title, desc);

        return {
          id: String(r.id),
          tone,
          title,
          desc,
          created_at: r.created_at,
        };
      });

      setAlerts(mapped);
    } catch (error) {
      console.error("Unread alerts fetch error:", error);
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  };

  const dismissAlert = async (id: string) => {
    try {
      await axios.post(
        NOTIF_MARK_READ(id),
        null,
        {
          withCredentials: true,
          params: { role: "admin" },
        }
      );

      setAlerts((prev) => prev.filter((x) => x.id !== id));
    } catch (error) {
      console.error("Failed to mark alert as read:", error);
    }
  };

  useEffect(() => {
    let alive = true;
    let inFlight = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const fetchDashboardData = async (silent = false) => {
      if (!alive || inFlight) return;
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

        setStats([
          {
            label: "Today Donors",
            value: todayDonors.toLocaleString(),
            change: donorsChange,
            icon: UsersIcon as any,
            trend: donorsMini,
          },
          {
            label: "Today Raised (LKR)",
            value: todayRaised.toLocaleString(),
            change: raisedChange,
            icon: BanknotesIcon as any,
            trend: chartMini,
          },
          {
            label: "Today Campaigns",
            value: todayCampaigns.toLocaleString(),
            change: campaignsChange,
            icon: HeartIcon as any,
            trend: activeMini,
          },
          {
            label: "Today Avg Donation",
            value: Math.round(todayAvg).toLocaleString(),
            change: avgChange,
            icon: ArrowTrendingUpIcon as any,
            trend: avgMini,
          },
        ]);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        inFlight = false;
        if (!silent && alive) setLoading(false);
      }
    };

    fetchDashboardData(false);
    fetchUnreadAlerts();

    interval = setInterval(() => {
      fetchDashboardData(true);
      fetchUnreadAlerts();
    }, 20000);

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
                <Skeleton className="mt-3 w-24 h-10" />
              </Card>
            ))
          : stats.map((stat) => {
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-slate-500">{stat.label}</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900 truncate">{stat.value}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeClass}`}
                        title="Weekly change (last 7 days vs previous 7 days)"
                      >
                        {stat.change.state === "new" ? "" : isUp ? "▲" : "▼"} {badgeText}
                      </span>

                      <MiniSpark data={stat.trend} />
                    </div>
                  </div>
                </Card>
              );
            })}
      </div>

      {/* Chart + Top Campaigns */}
      <div className="grid gap-6 lg:grid-cols-7 items-stretch">
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
            <ReactECharts option={mainTrendOption} style={{ height: 300, width: "100%" }} notMerge lazyUpdate />
          )}
        </Card>

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

        <Card className="p-6 lg:col-span-3">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 inline-flex items-center gap-2">
              <BellAlertIcon className="h-5 w-5 text-blue-700" />
              Alerts & Tasks
            </h3>
            <p className="text-sm text-slate-500">Unread admin notifications</p>
          </div>

          <div className="space-y-3">
            {alertsLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            ) : alerts.length === 0 ? (
              <div className="text-sm text-slate-500 p-4 rounded-2xl border border-slate-200">
                No unread notifications
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

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                    <p className="text-sm text-slate-600 mt-1">{a.desc}</p>
                    <p className="text-xs text-slate-500 mt-2">{fmtDate(a.created_at)}</p>
                  </div>

                  <button
                    className="text-slate-500 hover:text-slate-700 font-semibold"
                    onClick={() => dismissAlert(a.id)}
                    aria-label="Mark as read"
                    title="Mark as read"
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