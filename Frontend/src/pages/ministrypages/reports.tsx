import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/** ---------------- Config ---------------- */
const API_BASE = "http://localhost:8000/api";

// Laravel routes:
const REPORT_SUMMARY = `${API_BASE}/reports/summary`;
const REPORT_TRENDS = `${API_BASE}/reports/trends`;
const REPORT_TOP_PROVINCES = `${API_BASE}/reports/top-provinces`;
const REPORT_TOP_CAMPAIGNS = `${API_BASE}/reports/top-campaigns`;

/** ---------------- Helpers ---------------- */
const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");
const formatLKR = (n: number) => `LKR ${Number.isFinite(n) ? n.toLocaleString() : "0"}`;
const fmtInt = (n: number) => (Number.isFinite(n) ? n.toLocaleString() : "0");

const toISODate = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const parseISO = (iso: string) => {
  // expects YYYY-MM-DD
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

function downloadText(filename: string, text: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** CSV utils (excel-safe) */
function toCSV(headers: string[], rows: Array<Record<string, any>>) {
  const esc = (v: any) => {
    // Excel-safe: keep dates/strings as-is; escape quotes; wrap when needed
    const s = String(v ?? "");
    const needs = /[",\n]/.test(s);
    const out = s.replace(/"/g, '""');
    return needs ? `"${out}"` : out;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ];
  return lines.join("\n");
}

function section(title: string) {
  return `\n\n# ${title}\n`;
}

/** ✅ Axis labels formatter */
function makeAxisFormatter(labels: string[]) {
  const ds = labels.map(parseISO).filter(Boolean) as Date[];
  if (!ds.length) return (iso: string) => iso;

  const first = ds[0].getTime();
  const last = ds[ds.length - 1].getTime();
  const daySpan = Math.round(Math.abs(last - first) / (1000 * 60 * 60 * 24));

  const longRange = daySpan >= 60 || labels.length >= 60;
  const years = new Set(ds.map((d) => d.getFullYear()));
  const showYear = years.size > 1;

  return (iso: string) => {
    const d = parseISO(iso);
    if (!d) return iso;
    if (longRange) {
      return d.toLocaleDateString(undefined, {
        month: "short",
        ...(showYear ? { year: "2-digit" as const } : {}),
      });
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  };
}

/** ✅ Better tick selection: avoid showing every month label */
function makeTickIndexes(labels: string[]) {
  const ds = labels.map(parseISO).filter(Boolean) as Date[];
  if (!ds.length) return labels.map((_, i) => i);

  const first = ds[0].getTime();
  const last = ds[ds.length - 1].getTime();
  const daySpan = Math.round(Math.abs(last - first) / (1000 * 60 * 60 * 24));
  const longRange = daySpan >= 60 || labels.length >= 60;

  // Short range: show up to 7 evenly spaced labels
  if (!longRange) {
    const tickCount = Math.min(7, labels.length);
    if (labels.length <= tickCount) return labels.map((_, i) => i);
    const step = (labels.length - 1) / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, t) => Math.round(t * step));
  }

  // Long range: pick month changes, then downsample to max 8 labels
  const monthStarts: number[] = [];
  let prevKey = "";
  for (let i = 0; i < ds.length; i++) {
    const d = ds[i];
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key !== prevKey) {
      monthStarts.push(i);
      prevKey = key;
    }
  }

  // Always include first and last
  const all = Array.from(new Set([0, ...monthStarts, labels.length - 1])).sort((a, b) => a - b);

  const maxTicks = 8;
  if (all.length <= maxTicks) return all;

  // Downsample evenly across "all"
  const step = (all.length - 1) / (maxTicks - 1);
  return Array.from({ length: maxTicks }, (_, t) => all[Math.round(t * step)]);
}

/** ---------------- Types ---------------- */
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
  status_breakdown: { status: string; count: number }[];
};

type TrendRow = { day: string; amount: number; count: number };
type TopProvinceRow = { province: string; total: number };
type TopCampaignRow = { request_id: number; request_title: string; total: number; count: number };

/** ---------------- UI Pieces ---------------- */
function Card({
  title,
  value,
  sub,
  icon,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-slate-500 text-xs font-bold tracking-wide uppercase">{title}</div>
            <div className="mt-2 text-slate-900 text-2xl font-extrabold leading-tight">{value}</div>
            {sub ? <div className="mt-2 text-slate-500 text-sm">{sub}</div> : null}
          </div>
          {icon ? (
            <div className="h-11 w-11 rounded-2xl bg-slate-100 grid place-items-center text-xl">{icon}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-900/5 border border-slate-200 px-3 py-1 text-xs font-extrabold text-slate-700">
      {children}
    </span>
  );
}

function Legend({ items }: { items: { label: string; className?: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((it, idx) => (
        <div key={idx} className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-600">
          <span className={cx("h-2.5 w-2.5 rounded-full", it.className ?? "bg-slate-400")} />
          <span>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

/** ✅ SVG chart with axis labels */
function AxisChart({
  labels,
  values,
  height = 180,
  kind,
  valueFormatter,
  xLabelFormatter,
}: {
  labels: string[];
  values: number[];
  height?: number;
  kind: "line" | "bar";
  valueFormatter?: (n: number) => string;
  xLabelFormatter?: (iso: string) => string;
}) {
  const w = 860;
  const h = height;

  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const span = Math.max(1e-9, max - min);

  const padL = 70;
  const padR = 18;
  const padT = 14;
  const padB = 44;

  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const xFor = (i: number) => padL + (i / Math.max(1, values.length - 1)) * innerW;
  const yFor = (v: number) => padT + (1 - (v - min) / span) * innerH;

  const safeVF = valueFormatter ?? ((n) => n.toLocaleString());
  const safeXF = xLabelFormatter ?? ((iso) => iso);

  const tickIdxs = useMemo(() => makeTickIndexes(labels), [labels]);

  const lineD =
    kind === "line"
      ? values.map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)}`).join(" ")
      : "";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-[180px]">
      {[0, 0.5, 1].map((t) => {
        const y = padT + t * innerH;
        return <line key={t} x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(148,163,184,0.22)" />;
      })}

      {[
        { y: padT + innerH, v: min },
        { y: padT + innerH / 2, v: min + span / 2 },
        { y: padT, v: max },
      ].map((r, idx) => (
        <text
          key={idx}
          x={padL - 10}
          y={r.y + 4}
          textAnchor="end"
          fontSize="11"
          fill="rgba(100,116,139,0.95)"
          fontWeight="800"
        >
          {safeVF(Math.round(r.v))}
        </text>
      ))}

      {kind === "line" ? (
        <>
          <path d={lineD} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          {values.map((v, i) => (
            <circle key={i} cx={xFor(i)} cy={yFor(v)} r={3} fill="currentColor" opacity={0.9} />
          ))}
        </>
      ) : (
        values.map((v, i) => {
          const bw = innerW / Math.max(1, values.length);
          const gap = Math.min(10, bw * 0.3);
          const barW = Math.max(2, bw - gap);
          const x = padL + i * bw + gap / 2;
          const y = yFor(v);
          const bh = padT + innerH - y;
          return <rect key={i} x={x} y={y} width={barW} height={Math.max(2, bh)} rx={6} fill="currentColor" opacity={0.85} />;
        })
      )}

      <line x1={padL} y1={padT + innerH} x2={w - padR} y2={padT + innerH} stroke="rgba(148,163,184,0.35)" />

      {tickIdxs.map((i) => (
        <text
          key={i}
          x={xFor(i)}
          y={h - 14}
          textAnchor="middle"
          fontSize="11"
          fill="rgba(100,116,139,0.95)"
          fontWeight="800"
        >
          {safeXF(labels[i])}
        </text>
      ))}
    </svg>
  );
}

/** ---------------- Page ---------------- */
type TabKey = "summary" | "trends" | "top";

export default function MinistryReports() {
  const today = useMemo(() => new Date(), []);
  const defaultTo = useMemo(() => toISODate(today), [today]);
  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toISODate(d);
  }, []);

  const [tab, setTab] = useState<TabKey>("summary");
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [summary, setSummary] = useState<SummaryRes | null>(null);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [topProvinces, setTopProvinces] = useState<TopProvinceRow[]>([]);
  const [topCampaigns, setTopCampaigns] = useState<TopCampaignRow[]>([]);

  const loadAll = async () => {
    setLoading(true);
    setErr(null);
    try {
      const params = { dateFrom, dateTo };

      const [s, t, p, c] = await Promise.all([
        axios.get(REPORT_SUMMARY, { params, withCredentials: true }),
        axios.get(REPORT_TRENDS, { params, withCredentials: true }),
        axios.get(REPORT_TOP_PROVINCES, { params, withCredentials: true }),
        axios.get(REPORT_TOP_CAMPAIGNS, { params, withCredentials: true }),
      ]);

      setSummary(s.data);
      setTrends(Array.isArray(t.data) ? t.data : []);
      setTopProvinces(Array.isArray(p.data) ? p.data : []);
      setTopCampaigns(Array.isArray(c.data) ? c.data : []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const labels = useMemo(() => trends.map((r) => r.day), [trends]);
  const amountSeries = useMemo(() => trends.map((r) => Number(r.amount || 0)), [trends]);
  const countSeries = useMemo(() => trends.map((r) => Number(r.count || 0)), [trends]);

  const amountTotal = useMemo(() => amountSeries.reduce((a, b) => a + b, 0), [amountSeries]);
  const countTotal = useMemo(() => countSeries.reduce((a, b) => a + b, 0), [countSeries]);

  const xFmt = useMemo(() => makeAxisFormatter(labels), [labels]);

  /** ✅ BEST CSV: clean + Excel-friendly + no multi-section “weird blocks”
   *  - exports ONE file but includes 4 sections, each with clear headers
   *  - trend dates stay YYYY-MM-DD (Excel can parse, and you can widen column to avoid #######)
   */
  const exportCSV = () => {
    const now = new Date();
    const stamp = `${toISODate(now)}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

    const rangeFrom = summary?.range?.from ?? dateFrom;
    const rangeTo = summary?.range?.to ?? dateTo;

    const out: string[] = [];

    // META
    out.push("# MINISTRY REPORT");
    out.push(`# Range From,${rangeFrom}`);
    out.push(`# Range To,${rangeTo}`);
    out.push(`# Exported At,${toISODate(now)} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    out.push("");

    // SUMMARY (KPIs)
    out.push(section("SUMMARY KPIs").trim());
    const summaryRows = summary
      ? [
          {
            total_donations: summary.kpis.total_donations,
            paid_count: summary.kpis.paid_count,
            pending_count: summary.kpis.pending_count,
            paid_amount: summary.kpis.paid_amount,
            avg_paid: summary.kpis.avg_paid,
            unique_donors: summary.kpis.unique_donors,
          },
        ]
      : [
          {
            total_donations: 0,
            paid_count: 0,
            pending_count: 0,
            paid_amount: 0,
            avg_paid: 0,
            unique_donors: 0,
          },
        ];

    out.push(
      toCSV(
        ["total_donations", "paid_count", "pending_count", "paid_amount", "avg_paid", "unique_donors"],
        summaryRows
      )
    );

    // STATUS BREAKDOWN
    out.push(section("STATUS BREAKDOWN").trim());
    out.push(
      toCSV(
        ["status", "count"],
        (summary?.status_breakdown ?? []).map((r) => ({
          status: String(r.status ?? ""),
          count: Number(r.count ?? 0),
        }))
      )
    );

    // TRENDS
    out.push(section("DAILY TRENDS (PAID ONLY)").trim());
    out.push(
      toCSV(
        ["day", "amount", "count"],
        trends.map((r) => ({
          day: r.day, // keep YYYY-MM-DD
          amount: Number(r.amount ?? 0),
          count: Number(r.count ?? 0),
        }))
      )
    );

    // TOP PROVINCES
    out.push(section("TOP PROVINCES").trim());
    out.push(
      toCSV(
        ["province", "total"],
        topProvinces.map((r) => ({
          province: r.province || "Unknown",
          total: Number(r.total ?? 0),
        }))
      )
    );

    // TOP CAMPAIGNS
    out.push(section("TOP CAMPAIGNS").trim());
    out.push(
      toCSV(
        ["request_id", "request_title", "total", "count"],
        topCampaigns.map((r) => ({
          request_id: Number(r.request_id),
          request_title: r.request_title || "",
          total: Number(r.total ?? 0),
          count: Number(r.count ?? 0),
        }))
      )
    );

    downloadText(`ministry_report_${rangeFrom}_to_${rangeTo}_${stamp}.csv`, out.join("\n"), "text/csv;charset=utf-8");
  };

  const tabBtn = (key: TabKey, label: string) => (
    <button
      onClick={() => setTab(key)}
      className={cx(
        "rounded-2xl px-4 py-2 text-sm font-extrabold border transition",
        tab === key ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <div className="text-slate-900 text-3xl font-extrabold tracking-tight">Ministry Reports</div>
          <div className="text-slate-500 text-sm mt-1">Generate official donation reports by date range.</div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Pill>
              Range: {dateFrom} → {dateTo}
            </Pill>
            {summary ? (
              <Pill>
                Paid amount: <span className="text-slate-900 ml-1">{formatLKR(Number(summary.kpis.paid_amount || 0))}</span>
              </Pill>
            ) : null}
          </div>
        </div>

        {/* Controls */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 w-full xl:w-[760px]">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="w-full">
              <div className="text-slate-700 text-sm font-extrabold">Date From</div>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 bg-white focus:outline-none"
              />
            </div>

            <div className="w-full">
              <div className="text-slate-700 text-sm font-extrabold">Date To</div>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 bg-white focus:outline-none"
              />
            </div>

            <button
              onClick={loadAll}
              className="rounded-2xl px-4 py-2 text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] whitespace-nowrap"
            >
              Apply
            </button>

            <button
              onClick={exportCSV}
              className="rounded-2xl px-4 py-2 text-sm font-extrabold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.99] whitespace-nowrap"
            >
              Export CSV
            </button>
          </div>

          {err ? <div className="mt-3 text-sm text-rose-600 font-bold">{err}</div> : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {tabBtn("summary", "Summary")}
        {tabBtn("trends", "Trends")}
        {tabBtn("top", "Top Lists")}
      </div>

      {loading ? (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm text-slate-500">
          Loading reports…
        </div>
      ) : (
        <>
          {/* SUMMARY */}
          {tab === "summary" ? (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Card title="Total Donations" value={fmtInt(summary?.kpis.total_donations ?? 0)} icon="🧾" />
                <Card title="Paid Count" value={fmtInt(summary?.kpis.paid_count ?? 0)} icon="✅" />
                <Card title="Pending Count" value={fmtInt(summary?.kpis.pending_count ?? 0)} icon="⏳" />
                <Card title="Unique Donors" value={fmtInt(summary?.kpis.unique_donors ?? 0)} icon="👥" />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100">
                    <div className="text-slate-900 font-extrabold">Paid Amount</div>
                    <div className="text-slate-500 text-sm mt-1">Total paid + average paid donation</div>
                  </div>
                  <div className="p-5">
                    <div className="text-slate-900 text-3xl font-extrabold">{formatLKR(Number(summary?.kpis.paid_amount ?? 0))}</div>
                    <div className="mt-2 text-slate-500 text-sm">
                      Avg paid:{" "}
                      <span className="text-slate-900 font-extrabold">{formatLKR(Number(summary?.kpis.avg_paid ?? 0))}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100">
                    <div className="text-slate-900 font-extrabold">Status Breakdown</div>
                    <div className="text-slate-500 text-sm mt-1">All statuses in selected range</div>
                  </div>
                  <div className="p-5 space-y-3">
                    {(summary?.status_breakdown ?? []).length === 0 ? (
                      <div className="text-slate-500 text-sm">No breakdown.</div>
                    ) : (
                      summary!.status_breakdown.map((r, idx) => (
                        <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
                          <div className="text-slate-900 font-extrabold">{String(r.status || "").toUpperCase()}</div>
                          <div className="text-slate-900 font-extrabold">{fmtInt(Number(r.count || 0))}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* TRENDS */}
          {tab === "trends" ? (
            <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-slate-900 font-extrabold">Donation Amount Trend</div>
                      <div className="text-slate-500 text-sm mt-1">
                        Total: <b className="text-slate-900">{formatLKR(amountTotal)}</b>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-slate-700 bg-slate-900/5 border border-slate-200 rounded-full px-3 py-1">
                      Line
                    </span>
                  </div>
                  <Legend items={[{ label: "Paid Amount (LKR)", className: "bg-indigo-600" }]} />
                </div>

                <div className="p-5 text-indigo-600">
                  {labels.length ? (
                    <AxisChart
                      kind="line"
                      labels={labels}
                      values={amountSeries}
                      xLabelFormatter={xFmt}
                      valueFormatter={(n) => `LKR ${Math.round(n).toLocaleString()}`}
                      height={180}
                    />
                  ) : (
                    <div className="text-slate-500">No trend data.</div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-slate-900 font-extrabold">Donation Count Trend</div>
                      <div className="text-slate-500 text-sm mt-1">
                        Total: <b className="text-slate-900">{fmtInt(countTotal)}</b>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-slate-700 bg-slate-900/5 border border-slate-200 rounded-full px-3 py-1">
                      Bars
                    </span>
                  </div>
                  <Legend items={[{ label: "Paid Donation Count", className: "bg-emerald-600" }]} />
                </div>

                <div className="p-5 text-emerald-600">
                  {labels.length ? (
                    <AxisChart
                      kind="bar"
                      labels={labels}
                      values={countSeries}
                      xLabelFormatter={xFmt}
                      valueFormatter={(n) => `${Math.round(n).toLocaleString()}`}
                      height={180}
                    />
                  ) : (
                    <div className="text-slate-500">No trend data.</div>
                  )}
                </div>
              </div>

              <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <div className="text-slate-900 font-extrabold">Daily Trend Table</div>
                  <div className="text-slate-500 text-sm mt-1">Paid-only daily totals</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-left">
                        <th className="px-5 py-3 font-extrabold text-slate-700">Day</th>
                        <th className="px-5 py-3 font-extrabold text-slate-700">Amount</th>
                        <th className="px-5 py-3 font-extrabold text-slate-700">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trends.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-5 py-8 text-center text-slate-500">
                            No rows.
                          </td>
                        </tr>
                      ) : (
                        trends.map((r) => (
                          <tr key={r.day} className="border-b border-slate-100">
                            <td className="px-5 py-4 text-slate-900 font-extrabold">{r.day}</td>
                            <td className="px-5 py-4 text-slate-900 font-extrabold">{formatLKR(Number(r.amount || 0))}</td>
                            <td className="px-5 py-4 text-slate-700 font-bold">{fmtInt(Number(r.count || 0))}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {/* TOP LISTS */}
          {tab === "top" ? (
            <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <div className="text-slate-900 font-extrabold">Top Provinces</div>
                  <div className="text-slate-500 text-sm mt-1">By paid amount</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-left">
                        <th className="px-5 py-3 font-extrabold text-slate-700">Province</th>
                        <th className="px-5 py-3 font-extrabold text-slate-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProvinces.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-5 py-8 text-center text-slate-500">
                            No provinces.
                          </td>
                        </tr>
                      ) : (
                        topProvinces.map((r, idx) => (
                          <tr key={idx} className="border-b border-slate-100">
                            <td className="px-5 py-4 text-slate-900 font-extrabold">{r.province || "Unknown"}</td>
                            <td className="px-5 py-4 text-slate-900 font-extrabold">{formatLKR(Number(r.total || 0))}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <div className="text-slate-900 font-extrabold">Top Campaigns</div>
                  <div className="text-slate-500 text-sm mt-1">By paid amount</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-left">
                        <th className="px-5 py-3 font-extrabold text-slate-700">Campaign</th>
                        <th className="px-5 py-3 font-extrabold text-slate-700">Total</th>
                        <th className="px-5 py-3 font-extrabold text-slate-700">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCampaigns.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-5 py-8 text-center text-slate-500">
                            No campaigns.
                          </td>
                        </tr>
                      ) : (
                        topCampaigns.map((r) => (
                          <tr key={r.request_id} className="border-b border-slate-100">
                            <td className="px-5 py-4">
                              <div className="text-slate-900 font-extrabold truncate max-w-[340px]">{r.request_title}</div>
                              <div className="text-slate-500 text-xs font-bold">Request #{r.request_id}</div>
                            </td>
                            <td className="px-5 py-4 text-slate-900 font-extrabold">{formatLKR(Number(r.total || 0))}</td>
                            <td className="px-5 py-4 text-slate-700 font-bold">{fmtInt(Number(r.count || 0))}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}