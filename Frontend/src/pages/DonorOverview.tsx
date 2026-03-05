import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  ArrowTrendingUpIcon,
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  ReceiptRefundIcon,
  Squares2X2Icon,
  UsersIcon,
} from "@heroicons/react/24/solid";

const API_ROOT = "http://localhost:8000";
const API_BASE = `${API_ROOT}/api`;

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");
const formatLKR = (n: number) => `LKR ${Math.round(Number(n || 0)).toLocaleString()}`;
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

type TrendPoint = { day: string; total: number };

type RecentDonation = {
  donation_id: number;
  amount: number;
  created_at: string;
  time?: string | null;
  request_id?: number;
  request_title?: string | null;
  school_id?: number;
  school_name?: string | null;
  province?: string | null;
  district?: string | null;
};

type TopSchool = {
  school_id: number;
  school_name: string;
  province?: string | null;
  district?: string | null;
  total: number;
  count: number;
};

type OverviewRes = {
  donor: { donor_id: number; name: string; email?: string | null };
  kpis: {
    total_donated: number;
    donations_count: number;
    schools_supported: number;
    last_donation_at?: string | null;
  };
  trend_30d: TrendPoint[];
  recent_donations: RecentDonation[];
  top_schools: TopSchool[];
};

function initials(name?: string | null) {
  const s = (name || "").trim();
  if (!s) return "D";
  const p = s.split(/\s+/);
  const a = p[0]?.[0] || "D";
  const b = p.length > 1 ? p[p.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

/** Simple SVG line chart (no libs) */
function LineChart({
  data,
  height = 90,
}: {
  data: { xLabel: string; y: number }[];
  height?: number;
}) {
  const w = 640;
  const h = height;
  const pad = 10;

  const ys = data.map((d) => d.y);
  const maxY = Math.max(1, ...ys);
  const minY = Math.min(0, ...ys);

  const points = data.map((d, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1);
    const t = (d.y - minY) / Math.max(1e-9, maxY - minY);
    const y = h - pad - clamp01(t) * (h - pad * 2);
    return { x, y };
  });

  const d = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  const last = data[data.length - 1]?.y ?? 0;

  return (
    <div className="w-full">
      {/* ✅ AdminDashboard palette (blue) */}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[90px] text-blue-700">
        <line x1="0" y1={h - pad} x2={w} y2={h - pad} stroke="currentColor" strokeOpacity="0.12" />
        <path d={d} fill="none" stroke="currentColor" strokeOpacity="0.95" strokeWidth="2" />
        {points.length > 0 && (
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3.5" fill="currentColor" />
        )}
      </svg>

      <div className="mt-1 text-xs text-slate-500">
        Last 30 days total: <span className="font-semibold text-slate-800">{formatLKR(last)}</span>
      </div>
    </div>
  );
}

const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cx("rounded-3xl border border-slate-200 bg-white shadow-sm", className)}>{children}</div>
);

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500 font-bold">{label}</div>
          {/* keep KPI number strong like admin */}
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{value}</div>
          {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
        </div>

        {/* ✅ blue badge like AdminDashboard */}
        <div className="h-10 w-10 rounded-2xl bg-blue-50 border border-blue-200 grid place-items-center text-blue-700">
          <div className="h-5 w-5">{icon}</div>
        </div>
      </div>
    </Card>
  );
}

