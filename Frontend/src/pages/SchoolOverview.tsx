import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ChatWidget from "../components/ChatWidget";

/** ===================== Types ===================== */
type OverviewRes = {
  school: {
    school_id: number;
    school_name: string;
    registration_no?: string;
    contact_email?: string;
    contact_phone?: string;
    district?: string;
    province?: string;
    address?: string;
    need_score: number;
    verified: number;
    status: string;
    document_link?: string | null;
  };
  kpis: {
    total_received: number;
    donations_count: number;
    last_donation_at?: string | null;
    active_campaigns: number;
    pending_campaigns: number;
  };
  trend_30d: Array<{ day: string; total: number }>;
  recent_donations: Array<{
    donation_id: number;
    donor_name: string;
    donor_email: string;
    amount: number;
    created_at: string;
    time_ago?: string;
    request_title?: string;
  }>;
  top_campaigns: Array<{
    request_id: number;
    request_title: string;
    category: string;
    estimated_price: number;
    amount_raised: number;
    status: string;
    created_at: string;
  }>;
};

/** ===================== UI Helpers ===================== */
const titleCase = (s?: string) =>
  (s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());

const fmtMoney = (n: number) => `LKR ${Number(n || 0).toLocaleString()}`;
const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");

const statusPill = (s?: string) => {
  const v = (s || "").toLowerCase();
  if (v === "active") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (v === "inactive") return "bg-slate-50 text-slate-700 border-slate-200";
  if (v === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
};

const needUI = (need: number) => {
  if (need >= 70) return "bg-rose-50 text-rose-700 border-rose-200";
  if (need >= 40) return "bg-amber-50 text-amber-700 border-amber-200";
  if (need >= 10) return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
};

/** ===================== Small Components ===================== */
const Card: React.FC<{ children: any; className?: string }> = ({ children, className = "" }) => (
  <div
    className={[
      "bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-slate-200/70",
      "hover:shadow-md transition-shadow",
      className,
    ].join(" ")}
  >
    {children}
  </div>
);

const Pill: React.FC<{ children: any; className?: string }> = ({ children, className = "" }) => (
  <span
    className={[
      "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border",
      "shadow-[0_1px_0_rgba(15,23,42,0.03)]",
      className,
    ].join(" ")}
  >
    {children}
  </span>
);

const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={["animate-pulse rounded-xl bg-slate-200/70", className].join(" ")} />
);

const Icon: React.FC<{ name: "money" | "gift" | "bolt" | "clock" | "shield" | "link" | "refresh" }> = ({
  name,
}) => {
  const common = "w-5 h-5 text-slate-600";
  if (name === "refresh")
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (name === "link")
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  if (name === "money")
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M3 7h18v10H3V7Z" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M12 15c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M7 11h.01M17 13h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  if (name === "gift")
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M3 7h18v5H3V7Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M20 12v9H4v-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12 7v14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path
          d="M12 7c-1.8 0-3.5-1.1-3.5-2.5S9.7 2 12 4.2C14.3 2 15.5 3.1 15.5 4.5S13.8 7 12 7Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  if (name === "bolt")
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M13 2 3 14h7l-1 8 12-14h-7l-1-6Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (name === "clock")
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  // shield
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 22s8-4 8-10V6l-8-4-8 4v6c0 6 8 10 8 10Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

/** ===================== Better SVG Chart (no libs) ===================== */
const TrendChart: React.FC<{ labels: string[]; points: number[] }> = ({ labels, points }) => {
  const w = 640;
  const h = 160;
  const pad = 18;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  const max = Math.max(1, ...points);
  const min = Math.min(0, ...points);
  const range = Math.max(1, max - min);

  const stepX = innerW / Math.max(1, points.length - 1);

  const xy = points.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / range) * innerH;
    return { x, y, v };
  });

  const d = xy
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const area = `${d} L ${(pad + (points.length - 1) * stepX).toFixed(1)} ${(pad + innerH).toFixed(
    1
  )} L ${pad} ${(pad + innerH).toFixed(1)} Z`;

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const gridLines = 4;
  const gridYs = new Array(gridLines + 1).fill(0).map((_, i) => pad + (innerH * i) / gridLines);

  const hi = hoverIdx !== null ? xy[hoverIdx] : null;
  const hiLabel = hoverIdx !== null ? labels[hoverIdx] : "";

  return (
    <div className="relative">
      {/* Tooltip */}
      {hi && (
        <div
          className="absolute top-2 right-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm text-xs"
          aria-live="polite"
        >
          <div className="font-semibold text-slate-900">{hiLabel}</div>
          <div className="text-slate-600 mt-0.5">{fmtMoney(hi.v)}</div>
        </div>
      )}

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-[160px]"
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* grid */}
        {gridYs.map((y, i) => (
          <line key={i} x1={pad} x2={w - pad} y1={y} y2={y} stroke="currentColor" className="text-slate-200" />
        ))}

        {/* area */}
        <path d={area} fill="currentColor" className="text-slate-900/5" />

        {/* line */}
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2.2" className="text-slate-900/35" />

        {/* points hit areas */}
        {xy.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? 4 : 2.5}
              fill="currentColor"
              className={hoverIdx === i ? "text-slate-900/60" : "text-slate-900/35"}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={10}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
            />
          </g>
        ))}

        {/* hover vertical line */}
        {hi && (
          <line
            x1={hi.x}
            x2={hi.x}
            y1={pad}
            y2={h - pad}
            stroke="currentColor"
            className="text-slate-900/10"
          />
        )}
      </svg>
    </div>
  );
};

