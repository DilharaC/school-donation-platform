import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE = "http://localhost:8000/api";
const OVERVIEW = `${API_BASE}/ministry/overview`;

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");
const formatLKR = (n: number) => `LKR ${Number.isFinite(n) ? n.toLocaleString() : "0"}`;
const fmtInt = (n: number) => (Number.isFinite(n) ? n.toLocaleString() : "0");

/** date label like "Feb 12" */
const fmtDayLabel = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
};

type OverviewRes = {
  range: { days: number; from: string; to: string };
  kpis: {
    total_schools: number;
    schools_by_status: { status: string; count: number }[];
    total_donors: number;
    total_campaigns: number;
    approved_campaigns: number;
    pending_campaigns: number;
    total_donations: number;
    paid_count: number;
    pending_count: number;
    paid_amount_total: number;
  };
  trend: { day: string; amount: number; count: number }[];
  recent_donations: {
    donation_id: number;
    amount: number;
    created_at: string;
    time?: string | null;
    donor_name: string | null;
    donor_email: string | null;
    request_id?: number | null;
    request_title?: string | null;
    school_id?: number | null;
    school_name?: string | null;
    province?: string | null;
    district?: string | null;
  }[];
  top_provinces: { province: string; total: number }[];
  top_campaigns: { request_id: number; request_title: string; total: number; count: number }[];
  schools_map: {
    school_id: number;
    school_name: string;
    district: string | null;
    province: string | null;
    latitude: number | null;
    longitude: number | null;
    total_received: number;
    need_score: number;
  }[];
};

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
            <div className="h-11 w-11 rounded-2xl bg-slate-100 grid place-items-center text-xl">
              {icon}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Pagination */
function Pager({
  page,
  total,
  limit,
  onChange,
}: {
  page: number;
  total: number;
  limit: number;
  onChange: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const canPrev = page > 1;
  const canNext = page < pages;

  const jump = (p: number) => onChange(Math.min(Math.max(1, p), pages));

  const numbers = useMemo(() => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);

    const out: Array<number | "dots"> = [];
    const left = Math.max(2, page - 1);
    const right = Math.min(pages - 1, page + 1);

    out.push(1);
    if (left > 2) out.push("dots");
    for (let i = left; i <= right; i++) out.push(i);
    if (right < pages - 1) out.push("dots");
    out.push(pages);
    return out;
  }, [pages, page]);

  const btnBase =
    "rounded-xl border px-3 py-2 text-xs font-extrabold transition active:scale-[0.99]";
  const btnOn = "bg-white border-slate-200 text-slate-700 hover:bg-slate-50";
  const btnOff = "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed";
  const btnActive = "bg-slate-900 text-white border-slate-900";

  return (
    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="text-xs font-bold text-slate-500">
        Page <span className="text-slate-900">{page}</span> of{" "}
        <span className="text-slate-900">{pages}</span> · {fmtInt(total)} items
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => jump(1)} disabled={!canPrev} className={cx(btnBase, canPrev ? btnOn : btnOff)}>
          First
        </button>
        <button onClick={() => jump(page - 1)} disabled={!canPrev} className={cx(btnBase, canPrev ? btnOn : btnOff)}>
          Prev
        </button>

        <div className="flex items-center gap-2">
          {numbers.map((n, idx) =>
            n === "dots" ? (
              <span key={`d-${idx}`} className="px-2 text-slate-400 font-extrabold">
                …
              </span>
            ) : (
              <button
                key={n}
                onClick={() => jump(n)}
                className={cx(btnBase, n === page ? btnActive : btnOn)}
                aria-current={n === page ? "page" : undefined}
              >
                {n}
              </button>
            )
          )}
        </div>

        <button onClick={() => jump(page + 1)} disabled={!canNext} className={cx(btnBase, canNext ? btnOn : btnOff)}>
          Next
        </button>
        <button onClick={() => jump(pages)} disabled={!canNext} className={cx(btnBase, canNext ? btnOn : btnOff)}>
          Last
        </button>
      </div>
    </div>
  );
}

function paginate<T>(arr: T[], page: number, limit: number) {
  const start = (page - 1) * limit;
  return arr.slice(start, start + limit);
}

