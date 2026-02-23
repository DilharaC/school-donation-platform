import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

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

const Card: React.FC<{ children: any; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${className}`}>{children}</div>
);

const Pill: React.FC<{ children: any; className?: string }> = ({ children, className = "" }) => (
  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${className}`}>
    {children}
  </span>
);

const fmtMoney = (n: number) => `LKR ${Number(n || 0).toLocaleString()}`;
const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");

const needUI = (need: number) => {
  if (need >= 70) return "bg-rose-50 text-rose-700 border-rose-200";
  if (need >= 40) return "bg-amber-50 text-amber-700 border-amber-200";
  if (need >= 10) return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-green-50 text-green-700 border-green-200";
};

const LineChart: React.FC<{ points: number[] }> = ({ points }) => {
  // very small SVG chart (no libs)
  const w = 560;
  const h = 120;
  const pad = 10;

  const max = Math.max(1, ...points);
  const stepX = (w - pad * 2) / Math.max(1, points.length - 1);

  const d = points
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (1 - v / max) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[120px]">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-900/30" />
    </svg>
  );
};

const SchoolOverview: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewRes | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8000/api/school/overview", {
        // ✅ If you use cookies/sanctum:
        withCredentials: true,
      });
      setData(res.data);
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const trend = useMemo(() => data?.trend_30d?.map((x) => Number(x.total || 0)) ?? [], [data]);

  if (loading) {
    return <div className="text-slate-500 py-10 text-center">Loading school overview...</div>;
  }

  if (!data) {
    return (
      <Card className="p-10 text-center">
        <div className="text-3xl mb-2">🏫</div>
        <div className="text-slate-900 font-extrabold">Overview not available</div>
        <div className="text-slate-500 text-sm mt-1">Please login as a school account.</div>
        <div className="mt-4">
          <button
            onClick={fetchOverview}
            className="px-4 py-2 rounded-xl font-semibold bg-blue-700 text-white hover:bg-blue-800"
          >
            Retry
          </button>
        </div>
      </Card>
    );
  }

  const { school, kpis, recent_donations, top_campaigns } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">{school.school_name}</h1>
          <p className="text-slate-500 mt-1">
            {school.district || "—"}, {school.province || "—"} • Status:{" "}
            <span className="font-semibold">{(school.status || "inactive").toUpperCase()}</span>
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Pill className={needUI(Number(school.need_score || 0))}>Need: {Number(school.need_score || 0).toFixed(1)}</Pill>
            <Pill className={school.verified ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-700 border-slate-200"}>
              {school.verified ? "Verified" : "Not Verified"}
            </Pill>
            {school.registration_no ? (
              <Pill className="bg-slate-50 text-slate-700 border-slate-200">Reg: {school.registration_no}</Pill>
            ) : (
              <Pill className="bg-rose-50 text-rose-700 border-rose-200">Missing Reg No</Pill>
            )}
          </div>
        </div>

        <button
          onClick={fetchOverview}
          className="px-4 py-2 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs font-semibold text-slate-500">Total Received</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{fmtMoney(kpis.total_received)}</div>
          <div className="text-xs text-slate-500 mt-2">Last donation: {fmtDateTime(kpis.last_donation_at)}</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-semibold text-slate-500">Donations Count</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{kpis.donations_count}</div>
          <div className="text-xs text-slate-500 mt-2">Paid donations only</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-semibold text-slate-500">Active Campaigns</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{kpis.active_campaigns}</div>
          <div className="text-xs text-slate-500 mt-2">Approved campaigns</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-semibold text-slate-500">Pending Campaigns</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{kpis.pending_campaigns}</div>
          <div className="text-xs text-slate-500 mt-2">Waiting approval</div>
        </Card>
      </div>

      {/* Trend + Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Donation Trend (Last 30 Days)</div>
              <div className="text-xs text-slate-500 mt-1">Paid donation amount per day</div>
            </div>
            <Pill className="bg-slate-50 text-slate-700 border-slate-200">{trend.length} days</Pill>
          </div>
          <div className="mt-3">
            <LineChart points={trend} />
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-extrabold text-slate-900">Verification</div>
          <div className="text-xs text-slate-500 mt-1">Admin verifies using Reg No + Document</div>

          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Registration No</span>
              <span className="font-semibold text-slate-900">{school.registration_no || "—"}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Document</span>
              {school.document_link ? (
                <a
                  className="font-semibold text-blue-700 hover:underline"
                  href={school.document_link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
              ) : (
                <span className="font-semibold text-rose-700">Not uploaded</span>
              )}
            </div>

            <div className="mt-3">
              <Pill className={school.verified ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-700 border-slate-200"}>
                {school.verified ? "Verified" : "Not Verified"}
              </Pill>
            </div>

            {!school.verified && (
              <div className="text-xs text-slate-500 mt-2">
                Upload document + add Reg No to get verified faster.
              </div>
            )}
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
              <div className="py-6 text-center text-slate-500 text-sm">No paid donations yet.</div>
            ) : (
              recent_donations.map((d) => (
                <div key={d.donation_id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{d.donor_name || "Anonymous"}</div>
                    <div className="text-xs text-slate-500 truncate">{d.request_title || "Donation"}</div>
                    <div className="text-xs text-slate-400">{d.time_ago || fmtDateTime(d.created_at)}</div>
                  </div>
                  <div className="font-extrabold text-slate-900">{fmtMoney(d.amount)}</div>
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
              <div className="py-6 text-center text-slate-500 text-sm">No campaigns created yet.</div>
            ) : (
              top_campaigns.map((c) => {
                const pct =
                  c.estimated_price > 0 ? Math.min(100, (Number(c.amount_raised || 0) / Number(c.estimated_price)) * 100) : 0;
                return (
                  <div key={c.request_id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{c.request_title}</div>
                        <div className="text-xs text-slate-500">
                          {c.category} • {c.status}
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                        {fmtMoney(c.amount_raised)} / {fmtMoney(c.estimated_price)}
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
  );
};

export default SchoolOverview;