/** ===================== Main Page ===================== */
const SchoolOverview: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewRes | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setErrMsg(null);

    try {
      const res = await axios.get("http://localhost:8000/api/school/overview", {
        withCredentials: true,
      });
      setData(res.data);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || "Failed to load overview";
      console.log("overview error:", status, err?.response?.data);
      setErrMsg(`${status || ""} ${msg}`.trim());
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const trendPoints = useMemo(() => data?.trend_30d?.map((x) => Number(x.total || 0)) ?? [], [data]);
  const trendLabels = useMemo(
    () =>
      data?.trend_30d?.map((x) => {
        const d = new Date(x.day);
        // short label: Feb 22
        return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
      }) ?? [],
    [data]
  );

  /** ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
        <div className="absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 opacity-80" />

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <div className="flex-1">
              <Skeleton className="h-8 w-72" />
              <Skeleton className="h-4 w-56 mt-2" />
              <div className="flex gap-2 mt-3">
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-28 rounded-full" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32 mt-2" />
              <Skeleton className="h-4 w-40 mt-3" />
            </Card>
            <Card className="p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-24 mt-2" />
              <Skeleton className="h-4 w-32 mt-3" />
            </Card>
            <Card className="p-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20 mt-2" />
              <Skeleton className="h-4 w-32 mt-3" />
            </Card>
            <Card className="p-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20 mt-2" />
              <Skeleton className="h-4 w-32 mt-3" />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-4 lg:col-span-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-[160px] w-full mt-3" />
            </Card>
            <Card className="p-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-24 w-full mt-3" />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  /** ---------- Error / Not Logged ---------- */
  if (!data) {
    return (
      <div className="relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
        <div className="absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 opacity-80" />

        <Card className="p-10 text-center max-w-2xl mx-auto">
          <div className="text-3xl mb-2">🏫</div>
          <div className="text-slate-900 font-extrabold text-xl">Overview not available</div>
          <div className="text-slate-500 text-sm mt-2">
            Please login as a school account.{" "}
            {errMsg ? <span className="block mt-2 text-rose-700 font-semibold">{errMsg}</span> : null}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              onClick={fetchOverview}
              className="px-4 py-2 rounded-xl font-semibold bg-blue-700 text-white hover:bg-blue-800"
            >
              Retry
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const { school, kpis, recent_donations, top_campaigns } = data;

  return (
    <div className="relative min-h-[calc(100vh-80px)]">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
      <div className="absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 opacity-80" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-extrabold shadow-sm">
              {titleCase(school.school_name).slice(0, 1) || "S"}
            </div>

            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                {titleCase(school.school_name)}
              </h1>
              <p className="text-slate-500 mt-1">
                {school.district || "—"}, {school.province || "—"} •{" "}
                <span className={["font-semibold", (school.status || "") ? "text-slate-700" : ""].join(" ")}>
                  {(school.status || "inactive").toUpperCase()}
                </span>
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Pill className={needUI(Number(school.need_score || 0))}>
                  Need: {Number(school.need_score || 0).toFixed(1)}
                </Pill>

                <Pill className={school.verified ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-700 border-slate-200"}>
                  <Icon name="shield" />
                  {school.verified ? "Verified" : "Not Verified"}
                </Pill>

                <Pill className={statusPill(school.status)}>{(school.status || "inactive").toUpperCase()}</Pill>

                {school.registration_no ? (
                  <Pill className="bg-slate-50 text-slate-700 border-slate-200">Reg: {school.registration_no}</Pill>
                ) : (
                  <Pill className="bg-rose-50 text-rose-700 border-rose-200">Missing Reg No</Pill>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchOverview}
              className="px-4 py-2 rounded-xl font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm inline-flex items-center gap-2"
            >
              <Icon name="refresh" />
              Refresh
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-500">Total Received</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">{fmtMoney(kpis.total_received)}</div>
                <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <Icon name="clock" /> Last: {fmtDateTime(kpis.last_donation_at)}
                </div>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-slate-900/5 border border-slate-200 flex items-center justify-center">
                <Icon name="money" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-500">Donations Count</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">{kpis.donations_count}</div>
                <div className="text-xs text-slate-500 mt-2">Paid donations only</div>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-slate-900/5 border border-slate-200 flex items-center justify-center">
                <Icon name="gift" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-500">Active Campaigns</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">{kpis.active_campaigns}</div>
                <div className="text-xs text-slate-500 mt-2">Approved campaigns</div>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-slate-900/5 border border-slate-200 flex items-center justify-center">
                <Icon name="bolt" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-500">Pending Campaigns</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">{kpis.pending_campaigns}</div>
                <div className="text-xs text-slate-500 mt-2">Waiting approval</div>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-slate-900/5 border border-slate-200 flex items-center justify-center">
                <Icon name="clock" />
              </div>
            </div>
          </Card>
        </div>

        {/* Trend + Verification */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-4 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Donation Trend (Last 30 Days)</div>
                <div className="text-xs text-slate-500 mt-1">Paid donation amount per day</div>
              </div>
              <Pill className="bg-slate-50 text-slate-700 border-slate-200">{trendPoints.length} days</Pill>
            </div>

            <div className="mt-3">
              <TrendChart labels={trendLabels} points={trendPoints} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Verification</div>
                <div className="text-xs text-slate-500 mt-1">Admin verifies using Reg No + Document</div>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-slate-900/5 border border-slate-200 flex items-center justify-center">
                <Icon name="shield" />
              </div>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Registration No</span>
                <span className="font-semibold text-slate-900 truncate">{school.registration_no || "—"}</span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Document</span>
                {school.document_link ? (
                  <a
                    className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                    href={school.document_link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Icon name="link" /> Open
                  </a>
                ) : (
                  <span className="font-semibold text-rose-700">Not uploaded</span>
                )}
              </div>

              <div className="pt-2">
                <Pill className={school.verified ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-700 border-slate-200"}>
                  {school.verified ? "Verified" : "Not Verified"}
                </Pill>

                {!school.verified && (
                  <div className="text-xs text-slate-500 mt-2">Upload document + add Reg No to get verified faster.</div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Donations + Top Campaigns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-900">Recent Donations</div>
              <Pill className="bg-slate-50 text-slate-700 border-slate-200">{recent_donations.length}</Pill>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {recent_donations.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-sm">
                  <div className="text-2xl mb-2">🎁</div>
                  No paid donations yet.
                </div>
              ) : (
                recent_donations.map((d) => (
                  <div key={d.donation_id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{d.donor_name || "Anonymous"}</div>
                      <div className="text-xs text-slate-500 truncate">{d.request_title || "Donation"}</div>
                      <div className="text-xs text-slate-400">{d.time_ago || fmtDateTime(d.created_at)}</div>
                    </div>

                    <div className="font-extrabold text-slate-900 whitespace-nowrap">{fmtMoney(d.amount)}</div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-900">Your Latest Campaigns</div>
              <Pill className="bg-slate-50 text-slate-700 border-slate-200">{top_campaigns.length}</Pill>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {top_campaigns.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-sm">
                  <div className="text-2xl mb-2">📌</div>
                  No campaigns created yet.
                </div>
              ) : (
                top_campaigns.map((c) => {
                  const raised = Number(c.amount_raised || 0);
                  const target = Number(c.estimated_price || 0);
                  const pct = target > 0 ? Math.min(100, (raised / target) * 100) : 0;

                  const status = (c.status || "").toLowerCase();
                  const statusCls =
                    status === "approved"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : status === "pending"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-50 text-slate-700 border-slate-200";

                  return (
                    <div key={c.request_id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{titleCase(c.request_title)}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{c.category}</span>
                            <Pill className={statusCls}>{c.status}</Pill>
                          </div>
                        </div>

                        <div className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                          {fmtMoney(raised)} / {fmtMoney(target)}
                        </div>
                      </div>

                      <div className="mt-2 h-2 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                        <div className="h-full bg-slate-900/20" style={{ width: `${pct}%` }} />
                      </div>

                      <div className="text-xs text-slate-500 mt-1">{pct.toFixed(0)}% funded</div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
        <ChatWidget /> 
    </div>
  );
};

export default SchoolOverview;