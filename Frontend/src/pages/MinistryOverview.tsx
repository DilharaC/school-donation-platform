// src/pages/ministry/MinistryOverview.tsx
import  { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const API_BASE = "http://localhost:8000/api";
const OVERVIEW_ENDPOINT = `${API_BASE}/ministry/overview`;

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");
const formatLKR = (n: number) => `LKR ${Number.isFinite(n) ? n.toLocaleString() : "0"}`;

type StatusRow = { status: string; count: number };

type TrendRow = {
  day: string;     // YYYY-MM-DD
  amount: number;  // paid sum
  count: number;   // paid count
};

type RecentDonation = {
  donation_id: number;
  amount: number;
  created_at: string;
  time?: string | null;

  donor_name?: string | null;
  donor_email?: string | null;

  request_id?: number | null;
  request_title?: string | null;

  school_id?: number | null;
  school_name?: string | null;
  province?: string | null;
  district?: string | null;
};

type TopProvince = { province: string; total: number };
type TopCampaign = { request_id: number; request_title: string; total: number; count: number };

type SchoolMapRow = {
  school_id: number;
  school_name: string;
  district?: string | null;
  province?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  total_received: number;
  need_score: number;
};

type OverviewRes = {
  range: { days: number; from: string; to: string };
  kpis: {
    total_schools: number;
    schools_by_status: StatusRow[];
    total_donors: number;

    total_campaigns: number;
    approved_campaigns: number;
    pending_campaigns: number;

    total_donations: number;
    paid_count: number;
    pending_count: number;
    paid_amount_total: number;
  };
  trend: TrendRow[];
  recent_donations: RecentDonation[];
  top_provinces: TopProvince[];
  top_campaigns: TopCampaign[];
  schools_map: SchoolMapRow[];
};

function MiniPill({ text, tone = "slate" }: { text: string; tone?: "slate" | "blue" | "amber" | "emerald" }) {
  const styles =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : tone === "amber"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : "bg-slate-50 text-slate-700 border-slate-200";

  return <span className={cx("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold", styles)}>{text}</span>;
}

function NiceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as TrendRow;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-lg px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-extrabold text-slate-900">{formatLKR(Math.round(p.amount || 0))}</div>
      <div className="text-xs text-slate-500 mt-1">Donations: <span className="font-bold text-slate-700">{p.count || 0}</span></div>
    </div>
  );
}

