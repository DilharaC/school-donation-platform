import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8000/api";

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

type ProjectCard = {
  request_id: number;
  school_id: number;
  school_name: string;
  need_score: number;
  request_title: string;
  category: string;
  estimated_price: number;
  amount_raised: number;
  image_url?: string | null;
  status: string;
};

type ProjectsRes = {
  projects: ProjectCard[];
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

  const d = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  const last = data[data.length - 1]?.y ?? 0;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[90px]">
        {/* grid line */}
        <line x1="0" y1={h - pad} x2={w} y2={h - pad} stroke="currentColor" strokeOpacity="0.08" />
        <path d={d} fill="none" stroke="currentColor" strokeOpacity="0.9" strokeWidth="2" />
        {points.length > 0 && (
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3.5" fill="currentColor" />
        )}
      </svg>
      <div className="mt-1 text-xs text-slate-500">
        Last 30 days total: <span className="font-semibold text-slate-700">{formatLKR(last)}</span>
      </div>
    </div>
  );
}

const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cx("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>{children}</div>
);

const DonorOverview: React.FC = () => {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [ov, setOv] = useState<OverviewRes | null>(null);

  const [recLoading, setRecLoading] = useState(true);
  const [recommended, setRecommended] = useState<ProjectCard[]>([]);

  const chartData = useMemo(() => {
    const t = ov?.trend_30d || [];
    return t.map((p) => ({
      xLabel: p.day,
      y: Number(p.total || 0),
    }));
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

    const loadRecommended = async () => {
      try {
        setRecLoading(true);
        const res = await axios.get<ProjectsRes>(`${API_BASE}/donation_requests`, {
          withCredentials: true,
          params: {
            status: "Approved",
            sortBy: "need_high",
            needBand: "all",
            page: 1,
            limit: 6,
          },
        });
        if (!alive) return;
        setRecommended(res.data.projects || []);
      } catch (e) {
        console.error(e);
        if (alive) setRecommended([]);
      } finally {
        if (alive) setRecLoading(false);
      }
    };

    load();
    loadRecommended();

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
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-extrabold">
              {initials(donor?.name)}
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900">
                Welcome back{donor?.name ? `, ${donor.name}` : ""} 👋
              </div>
              <div className="text-sm text-slate-500">
                Track your impact and find high-need campaigns to support.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => nav("/donor/projects")}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
            >
              Browse Needs
            </button>
            <button
              onClick={() => nav("/donor/donations")}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              My Donations
            </button>
          </div>
        </div>
      </Card>

      {/* KPI cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="text-xs text-slate-500">Total Donated</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{formatLKR(k?.total_donated || 0)}</div>
          <div className="mt-1 text-xs text-slate-500">Paid donations only</div>
        </Card>

        <Card className="p-5">
          <div className="text-xs text-slate-500">Donations</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{k?.donations_count ?? 0}</div>
          <div className="mt-1 text-xs text-slate-500">Successful contributions</div>
        </Card>

        <Card className="p-5">
          <div className="text-xs text-slate-500">Schools Supported</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{k?.schools_supported ?? 0}</div>
          <div className="mt-1 text-xs text-slate-500">Unique schools helped</div>
        </Card>

        <Card className="p-5">
          <div className="text-xs text-slate-500">Last Donation</div>
          <div className="mt-2 text-lg font-extrabold text-slate-900">{fmtDate(k?.last_donation_at || null)}</div>
          <div className="mt-1 text-xs text-slate-500">Most recent paid donation</div>
        </Card>
      </div>

      {/* Trend + Top Schools */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-extrabold text-slate-900">Donation trend</div>
              <div className="text-sm text-slate-500">Paid donations (last 30 days)</div>
            </div>
            <button
              onClick={() => nav("/donor/donations")}
              className="text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              View all →
            </button>
          </div>

          <div className="mt-4 text-slate-900">
            {chartData.length === 0 ? (
              <div className="text-sm text-slate-500">No donations yet in last 30 days.</div>
            ) : (
              <LineChart data={chartData} />
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="font-extrabold text-slate-900">Top schools</div>
            <button
              onClick={() => nav("/donor/schools")}
              className="text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              Explore →
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {(ov?.top_schools || []).length === 0 ? (
              <div className="text-sm text-slate-500">No supported schools yet.</div>
            ) : (
              ov!.top_schools.map((s) => (
                <div key={s.school_id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{s.school_name}</div>
                    <div className="text-xs text-slate-500 truncate">
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
            <div className="font-extrabold text-slate-900">Recent donations</div>
            <div className="text-sm text-slate-500">Your latest paid contributions</div>
          </div>
          <button
            onClick={() => nav("/donor/donations")}
            className="text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            View all →
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          {(ov?.recent_donations || []).length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              No donations yet. Start by browsing high-need campaigns.
              <button
                onClick={() => nav("/donor/projects")}
                className="ml-2 font-semibold text-slate-900 hover:underline"
              >
                Browse →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {ov!.recent_donations.map((d) => (
                <div key={d.donation_id} className="p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">
                      {d.request_title || "Donation"}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {d.school_name || "School"} • {d.district || "—"} • {d.province || "—"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{d.time || fmtDate(d.created_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-slate-900">{formatLKR(d.amount)}</div>
                    <div className="text-[11px] text-slate-500">Paid</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Recommended (High Need) */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-extrabold text-slate-900">Recommended needs</div>
            <div className="text-sm text-slate-500">Highest need_score campaigns (Approved)</div>
          </div>
          <button
            onClick={() => nav("/donor/projects")}
            className="text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            Browse all →
          </button>
        </div>

        <div className="mt-4">
          {recLoading ? (
            <div className="text-sm text-slate-500">Loading recommendations…</div>
          ) : recommended.length === 0 ? (
            <div className="text-sm text-slate-500">No approved campaigns found.</div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {recommended.map((p) => {
                const raised = Number(p.amount_raised || 0);
                const target = Math.max(1, Number(p.estimated_price || 0));
                const pct = Math.max(0, Math.min(100, Math.round((raised / target) * 100)));
                const need = Math.round(Number(p.need_score || 0));

                return (
                  <div key={p.request_id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <div className="h-36 bg-slate-100">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.request_title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 truncate">{p.request_title}</div>
                          <div className="text-xs text-slate-500 truncate">{p.school_name}</div>
                        </div>
                        <div className="shrink-0 rounded-xl px-2 py-1 text-xs font-extrabold bg-slate-900 text-white">
                          Need {need}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{formatLKR(raised)} raised</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-slate-900" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          Target: <span className="font-semibold text-slate-700">{formatLKR(target)}</span> • {p.category}
                        </div>
                      </div>

                      <button
                        onClick={() => nav(`/donor/projects?open=${p.request_id}`)}
                        className="mt-4 w-full rounded-xl bg-slate-900 text-white py-2 text-sm font-semibold hover:bg-slate-800"
                      >
                        View & Donate
                      </button>
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