function EmptyBlock({
  icon,
  title,
  desc,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-50 border border-blue-200 grid place-items-center text-blue-700">
        <div className="h-6 w-6">{icon}</div>
      </div>
      <div className="mt-4 text-slate-900 font-extrabold text-lg">{title}</div>
      <div className="mt-1 text-slate-500 text-sm">{desc}</div>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

const DonorOverview: React.FC = () => {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [ov, setOv] = useState<OverviewRes | null>(null);

  const chartData = useMemo(() => {
    const t = ov?.trend_30d || [];
    return t.map((p) => ({ xLabel: p.day, y: Number(p.total || 0) }));
  }, [ov]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        const res = await axios.get<OverviewRes>(`${API_BASE}/donor/overview`, { withCredentials: true });
        if (!alive) return;
        setOv(res.data);
      } catch (e) {
        console.error(e);
        if (alive) setOv(null);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="h-6 w-52 bg-slate-100 rounded-lg animate-pulse" />
          <div className="mt-3 h-4 w-80 bg-slate-100 rounded-lg animate-pulse" />
        </Card>
        <div className="grid md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
              <div className="mt-3 h-7 w-32 bg-slate-100 rounded animate-pulse" />
            </Card>
          ))}
        </div>
        <Card className="p-6">
          <div className="h-5 w-44 bg-slate-100 rounded animate-pulse" />
          <div className="mt-4 h-20 bg-slate-100 rounded-xl animate-pulse" />
        </Card>
      </div>
    );
  }

  const k = ov?.kpis;
  const donor = ov?.donor;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* ✅ blue like AdminDashboard */}
            <div className="w-12 h-12 rounded-2xl bg-blue-700 text-white flex items-center justify-center font-extrabold">
              {initials(donor?.name)}
            </div>

            <div>
              <div className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                Welcome back{donor?.name ? `, ${donor.name}` : ""}
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
                  <HeartIcon className="h-4 w-4" />
                </span>
              </div>

              <div className="text-sm text-slate-500">
                Track your impact and find high-need campaigns to support.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => nav("/projects")}
              className="px-4 py-2 rounded-2xl bg-blue-700 text-white text-sm font-extrabold hover:bg-blue-800 inline-flex items-center gap-2
                         focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
              Browse Needs
            </button>

            <button
              onClick={() => nav("/donor/mydonations")}
              className="px-4 py-2 rounded-2xl border border-slate-200 bg-white text-sm font-extrabold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2
                         focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
            >
              <ClipboardDocumentListIcon className="h-5 w-5 text-slate-500" />
              My Donations
            </button>
          </div>
        </div>
      </Card>

      {/* KPI cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<BanknotesIcon className="h-5 w-5" />}
          label="Total Donated"
          value={formatLKR(k?.total_donated || 0)}
          hint="Paid donations only"
        />
        <KpiCard
          icon={<ReceiptRefundIcon className="h-5 w-5" />}
          label="Donations"
          value={k?.donations_count ?? 0}
          hint="Successful contributions"
        />
        <KpiCard
          icon={<BuildingOffice2Icon className="h-5 w-5" />}
          label="Schools Supported"
          value={k?.schools_supported ?? 0}
          hint="Unique schools helped"
        />
        <KpiCard
          icon={<CalendarDaysIcon className="h-5 w-5" />}
          label="Last Donation"
          value={<span className="text-lg">{fmtDate(k?.last_donation_at || null)}</span>}
          hint="Most recent paid donation"
        />
      </div>

      {/* Trend + Top Schools */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-extrabold text-slate-900 flex items-center gap-2">
                {/* ✅ blue icon like admin */}
                <ChartBarIcon className="h-5 w-5 text-blue-700" />
                Donation trend
              </div>
              <div className="text-sm text-slate-500">Paid donations (last 30 days)</div>
            </div>

            <button
              onClick={() => nav("/donor/mydonations")}
              className="text-sm font-extrabold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1"
            >
              View all <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4">
            {chartData.length === 0 ? (
              <EmptyBlock
                icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
                title="No trend yet"
                desc="No paid donations in the last 30 days."
              />
            ) : (
              <LineChart data={chartData} />
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="font-extrabold text-slate-900 flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-blue-700" />
              Top schools
            </div>

            <button
              onClick={() => nav("/donor/schools")}
              className="text-sm font-extrabold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1"
            >
              Explore <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {(ov?.top_schools || []).length === 0 ? (
              <div className="text-sm text-slate-500">No supported schools yet.</div>
            ) : (
              ov!.top_schools.map((s) => (
                <div key={s.school_id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 truncate">{s.school_name}</div>
                    <div className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                      <MapPinIcon className="h-4 w-4 text-slate-400" />
                      {s.district || "—"} • {s.province || "—"} • {s.count} donations
                    </div>
                  </div>
                  <div className="font-extrabold text-slate-900">{formatLKR(s.total)}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Recent Donations */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-extrabold text-slate-900 flex items-center gap-2">
              <ClipboardDocumentListIcon className="h-5 w-5 text-blue-700" />
              Recent donations
            </div>
            <div className="text-sm text-slate-500">Your latest paid contributions</div>
          </div>

          <button
            onClick={() => nav("/donor/mydonations")}
            className="text-sm font-extrabold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1"
          >
            View all <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          {(ov?.recent_donations || []).length === 0 ? (
            <div className="p-6">
              <EmptyBlock
                icon={<Squares2X2Icon className="h-6 w-6" />}
                title="No donations yet"
                desc="Start by browsing high-need campaigns."
                action={
                  <button
                    onClick={() => nav("/projects")}
                    className="px-4 py-2 rounded-2xl bg-blue-700 text-white text-sm font-extrabold hover:bg-blue-800 inline-flex items-center gap-2
                               focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                  >
                    <MagnifyingGlassIcon className="h-5 w-5" />
                    Browse needs
                  </button>
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {ov!.recent_donations.map((d) => {
                const reqId = Number(d.request_id || 0);
                const isFund = reqId <= 0;

                return (
                  <div key={d.donation_id} className="p-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 truncate flex items-center gap-2">
                        <span
                          className={cx(
                            "h-8 w-8 rounded-2xl border grid place-items-center",
                            isFund
                              ? "bg-slate-50 border-slate-200 text-slate-700"
                              : "bg-blue-700 border-blue-700 text-white"
                          )}
                        >
                          {isFund ? (
                            <BuildingOffice2Icon className="h-4 w-4" />
                          ) : (
                            <HeartIcon className="h-4 w-4" />
                          )}
                        </span>

                        {isFund ? "Direct School Fund" : d.request_title || `Request #${reqId}`}
                      </div>

                      <div className="text-xs text-slate-500 truncate flex items-center gap-1.5 mt-1">
                        <MapPinIcon className="h-4 w-4 text-slate-400" />
                        {d.school_name || "School"} • {d.district || "—"} • {d.province || "—"}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">{d.time || fmtDate(d.created_at)}</div>
                    </div>

                    <div className="text-right">
                      <div className="font-extrabold text-slate-900">{formatLKR(d.amount)}</div>
                      <div className="text-[11px] text-green-700 font-extrabold">PAID</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default DonorOverview;