import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
// import "../css/index.css";

const Card: React.FC<{ children: any; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${className}`}>{children}</div>
);

const Pill: React.FC<{ tone?: "green" | "amber" | "blue" | "rose" | "slate"; children: any }> = ({
  tone = "slate",
  children,
}) => {
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

const fmtMoney = (n: number) => `LKR ${Number(n || 0).toLocaleString()}`;
const fmtNum = (n: number) => Number(n || 0).toLocaleString();

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

type SummaryRes = {
  range: { from: string; to: string };
  kpis: {
    total_donations: number;
    paid_count: number;
    pending_count: number;
    paid_amount: number;
    avg_paid: number;
    unique_donors: number;
  };
  status_breakdown: Array<{ status: string; count: number }>;
};

type TrendRow = { day: string; amount: number; count: number };
type ProvinceRow = { province: string; total: number };
type CampaignRow = { request_id: number; request_title: string; total: number; count: number };

const ReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // default last 30 days
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [summary, setSummary] = useState<SummaryRes | null>(null);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [topProvinces, setTopProvinces] = useState<ProvinceRow[]>([]);
  const [topCampaigns, setTopCampaigns] = useState<CampaignRow[]>([]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = { dateFrom, dateTo };

      const [s, t, p, c] = await Promise.all([
        axios.get("http://localhost:8000/api/reports/summary", { params }),
        axios.get("http://localhost:8000/api/reports/trends", { params }),
        axios.get("http://localhost:8000/api/reports/top-provinces", { params }),
        axios.get("http://localhost:8000/api/reports/top-campaigns", { params }),
      ]);

      setSummary(s.data || null);
      setTrends(t.data || []);
      setTopProvinces(p.data || []);
      setTopCampaigns(c.data || []);
    } catch (e) {
      console.error("Reports load error", e);
      setSummary(null);
      setTrends([]);
      setTopProvinces([]);
      setTopCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line
  }, []);

  const statusPills = useMemo(() => {
    const map = new Map<string, number>();
    (summary?.status_breakdown || []).forEach((x) => map.set((x.status || "").toLowerCase(), Number(x.count || 0)));
    return {
      paid: map.get("paid") || 0,
      pending: map.get("pending") || 0,
      failed: map.get("failed") || map.get("canceled") || 0,
    };
  }, [summary]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Reports</h1>
          <p className="text-slate-500 mt-1">Revenue, trends, and breakdowns for your donations.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Pill tone="green">Paid: {fmtNum(statusPills.paid)}</Pill>
          <Pill tone="amber">Pending: {fmtNum(statusPills.pending)}</Pill>
          {statusPills.failed > 0 && <Pill tone="rose">Failed: {fmtNum(statusPills.failed)}</Pill>}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="text-xs font-semibold text-slate-600">Date From</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full mt-1" />
          </div>

          <div className="md:col-span-4">
            <label className="text-xs font-semibold text-slate-600">Date To</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full mt-1" />
          </div>

          <div className="md:col-span-4 flex gap-2">
            <SecondaryButton
              onClick={() => {
                const d = new Date();
                const to = d.toISOString().slice(0, 10);
                d.setDate(d.getDate() - 7);
                setDateFrom(d.toISOString().slice(0, 10));
                setDateTo(to);
              }}
            >
              Last 7 days
            </SecondaryButton>
            <SecondaryButton
              onClick={() => {
                const d = new Date();
                const to = d.toISOString().slice(0, 10);
                d.setDate(d.getDate() - 30);
                setDateFrom(d.toISOString().slice(0, 10));
                setDateTo(to);
              }}
            >
              Last 30 days
            </SecondaryButton>
            <Button onClick={fetchAll}>Refresh</Button>
          </div>

          <div className="md:col-span-12 flex flex-wrap gap-2 pt-2 border-t border-slate-200 mt-2">
            <SecondaryButton
              onClick={() =>
                downloadCSV(
                  "reports_trends.csv",
                  trends.map((x) => ({ day: x.day, amount: x.amount, count: x.count }))
                )
              }
              disabled={!trends.length}
            >
              Export Trends CSV
            </SecondaryButton>

            <SecondaryButton
              onClick={() =>
                downloadCSV(
                  "reports_top_provinces.csv",
                  topProvinces.map((x) => ({ province: x.province, total: x.total }))
                )
              }
              disabled={!topProvinces.length}
            >
              Export Provinces CSV
            </SecondaryButton>

            <SecondaryButton
              onClick={() =>
                downloadCSV(
                  "reports_top_campaigns.csv",
                  topCampaigns.map((x) => ({
                    request_id: x.request_id,
                    request_title: x.request_title,
                    total: x.total,
                    count: x.count,
                  }))
                )
              }
              disabled={!topCampaigns.length}
            >
              Export Campaigns CSV
            </SecondaryButton>
          </div>
        </div>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <Card className="p-5">
          <p className="text-sm text-slate-500 font-medium">Paid Amount</p>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">
            {loading ? "…" : fmtMoney(summary?.kpis.paid_amount || 0)}
          </div>
          <div className="mt-1 text-sm text-slate-500">For selected range</div>
        </Card>

        <Card className="p-5">
          <p className="text-sm text-slate-500 font-medium">Paid Donations</p>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{loading ? "…" : fmtNum(summary?.kpis.paid_count || 0)}</div>
          <div className="mt-1 text-sm text-slate-500">Successful payments</div>
        </Card>

        <Card className="p-5">
          <p className="text-sm text-slate-500 font-medium">Pending Donations</p>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{loading ? "…" : fmtNum(summary?.kpis.pending_count || 0)}</div>
          <div className="mt-1 text-sm text-slate-500">Not completed</div>
        </Card>

        <Card className="p-5">
          <p className="text-sm text-slate-500 font-medium">Avg Paid Amount</p>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{loading ? "…" : fmtMoney(summary?.kpis.avg_paid || 0)}</div>
          <div className="mt-1 text-sm text-slate-500">Paid amount ÷ paid count</div>
        </Card>

        <Card className="p-5">
          <p className="text-sm text-slate-500 font-medium">Unique Donors</p>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{loading ? "…" : fmtNum(summary?.kpis.unique_donors || 0)}</div>
          <div className="mt-1 text-sm text-slate-500">Distinct paid donor emails</div>
        </Card>

        <Card className="p-5">
          <p className="text-sm text-slate-500 font-medium">Total Donations</p>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{loading ? "…" : fmtNum(summary?.kpis.total_donations || 0)}</div>
          <div className="mt-1 text-sm text-slate-500">Paid + pending</div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Trends */}
        <Card className="p-6 lg:col-span-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Paid Amount Trend</h2>
              <p className="text-sm text-slate-500">Daily totals (paid only)</p>
            </div>
            <Pill tone="blue">{trends.length} days</Pill>
          </div>

          {loading ? (
            <div className="text-slate-500 py-8 text-center">Loading…</div>
          ) : trends.length === 0 ? (
            <div className="text-slate-500 py-8 text-center">No trend data for this range.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} stroke="#64748b" />
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
                  formatter={(v: any) => [`LKR ${Number(v).toLocaleString()}`, "Paid Amount"]}
                />
                <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Top provinces */}
        <Card className="p-6 lg:col-span-3">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Top Provinces</h2>
              <p className="text-sm text-slate-500">Paid amount (top 8)</p>
            </div>
            <Pill tone="slate">{topProvinces.length} provinces</Pill>
          </div>

          {loading ? (
            <div className="text-slate-500 py-8 text-center">Loading…</div>
          ) : topProvinces.length === 0 ? (
            <div className="text-slate-500 py-8 text-center">No province data.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProvinces} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                  formatter={(v: any) => [`LKR ${Number(v).toLocaleString()}`, "Paid Amount"]}
                />
                {/* ✅ BLUE bars */}
                <Bar dataKey="total" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Top campaigns table */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Top Campaigns</h2>
            <p className="text-sm text-slate-500">Highest paid totals (top 8)</p>
          </div>
          <Pill tone="slate">{topCampaigns.length} campaigns</Pill>
        </div>

        {loading ? (
          <div className="text-slate-500 py-8 text-center">Loading…</div>
        ) : topCampaigns.length === 0 ? (
          <div className="text-slate-500 py-8 text-center">No campaign data.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-3 pr-3">Campaign</th>
                  <th className="py-3 pr-3">Request ID</th>
                  <th className="py-3 pr-3 text-right">Paid Total</th>
                  <th className="py-3 text-right">Paid Count</th>
                </tr>
              </thead>
              <tbody>
                {topCampaigns.map((c) => (
                  <tr key={c.request_id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="py-3 pr-3">
                      <div className="font-semibold text-slate-900">{c.request_title || "—"}</div>
                    </td>
                    <td className="py-3 pr-3 text-slate-700">{c.request_id}</td>
                    <td className="py-3 pr-3 text-right font-semibold text-slate-900">{fmtMoney(c.total)}</td>
                    <td className="py-3 text-right text-slate-700">{fmtNum(c.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ReportsPage;