export default function MinistryOverview() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewRes | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await axios.get<OverviewRes>(OVERVIEW_ENDPOINT, { params: { days } });
      setData(res.data);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const k = data?.kpis;

  const statusLabel = (s: string) => {
    const v = (s || "").toLowerCase();
    if (v === "active") return "Active";
    if (v === "inactive") return "Inactive";
    return v ? v.charAt(0).toUpperCase() + v.slice(1) : "Unknown";
  };

  const chartData = useMemo(() => {
    const t = data?.trend || [];
    // keep all days for chart, but format x-axis label
    return t.map((r) => ({
      ...r,
      x: r.day.slice(5), // MM-DD (clean)
    }));
  }, [data]);

  const totalInRange = useMemo(() => {
    const t = data?.trend || [];
    return t.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }, [data]);

  const bestDay = useMemo(() => {
    const t = data?.trend || [];
    if (!t.length) return null;
    return t.reduce((best, cur) => (cur.amount > (best?.amount ?? -1) ? cur : best), t[0]);
  }, [data]);

  if (loading) return <div className="text-slate-500 py-10">Loading ministry overview…</div>;

  if (err) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <div className="font-extrabold text-rose-800">Error</div>
        <div className="text-rose-700 text-sm mt-1">{err}</div>
        <button onClick={load} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
          Retry
        </button>
      </div>
    );
  }

  if (!data || !k) return null;

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-slate-900 font-extrabold text-2xl">Ministry Overview</div>
          <div className="text-slate-500 text-sm">
            Showing last <span className="font-semibold">{data.range.days} days</span> ({data.range.from} → {data.range.to})
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 180 days</option>
            <option value={365}>Last 365 days</option>
          </select>

          <button
            onClick={load}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-slate-500 text-xs font-bold">TOTAL SCHOOLS</div>
          <div className="text-slate-900 text-3xl font-extrabold mt-2">{k.total_schools}</div>
          <div className="mt-3 space-y-2">
            {(k.schools_by_status || []).slice(0, 3).map((r, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{statusLabel(r.status)}</span>
                <span className="font-bold text-slate-900">{r.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-slate-500 text-xs font-bold">DONATIONS (PAID)</div>
          <div className="text-slate-900 text-3xl font-extrabold mt-2">{k.paid_count}</div>
          <div className="text-slate-600 text-sm mt-2">Total paid amount</div>
          <div className="text-blue-700 font-extrabold text-xl">{formatLKR(Math.round(k.paid_amount_total))}</div>
          <div className="text-slate-500 text-xs mt-2">Pending: {k.pending_count}</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-slate-500 text-xs font-bold">CAMPAIGNS</div>
          <div className="text-slate-900 text-3xl font-extrabold mt-2">{k.total_campaigns}</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
              <div className="text-emerald-700 text-xs font-bold">Approved</div>
              <div className="text-slate-900 text-xl font-extrabold">{k.approved_campaigns}</div>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3">
              <div className="text-amber-700 text-xs font-bold">Pending</div>
              <div className="text-slate-900 text-xl font-extrabold">{k.pending_campaigns}</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-slate-500 text-xs font-bold">DONORS</div>
          <div className="text-slate-900 text-3xl font-extrabold mt-2">{k.total_donors}</div>
          <div className="text-slate-500 text-xs mt-3">
            Total donations (all statuses): <span className="font-bold text-slate-700">{k.total_donations}</span>
          </div>
        </div>
      </div>

      {/* Trend chart + Top provinces */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Trend Chart */}
        <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <div className="text-slate-900 font-extrabold">Paid Donations Trend</div>
              <div className="text-slate-500 text-sm">Daily totals (last {days} days)</div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <MiniPill tone="blue" text={`Total: ${formatLKR(Math.round(totalInRange))}`} />
                {bestDay ? (
                  <MiniPill tone="emerald" text={`Best day: ${bestDay.day} • ${formatLKR(Math.round(bestDay.amount))}`} />
                ) : null}
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Tip: hover the chart to see values
            </div>
          </div>

          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 18, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="4 4" />
                <XAxis dataKey="x" tickMargin={8} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={40} />
                <Tooltip content={<NiceTooltip />} labelFormatter={(label) => {
                  // label comes from x (MM-DD), show full date by finding matching entry
                  const found = chartData.find((d) => d.x === label);
                  return found?.day || label;
                }} />
                {/* Friendly blue theme (NOT black) */}
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#2563eb"      // blue-600
                  fill="#93c5fd"        // blue-300
                  fillOpacity={0.55}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Provinces */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-slate-900 font-extrabold">Top Provinces</div>
          <div className="text-slate-500 text-sm">By paid amount</div>

          <div className="mt-4 space-y-3">
            {(data.top_provinces || []).length === 0 ? (
              <div className="text-slate-500 text-sm">No data</div>
            ) : (
              data.top_provinces.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="text-sm text-slate-700">{p.province}</div>
                  <div className="text-sm font-extrabold text-blue-700">{formatLKR(Math.round(p.total))}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent donations + Top campaigns */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent donations */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-slate-900 font-extrabold">Recent Donations</div>
          <div className="text-slate-500 text-sm">Paid donations</div>

          <div className="mt-4 space-y-3">
            {(data.recent_donations || []).map((d) => (
              <div key={d.donation_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-slate-900 font-extrabold">{d.school_name || "Unknown School"}</div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      {d.province || "—"} • {d.district || "—"}
                      {d.request_title ? ` • ${d.request_title}` : " • School Fund"}
                    </div>
                    <div className="text-slate-500 text-xs mt-1">
                      {d.donor_name || "Anonymous"} {d.time ? `• ${d.time}` : ""}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-blue-700 font-extrabold">{formatLKR(Math.round(d.amount))}</div>
                    <div className="text-slate-500 text-xs">#{d.donation_id}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top campaigns */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-slate-900 font-extrabold">Top Campaigns</div>
          <div className="text-slate-500 text-sm">By paid amount (last {days} days)</div>

          <div className="mt-4 space-y-3">
            {(data.top_campaigns || []).length === 0 ? (
              <div className="text-slate-500 text-sm">No data</div>
            ) : (
              data.top_campaigns.map((c) => (
                <div key={c.request_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-slate-900 font-extrabold">{c.request_title}</div>
                      <div className="text-slate-500 text-xs mt-1">
                        Donations: <span className="font-bold text-slate-700">{c.count}</span> • Request #{c.request_id}
                      </div>
                    </div>
                    <div className="text-blue-700 font-extrabold">{formatLKR(Math.round(c.total))}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Schools monitoring table */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-slate-900 font-extrabold">Schools Monitoring</div>
            <div className="text-slate-500 text-sm">Top funded schools (fund_balance + need_score)</div>
          </div>
          <MiniPill tone="slate" text={`Showing top 10`} />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-3">School</th>
                <th className="py-2 pr-3">Province</th>
                <th className="py-2 pr-3">District</th>
                <th className="py-2 pr-3 text-right">Need Score</th>
                <th className="py-2 pr-3 text-right">Total Received</th>
              </tr>
            </thead>
            <tbody>
              {(data.schools_map || []).slice(0, 10).map((s) => (
                <tr key={s.school_id} className="border-t border-slate-200">
                  <td className="py-3 pr-3 font-bold text-slate-900">{s.school_name}</td>
                  <td className="py-3 pr-3 text-slate-700">{s.province || "—"}</td>
                  <td className="py-3 pr-3 text-slate-700">{s.district || "—"}</td>
                  <td className="py-3 pr-3 text-right text-slate-900 font-bold">{Number(s.need_score || 0).toFixed(1)}</td>
                  <td className="py-3 pr-3 text-right text-blue-700 font-extrabold">{formatLKR(Math.round(s.total_received || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-slate-400 mt-3">
          You can link each row to a “School details (view-only)” page later.
        </div>
      </div>
    </div>
  );
}