/** ✅ Chart with axis labels */
function AxisChart({
  labels,
  values,
  height = 160,
  kind,
  valueFormatter,
}: {
  labels: string[];
  values: number[];
  height?: number;
  kind: "line" | "bar";
  valueFormatter?: (n: number) => string;
}) {
  const w = 700;
  const h = height;

  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const span = Math.max(1e-9, max - min);

  const padL = 52;
  const padR = 14;
  const padT = 12;
  const padB = 36;

  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const xFor = (i: number) => padL + (i / Math.max(1, values.length - 1)) * innerW;
  const yFor = (v: number) => padT + (1 - (v - min) / span) * innerH;

  const safeFmt = valueFormatter ?? ((n) => n.toLocaleString());

  // show ~6 x-axis ticks
  const tickCount = Math.min(6, labels.length);
  const tickIdxs = useMemo(() => {
    if (labels.length <= tickCount) return labels.map((_, i) => i);
    const step = (labels.length - 1) / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, t) => Math.round(t * step));
  }, [labels, tickCount]);

  const lineD =
    kind === "line"
      ? values
          .map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)}`)
          .join(" ")
      : "";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[160px]">
      {/* grid lines */}
      {[0, 0.5, 1].map((t) => {
        const y = padT + t * innerH;
        return <line key={t} x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(148,163,184,0.25)" />;
      })}

      {/* y labels (min/mid/max) */}
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
          fill="rgba(100,116,139,0.9)"
          fontWeight="700"
        >
          {safeFmt(Math.round(r.v))}
        </text>
      ))}

      {/* plot */}
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
          const gap = Math.min(8, bw * 0.25);
          const barW = Math.max(2, bw - gap);
          const x = padL + i * bw + gap / 2;
          const y = yFor(v);
          const bh = padT + innerH - y;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={Math.max(2, bh)}
              rx={6}
              fill="currentColor"
              opacity={0.85}
            />
          );
        })
      )}

      {/* x axis */}
      <line x1={padL} y1={padT + innerH} x2={w - padR} y2={padT + innerH} stroke="rgba(148,163,184,0.35)" />

      {/* x labels */}
      {tickIdxs.map((i) => (
        <text
          key={i}
          x={xFor(i)}
          y={h - 12}
          textAnchor="middle"
          fontSize="11"
          fill="rgba(100,116,139,0.9)"
          fontWeight="700"
        >
          {fmtDayLabel(labels[i])}
        </text>
      ))}
    </svg>
  );
}

/** ---- Map helpers ---- */
function needLevel(score: number) {
  if (score >= 70) return { label: "High (70+)", color: "#ef4444" };
  if (score >= 40) return { label: "Medium (40–69)", color: "#f97316" };
  if (score >= 10) return { label: "Low (10–39)", color: "#eab308" };
  return { label: "Very Low (<10)", color: "#22c55e" };
}

function FitToMarkers({ points }: { points: Array<[number, number]> }) {
  const map = useMap();

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);

    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)));
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => clearTimeout(t);
  }, [points, map]);

  return null;
}

export default function MinistryAnalytics() {
  const LIMIT = 5;

  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<OverviewRes | null>(null);

  const [provPage, setProvPage] = useState(1);
  const [campPage, setCampPage] = useState(1);
  const [recentPage, setRecentPage] = useState(1);
  const [schoolPage, setSchoolPage] = useState(1);

  const resetPages = () => {
    setProvPage(1);
    setCampPage(1);
    setRecentPage(1);
    setSchoolPage(1);
  };

  const fetchOverview = async (d: number) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await axios.get(OVERVIEW, { params: { days: d }, withCredentials: true });
      setData(res.data);
      resetPages();
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusPills = useMemo(() => (data?.kpis?.schools_by_status || []).slice(0, 6), [data]);

  const topProvAll = useMemo(() => data?.top_provinces ?? [], [data]);
  const topCampAll = useMemo(() => data?.top_campaigns ?? [], [data]);
  const recentAll = useMemo(() => data?.recent_donations ?? [], [data]);
  const schoolsAll = useMemo(() => data?.schools_map ?? [], [data]);

  const topProv = useMemo(() => paginate(topProvAll, provPage, LIMIT), [topProvAll, provPage]);
  const topCamp = useMemo(() => paginate(topCampAll, campPage, LIMIT), [topCampAll, campPage]);
  const recent = useMemo(() => paginate(recentAll, recentPage, LIMIT), [recentAll, recentPage]);
  const schools = useMemo(() => paginate(schoolsAll, schoolPage, LIMIT), [schoolsAll, schoolPage]);

  const trend = useMemo(() => data?.trend ?? [], [data]);
  const trendLast = useMemo(() => {
    const N = Math.min(30, trend.length);
    return trend.slice(Math.max(0, trend.length - N));
  }, [trend]);

  const trendLabels = useMemo(() => trendLast.map((t) => t.day), [trendLast]);
  const amountSeries = useMemo(() => trendLast.map((t) => Number(t.amount || 0)), [trendLast]);
  const countSeries = useMemo(() => trendLast.map((t) => Number(t.count || 0)), [trendLast]);

  const amountTotalInChart = useMemo(() => amountSeries.reduce((a, b) => a + b, 0), [amountSeries]);
  const countTotalInChart = useMemo(() => countSeries.reduce((a, b) => a + b, 0), [countSeries]);

  const mapPoints = useMemo(
    () =>
      schoolsAll
        .filter((s) => s.latitude && s.longitude)
        .map((s) => [Number(s.latitude), Number(s.longitude)] as [number, number]),
    [schoolsAll]
  );

  const markersCount = useMemo(
    () => schoolsAll.filter((s) => !!s.latitude && !!s.longitude).length,
    [schoolsAll]
  );

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="text-slate-900 text-3xl font-extrabold tracking-tight">Ministry Analytics</div>
          <div className="text-slate-500 text-sm mt-1">System-wide monitoring (donations, campaigns, schools, donors).</div>

          {data?.range ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                Range: {data.range.from} → {data.range.to} ({data.range.days} days)
              </span>

              {statusPills.map((s, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-full bg-slate-900/5 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700"
                >
                  {s.status}: {fmtInt(Number(s.count || 0))}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 w-full lg:w-[420px]">
          <div className="text-slate-700 text-sm font-extrabold">Filters</div>
          <div className="mt-3 flex gap-2">
            <select
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 bg-white focus:outline-none"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 180 days</option>
              <option value={365}>Last 365 days</option>
            </select>

            <button
              onClick={() => fetchOverview(days)}
              className="rounded-2xl px-4 py-2 text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99]"
            >
              Apply
            </button>
          </div>

          {err ? <div className="mt-3 text-sm text-rose-600 font-bold">{err}</div> : null}
        </div>
      </div>

      {loading ? (
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm text-slate-500">
          Loading analytics…
        </div>
      ) : !data ? (
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm text-slate-500">
          No data.
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card title="Total Schools" value={fmtInt(data.kpis.total_schools)} icon="🏫" />
            <Card title="Total Donors" value={fmtInt(data.kpis.total_donors)} icon="👥" />
            <Card
              title="Campaigns"
              value={fmtInt(data.kpis.total_campaigns)}
              sub={
                <span>
                  Approved: <b className="text-slate-900">{fmtInt(data.kpis.approved_campaigns)}</b> · Pending:{" "}
                  <b className="text-slate-900">{fmtInt(data.kpis.pending_campaigns)}</b>
                </span>
              }
              icon="📣"
            />
            <Card
              title="Paid Donations"
              value={fmtInt(data.kpis.paid_count)}
              sub={
                <span>
                  Paid amount: <b className="text-slate-900">{formatLKR(data.kpis.paid_amount_total)}</b> · Pending:{" "}
                  <b className="text-slate-900">{fmtInt(data.kpis.pending_count)}</b>
                </span>
              }
              icon="💰"
            />
          </div>

          {/* Charts (with dates on x-axis) */}
          <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
                <div>
                  <div className="text-slate-900 font-extrabold">Donation Amount Trend</div>
                  <div className="text-slate-500 text-sm mt-1">
                    Last {trendLabels.length} days · Total: <b className="text-slate-900">{formatLKR(amountTotalInChart)}</b>
                  </div>
                </div>
                <div className="text-xs font-extrabold text-slate-700 bg-slate-900/5 border border-slate-200 rounded-full px-3 py-1">
                  Line
                </div>
              </div>
              <div className="p-5 text-indigo-600">
                {amountSeries.length ? (
                  <AxisChart
                    kind="line"
                    labels={trendLabels}
                    values={amountSeries}
                    valueFormatter={(n) => `LKR ${Math.round(n).toLocaleString()}`}
                  />
                ) : (
                  <div className="text-slate-500">No trend data.</div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
                <div>
                  <div className="text-slate-900 font-extrabold">Donation Count Trend</div>
                  <div className="text-slate-500 text-sm mt-1">
                    Last {trendLabels.length} days · Total: <b className="text-slate-900">{fmtInt(countTotalInChart)}</b>
                  </div>
                </div>
                <div className="text-xs font-extrabold text-slate-700 bg-slate-900/5 border border-slate-200 rounded-full px-3 py-1">
                  Bars
                </div>
              </div>
              <div className="p-5 text-emerald-600">
                {countSeries.length ? (
                  <AxisChart kind="bar" labels={trendLabels} values={countSeries} valueFormatter={(n) => `${Math.round(n)}`} />
                ) : (
                  <div className="text-slate-500">No trend data.</div>
                )}
              </div>
            </div>
          </div>

          {/* Sri Lanka Map (Legend fixed) */}
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
              <div>
                <div className="text-slate-900 font-extrabold">Schools Benefited Map (Sri Lanka)</div>
                <div className="text-slate-500 text-sm mt-1">Click markers to view school details.</div>
              </div>
              <div className="shrink-0 inline-flex items-center rounded-full bg-slate-900/5 border border-slate-200 px-3 py-1 text-xs font-extrabold text-slate-700">
                Markers: {markersCount}
              </div>
            </div>

            <div className="p-5">
              {/* ✅ MUST be relative so legend absolute works */}
              <div className="relative rounded-3xl overflow-hidden border border-slate-200">
                <div className="h-[420px] w-full">
                  <MapContainer center={[7.8731, 80.7718]} zoom={7} scrollWheelZoom={true} className="h-full w-full">
                    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <FitToMarkers points={mapPoints} />

                    {schoolsAll
                      .filter((s) => s.latitude && s.longitude)
                      .map((s) => {
                        const score = Number(s.need_score || 0);
                        const lvl = needLevel(score);

                        return (
                          <CircleMarker
                            key={s.school_id}
                            center={[Number(s.latitude), Number(s.longitude)]}
                            radius={8}
                            pathOptions={{ color: lvl.color, fillColor: lvl.color, fillOpacity: 0.9 }}
                          >
                            <Popup>
                              <div className="min-w-[220px]">
                                <div className="font-extrabold text-slate-900">{s.school_name}</div>
                                <div className="text-slate-600 text-sm mt-1">
                                  {s.province || "-"} · {s.district || "-"}
                                </div>
                                <div className="mt-2 text-sm">
                                  <div>
                                    <span className="font-bold">Need score:</span> {score.toFixed(0)} ({lvl.label})
                                  </div>
                                  <div>
                                    <span className="font-bold">Total received:</span> {formatLKR(Number(s.total_received || 0))}
                                  </div>
                                  <div className="text-slate-500 mt-1 text-xs font-bold">ID #{s.school_id}</div>
                                </div>
                              </div>
                            </Popup>
                          </CircleMarker>
                        );
                      })}
                  </MapContainer>
                </div>

                {/* ✅ Legend (z-index high so it appears over map) */}
                <div className="absolute left-4 bottom-4 z-[1000] rounded-2xl bg-white/95 border border-slate-200 p-4 shadow-sm">
                  <div className="text-slate-900 font-extrabold text-sm">Need Level</div>
                  <div className="mt-2 space-y-2 text-sm text-slate-700 font-bold">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: "#ef4444" }} />
                      High (70+)
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: "#f97316" }} />
                      Medium (40–69)
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: "#eab308" }} />
                      Low (10–39)
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: "#22c55e" }} />
                      Very Low (&lt;10)
                    </div>
                  </div>
                </div>
              </div>

              {markersCount === 0 ? (
                <div className="mt-3 text-sm text-slate-500 font-bold">
                  No schools have latitude/longitude yet. Add coordinates to schools table to show markers.
                </div>
              ) : null}
            </div>
          </div>

          {/* Top Provinces */}
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="text-slate-900 font-extrabold">Top Provinces</div>
              <div className="text-slate-500 text-sm mt-1">Paid amount (5 per page)</div>
            </div>

            <div className="p-5 space-y-3">
              {topProv.length === 0 ? (
                <div className="text-slate-500 text-sm">No provinces.</div>
              ) : (
                topProv.map((p, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
                    <div className="text-slate-900 font-extrabold">{p.province || "Unknown"}</div>
                    <div className="text-slate-900 font-extrabold">{formatLKR(Number(p.total || 0))}</div>
                  </div>
                ))
              )}

              <Pager page={provPage} total={topProvAll.length} limit={LIMIT} onChange={setProvPage} />
            </div>
          </div>

          {/* Top Campaigns + Recent Donations */}
          <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Top Campaigns */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <div className="text-slate-900 font-extrabold">Top Campaigns</div>
                <div className="text-slate-500 text-sm mt-1">By paid amount (5 per page)</div>
              </div>

              <div className="p-5 space-y-3">
                {topCamp.length === 0 ? (
                  <div className="text-slate-500 text-sm">No campaigns.</div>
                ) : (
                  topCamp.map((c) => (
                    <div key={c.request_id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-slate-900 font-extrabold truncate">{c.request_title}</div>
                          <div className="text-slate-500 text-sm">Request #{c.request_id}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-slate-900 font-extrabold">{formatLKR(Number(c.total || 0))}</div>
                          <div className="text-slate-500 text-sm">{fmtInt(Number(c.count || 0))} donations</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <Pager page={campPage} total={topCampAll.length} limit={LIMIT} onChange={setCampPage} />
              </div>
            </div>

            {/* Recent Donations */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <div className="text-slate-900 font-extrabold">Recent Donations (Paid)</div>
                <div className="text-slate-500 text-sm mt-1">Includes campaign + direct fund (5 per page)</div>
              </div>

              <div className="p-5 space-y-3">
                {recent.length === 0 ? (
                  <div className="text-slate-500 text-sm">No donations.</div>
                ) : (
                  recent.map((d) => {
                    const school = d.school_name || "Unknown School";
                    const title = d.request_title ? `Campaign: ${d.request_title}` : `Direct fund`;
                    return (
                      <div key={d.donation_id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-slate-900 font-extrabold truncate">
                              {d.donor_name || "Anonymous"} <span className="text-slate-400 font-bold">·</span>{" "}
                              <span className="text-slate-500 font-bold">{d.donor_email || "-"}</span>
                            </div>
                            <div className="text-slate-500 text-sm mt-1">
                              {school} · {d.province || "-"} · {d.district || "-"}
                            </div>
                            <div className="text-slate-700 text-sm mt-2">
                              <span className="font-bold">{title}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-extrabold text-emerald-700">
                              paid
                            </div>
                            <div className="mt-2 inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-extrabold text-indigo-700">
                              {formatLKR(Number(d.amount || 0))}
                            </div>
                            <div className="mt-2 text-xs text-slate-500 font-bold">{d.time || ""}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <Pager page={recentPage} total={recentAll.length} limit={LIMIT} onChange={setRecentPage} />
              </div>
            </div>
          </div>

          {/* Schools table */}
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="text-slate-900 font-extrabold">Schools (Top Received)</div>
              <div className="text-slate-500 text-sm mt-1">Paginated, 5 per page</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left">
                    <th className="px-5 py-3 font-extrabold text-slate-700">School</th>
                    <th className="px-5 py-3 font-extrabold text-slate-700">Province</th>
                    <th className="px-5 py-3 font-extrabold text-slate-700">District</th>
                    <th className="px-5 py-3 font-extrabold text-slate-700">Need score</th>
                    <th className="px-5 py-3 font-extrabold text-slate-700">Total received</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((s) => (
                    <tr key={s.school_id} className="border-b border-slate-100">
                      <td className="px-5 py-4">
                        <div className="text-slate-900 font-extrabold">{s.school_name}</div>
                        <div className="text-slate-500 text-xs font-bold">ID #{s.school_id}</div>
                      </td>
                      <td className="px-5 py-4 text-slate-700 font-bold">{s.province || "-"}</td>
                      <td className="px-5 py-4 text-slate-700 font-bold">{s.district || "-"}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-full bg-slate-900/5 border border-slate-200 px-3 py-1 text-xs font-extrabold text-slate-700">
                          {Number(s.need_score || 0).toFixed(0)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-900 font-extrabold">
                        {formatLKR(Number(s.total_received || 0))}
                      </td>
                    </tr>
                  ))}

                  {schools.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                        No schools.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="px-5 pb-5">
              <Pager page={schoolPage} total={schoolsAll.length} limit={LIMIT} onChange={setSchoolPage} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}