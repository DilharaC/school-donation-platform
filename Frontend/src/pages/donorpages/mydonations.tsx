import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000/api";
const MY_DONATIONS = `${API_BASE}/donor/my-donations`; // returns donations list (paid/pending/all)
const REQUEST_DETAIL = (id: number) => `${API_BASE}/donation_requests/${id}`; // includes evidences
const RECEIPT_ENDPOINT = (id: number) => `${API_BASE}/donations/${id}/receipt`; // ✅ receipt

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");
const formatLKR = (n: number) => `LKR ${Number.isFinite(n) ? n.toLocaleString() : "0"}`;

/** Convert "/storage/.." or "http.." to absolute URL */
const toAbs = (u?: string | null) => {
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  // your backend is on localhost:8000
  return `http://localhost:8000${u.startsWith("/") ? "" : "/"}${u}`;
};

type DonationRow = {
  donation_id: number;
  request_id: number;
  amount: number;
  status: "paid" | "pending" | string;
  created_at: string;
  time?: string | null;

  request_title?: string | null;
  school_id?: number | null;
  school_name?: string | null;
  district?: string | null;
  province?: string | null;

  // ✅ optional if your MY_DONATIONS API already returns them (nice to have)
  request_image_url?: string | null;
  school_logo_url?: string | null;
};

type Evidence = {
  id: number;
  file_url: string;
  file_type: "pdf" | "image" | string;
  note?: string | null;
  created_at?: string;
};

type RequestDetailRes = {
  project: {
    request_id: number;
    request_title: string;
    description?: string | null;
    category?: string | null;
    quantity?: number;
    estimated_price?: number;
    amount_raised?: number;
    status?: string;
    image_url?: string | null;
    document_url?: string | null;
    school: {
      school_id?: number | null;
      school_name?: string | null;
      contact_email?: string | null;
      contact_phone?: string | null;
      address?: string | null;
      district?: string | null;
      province?: string | null;
      registration_no?: string | null;

      // ✅ make sure backend returns this (or rename to your field name)
      logo_url?: string | null;
    };
    evidences: Evidence[];
  };
};

type DonatedRequestRow = {
  request_id: number;
  request_title: string;
  school_name?: string | null;
  province?: string | null;
  district?: string | null;

  total_donated: number;
  donations_count: number;
  last_donated_at?: string | null;

  first_donation_id?: number | null;
};

function Pill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "emerald" | "amber" | "rose";
}) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <span className={cx("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold border", map[tone])}>
      {children}
    </span>
  );
}

const statusTone = (s: string) => {
  const v = (s || "").toLowerCase();
  if (v === "paid") return "emerald";
  if (v === "pending") return "amber";
  return "slate";
};

const initials = (name?: string | null) => {
  const n = (name || "School").trim();
  const parts = n.split(/\s+/);
  const a = parts[0]?.[0] || "S";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
};

function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cx("fixed inset-0 z-[90]", open ? "" : "pointer-events-none")}>
      <div
        className={cx("absolute inset-0 bg-black/30 transition-opacity duration-200", open ? "opacity-100" : "opacity-0")}
        onClick={onClose}
      />
      <div
        className={cx(
          "absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white shadow-2xl transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          <div className="p-5 border-b flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-slate-500 font-bold">Donated request</div>
              <div className="text-lg font-extrabold text-slate-900 truncate">{title}</div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-xl px-3 py-2 text-sm font-extrabold border border-slate-200 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
          <div className="p-5 overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** ✅ Receipt Modal */
function ReceiptModal({
  open,
  onClose,
  receipt,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  receipt: any;
  loading: boolean;
}) {
  return (
    <div className={open ? "fixed inset-0 z-[110]" : "hidden"}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800">
            ✕
          </button>

          <div className="text-center">
            <div className="text-xs text-slate-500 font-bold">Donation Receipt</div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">#{receipt?.donation_id || ""}</div>
          </div>

          {loading ? (
            <div className="text-center py-10 text-slate-500">Loading receipt…</div>
          ) : !receipt ? (
            <div className="text-center py-10 text-rose-600 font-bold">Could not load receipt.</div>
          ) : (
            <div className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-extrabold text-slate-900">{formatLKR(Number(receipt.amount) || 0)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="font-extrabold uppercase text-emerald-600">{String(receipt.status || "").toUpperCase()}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold">{new Date(receipt.created_at).toLocaleString()}</span>
              </div>

              <hr />

              <div>
                <div className="text-slate-500 text-xs font-bold">Request</div>
                <div className="font-extrabold text-slate-900">{receipt.request_title}</div>
              </div>

              <div>
                <div className="text-slate-500 text-xs font-bold">School</div>
                <div className="font-extrabold text-slate-900">{receipt.school_name}</div>
                <div className="text-xs text-slate-500">
                  {receipt.province} • {receipt.district}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => window.print()}
            className="mt-6 w-full bg-slate-900 text-white rounded-2xl py-3 font-extrabold hover:opacity-95"
          >
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

/** ✅ Avatar with request image OR school logo OR initials */
function Avatar({
  label,
  requestId,
  requestImage,
  schoolLogo,
  getThumb,
}: {
  label?: string | null;
  requestId: number;
  requestImage?: string | null;
  schoolLogo?: string | null;
  getThumb: (requestId: number) => void;
}) {
  // start fetching if not present
  useEffect(() => {
    if (!requestImage && !schoolLogo) getThumb(requestId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const src = toAbs(requestImage) || toAbs(schoolLogo);

  return (
    <div className="shrink-0 h-12 w-12 rounded-2xl overflow-hidden bg-slate-900">
      {src ? (
        <img
          src={src}
          alt="thumb"
          className="w-full h-full object-cover"
          onError={(e) => {
            // if image fails, hide it and show fallback initials
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="w-full h-full text-white grid place-items-center font-extrabold">
          {initials(label)}
        </div>
      )}
    </div>
  );
}

export default function MyDonations() {
  // ----- tab -----
  const [tab, setTab] = useState<"donations" | "requests">("requests");

  // ----- shared filters -----
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"paid" | "pending" | "all">("paid");

  // ----- donations list state -----
  const [loadingDonations, setLoadingDonations] = useState(true);
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [donationsTotal, setDonationsTotal] = useState(0);
  const [donationsPage, setDonationsPage] = useState(1);
  const donationsLimit = 10;

  // ----- requests (grouped) state -----
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requests, setRequests] = useState<DonatedRequestRow[]>([]);
  const [reqTotal, setReqTotal] = useState(0);
  const [reqPage, setReqPage] = useState(1);
  const reqLimit = 10;

  // ----- error -----
  const [err, setErr] = useState<string | null>(null);

  // ----- drawer -----
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<RequestDetailRes["project"] | null>(null);
  const [selectedReq, setSelectedReq] = useState<DonatedRequestRow | null>(null);

  // ✅ receipt modal state
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  /** ✅ thumbnails cache by request_id */
  const [thumbs, setThumbs] = useState<Record<number, { request_image?: string | null; school_logo?: string | null }>>(
    {}
  );
  const inflight = useRef<Set<number>>(new Set());

  const donationsPages = useMemo(() => Math.max(1, Math.ceil(donationsTotal / donationsLimit)), [donationsTotal]);
  const reqPages = useMemo(() => Math.max(1, Math.ceil(reqTotal / reqLimit)), [reqTotal]);

  /** ✅ fetch & cache request image + school logo */
  const fetchThumbForRequest = async (requestId: number) => {
    if (!requestId) return;
    if (thumbs[requestId]?.request_image || thumbs[requestId]?.school_logo) return;
    if (inflight.current.has(requestId)) return;

    inflight.current.add(requestId);
    try {
      const res = await axios.get<RequestDetailRes>(REQUEST_DETAIL(requestId), { withCredentials: true });
      const p = res.data?.project;

      setThumbs((prev) => ({
        ...prev,
        [requestId]: {
          request_image: p?.image_url ?? null,
          school_logo: p?.school?.logo_url ?? null,
        },
      }));
    } catch {
      // keep empty so we fallback to initials
      setThumbs((prev) => ({ ...prev, [requestId]: { request_image: null, school_logo: null } }));
    } finally {
      inflight.current.delete(requestId);
    }
  };

  // ----- fetch donations list -----
  const fetchDonations = async () => {
    setLoadingDonations(true);
    setErr(null);
    try {
      const res = await axios.get(MY_DONATIONS, {
        withCredentials: true,
        params: {
          search,
          status,
          page: donationsPage,
          limit: donationsLimit,
          sortBy: "created_at",
          sortDir: "desc",
        },
      });

      const rows: DonationRow[] = res.data?.donations ?? [];
      setDonations(rows);
      setDonationsTotal(Number(res.data?.total ?? 0));
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load donations");
      setDonations([]);
      setDonationsTotal(0);
    } finally {
      setLoadingDonations(false);
    }
  };

  // ----- fetch donated requests (grouped) -----
  const fetchDonatedRequests = async () => {
    setLoadingRequests(true);
    setErr(null);
    try {
      const res = await axios.get(MY_DONATIONS, {
        withCredentials: true,
        params: {
          search,
          status,
          page: 1,
          limit: 2000,
          sortBy: "created_at",
          sortDir: "desc",
        },
      });

      const rows: DonationRow[] = res.data?.donations ?? [];
      const map = new Map<number, DonatedRequestRow>();

      for (const d of rows) {
        const id = Number(d.request_id);
        const cur = map.get(id);

        if (!cur) {
          map.set(id, {
            request_id: id,
            request_title: d.request_title || `Request #${id}`,
            school_name: d.school_name,
            province: d.province,
            district: d.district,
            total_donated: Number(d.amount) || 0,
            donations_count: 1,
            last_donated_at: d.created_at,
            first_donation_id: d.donation_id,
          });
        } else {
          cur.total_donated += Number(d.amount) || 0;
          cur.donations_count += 1;
          if (!cur.last_donated_at || new Date(d.created_at) > new Date(cur.last_donated_at)) {
            cur.last_donated_at = d.created_at;
            cur.first_donation_id = d.donation_id;
          }
        }

        // ✅ if MY_DONATIONS returns image/logo fields, cache them too
        if (d.request_image_url || d.school_logo_url) {
          setThumbs((prev) => ({
            ...prev,
            [id]: {
              request_image: d.request_image_url ?? prev[id]?.request_image ?? null,
              school_logo: d.school_logo_url ?? prev[id]?.school_logo ?? null,
            },
          }));
        }
      }

      const all = Array.from(map.values()).sort((a, b) => {
        const da = a.last_donated_at ? new Date(a.last_donated_at).getTime() : 0;
        const db = b.last_donated_at ? new Date(b.last_donated_at).getTime() : 0;
        return db - da;
      });

      const total = all.length;
      const start = (reqPage - 1) * reqLimit;
      const pageRows = all.slice(start, start + reqLimit);

      setRequests(pageRows);
      setReqTotal(total);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load donated requests");
      setRequests([]);
      setReqTotal(0);
    } finally {
      setLoadingRequests(false);
    }
  };

  // ----- drawer open (evidence) -----
  const openEvidenceDrawer = async (r: DonatedRequestRow) => {
    setSelectedReq(r);
    setDrawerOpen(true);
    setDetail(null);
    setDetailLoading(true);

    try {
      const res = await axios.get<RequestDetailRes>(REQUEST_DETAIL(r.request_id), { withCredentials: true });
      setDetail(res.data?.project ?? null);

      // ✅ also cache thumb from drawer response
      const p = res.data?.project;
      setThumbs((prev) => ({
        ...prev,
        [r.request_id]: { request_image: p?.image_url ?? null, school_logo: p?.school?.logo_url ?? null },
      }));
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // ✅ open receipt
  const openReceipt = async (donationId: number) => {
    setReceiptOpen(true);
    setReceipt(null);
    setReceiptLoading(true);
    try {
      const res = await axios.get(RECEIPT_ENDPOINT(donationId), { withCredentials: true });
      setReceipt(res.data?.receipt ?? null);
    } catch {
      setReceipt(null);
    } finally {
      setReceiptLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "donations") fetchDonations();
    if (tab === "requests") fetchDonatedRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, donationsPage, reqPage, status]);

  const applyFilters = () => {
    setDonationsPage(1);
    setReqPage(1);
    if (tab === "donations") fetchDonations();
    else fetchDonatedRequests();
  };

  return (
    <div className="w-full px-3 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs text-slate-500 font-bold">Donor dashboard</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">My Donations</div>
          <div className="text-sm text-slate-600 mt-1">
            View <b>Donations</b> separately and <b>Donated Requests</b> (open evidence drawer).
          </div>
        </div>

        <button
          onClick={() => (tab === "donations" ? fetchDonations() : fetchDonatedRequests())}
          className="rounded-2xl px-4 py-2.5 font-extrabold bg-slate-900 text-white hover:opacity-95"
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-6 inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          onClick={() => setTab("requests")}
          className={cx(
            "px-4 py-2 rounded-xl text-sm font-extrabold transition",
            tab === "requests" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
          )}
        >
          Donated Requests (Evidence)
        </button>
        <button
          onClick={() => setTab("donations")}
          className={cx(
            "px-4 py-2 rounded-xl text-sm font-extrabold transition",
            tab === "donations" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
          )}
        >
          Donations List
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-7">
            <label className="text-xs font-extrabold text-slate-600">Search</label>
            <div className="mt-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔎</div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by request title / school / district / province..."
                className="w-full rounded-2xl border border-slate-200 pl-9 pr-3 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className="text-xs font-extrabold text-slate-600">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as any);
                setDonationsPage(1);
                setReqPage(1);
              }}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="all">All</option>
            </select>
          </div>

          <div className="lg:col-span-2 flex items-end">
            <button
              onClick={applyFilters}
              className="w-full rounded-2xl px-3 py-3 text-sm font-extrabold border border-slate-200 hover:bg-slate-50"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Errors */}
      {err ? <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-800">{err}</div> : null}

      {/* ---------------- Tab Content ---------------- */}
      <div className="mt-6">
        {/* ====== TAB: DONATIONS LIST ====== */}
        {tab === "donations" && (
          <>
            {loadingDonations ? (
              <div className="text-slate-500 text-center py-12">Loading…</div>
            ) : donations.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <div className="text-4xl mb-3">💸</div>
                <div className="text-slate-900 font-extrabold text-xl">No donations found</div>
                <div className="text-slate-500 text-sm mt-1">Try changing filters.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {donations.map((d) => {
                  const t = thumbs[d.request_id];
                  const requestImage = d.request_image_url ?? t?.request_image ?? null;
                  const schoolLogo = d.school_logo_url ?? t?.school_logo ?? null;

                  return (
                    <div key={d.donation_id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start gap-4">
                        <Avatar
                          label={d.school_name}
                          requestId={d.request_id}
                          requestImage={requestImage}
                          schoolLogo={schoolLogo}
                          getThumb={fetchThumbForRequest}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-base font-extrabold text-slate-900 truncate">
                                {d.request_title || `Request #${d.request_id}`}
                              </div>
                              <div className="mt-1 text-xs text-slate-500 truncate">
                                <span className="font-bold text-slate-600">{d.school_name || "School"}</span>
                                {d.province ? ` • ${d.province}` : ""}
                                {d.district ? ` • ${d.district}` : ""}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="text-slate-900 font-extrabold">{formatLKR(Number(d.amount) || 0)}</div>
                              <div className="mt-2 flex items-center justify-end">
                                <Pill tone={statusTone(d.status)}>{String(d.status).toUpperCase()}</Pill>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="text-xs text-slate-500">
                              <span className="font-bold text-slate-700">#{d.donation_id}</span>
                              <span className="mx-2">•</span>
                              <span>{d.time || new Date(d.created_at).toLocaleString()}</span>
                            </div>

                            <button
                              onClick={() => openReceipt(d.donation_id)}
                              className="rounded-xl px-3 py-2 text-xs font-extrabold border border-slate-200 hover:bg-slate-50"
                            >
                              View Receipt →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Donations Pagination */}
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-slate-600">
                Page <span className="font-extrabold text-slate-900">{donationsPage}</span> / {donationsPages} • Total{" "}
                <span className="font-extrabold text-slate-900">{donationsTotal}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={donationsPage <= 1}
                  onClick={() => setDonationsPage((p) => Math.max(1, p - 1))}
                  className={cx(
                    "rounded-2xl px-4 py-2 text-sm font-extrabold border",
                    donationsPage <= 1 ? "border-slate-200 text-slate-400" : "border-slate-200 hover:bg-slate-50"
                  )}
                >
                  Prev
                </button>
                <button
                  disabled={donationsPage >= donationsPages}
                  onClick={() => setDonationsPage((p) => Math.min(donationsPages, p + 1))}
                  className={cx(
                    "rounded-2xl px-4 py-2 text-sm font-extrabold border",
                    donationsPage >= donationsPages ? "border-slate-200 text-slate-400" : "border-slate-200 hover:bg-slate-50"
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {/* ====== TAB: DONATED REQUESTS (Evidence Drawer) ====== */}
        {tab === "requests" && (
          <>
            {loadingRequests ? (
              <div className="text-slate-500 text-center py-12">Loading…</div>
            ) : requests.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <div className="text-4xl mb-3">🎁</div>
                <div className="text-slate-900 font-extrabold text-xl">No donated requests</div>
                <div className="text-slate-500 text-sm mt-1">Donate to a request and it will appear here.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {requests.map((r) => {
                  const t = thumbs[r.request_id];
                  const requestImage = t?.request_image ?? null;
                  const schoolLogo = t?.school_logo ?? null;

                  return (
                    <button
                      key={r.request_id}
                      onClick={() => openEvidenceDrawer(r)}
                      className={cx(
                        "group w-full text-left rounded-3xl border border-slate-200 bg-white p-5 shadow-sm",
                        "transition hover:-translate-y-[2px] hover:shadow-md hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <Avatar
                          label={r.school_name}
                          requestId={r.request_id}
                          requestImage={requestImage}
                          schoolLogo={schoolLogo}
                          getThumb={fetchThumbForRequest}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-base font-extrabold text-slate-900 truncate">{r.request_title}</div>
                              <div className="mt-1 text-xs text-slate-500 truncate">
                                <span className="font-bold text-slate-600">{r.school_name || "School"}</span>
                                {r.province ? ` • ${r.province}` : ""}
                                {r.district ? ` • ${r.district}` : ""}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="text-slate-900 font-extrabold">{formatLKR(Number(r.total_donated) || 0)}</div>
                              <div className="mt-1 text-xs text-slate-500">
                                {r.donations_count} donation{r.donations_count === 1 ? "" : "s"}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <div className="text-xs text-slate-500">
                              <span className="font-bold text-slate-700">Request #{r.request_id}</span>
                              {r.last_donated_at ? (
                                <>
                                  <span className="mx-2">•</span>
                                  <span>Last: {new Date(r.last_donated_at).toLocaleString()}</span>
                                </>
                              ) : null}
                            </div>

                            <div className="text-xs font-extrabold text-slate-700 group-hover:text-slate-900">
                              View evidence →
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Requests Pagination */}
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-slate-600">
                Page <span className="font-extrabold text-slate-900">{reqPage}</span> / {reqPages} • Total{" "}
                <span className="font-extrabold text-slate-900">{reqTotal}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={reqPage <= 1}
                  onClick={() => setReqPage((p) => Math.max(1, p - 1))}
                  className={cx(
                    "rounded-2xl px-4 py-2 text-sm font-extrabold border",
                    reqPage <= 1 ? "border-slate-200 text-slate-400" : "border-slate-200 hover:bg-slate-50"
                  )}
                >
                  Prev
                </button>
                <button
                  disabled={reqPage >= reqPages}
                  onClick={() => setReqPage((p) => Math.min(reqPages, p + 1))}
                  className={cx(
                    "rounded-2xl px-4 py-2 text-sm font-extrabold border",
                    reqPage >= reqPages ? "border-slate-200 text-slate-400" : "border-slate-200 hover:bg-slate-50"
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Drawer (Evidence) */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={detail?.request_title || selectedReq?.request_title || "Request"}>
        {detailLoading ? (
          <div className="text-slate-500">Loading request details…</div>
        ) : !detail ? (
          <div className="rounded-3xl border border-slate-200 p-5 text-slate-700">
            Could not load request details. Check API route: <b>/api/donation_requests/:id</b>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Request info */}
            <div className="rounded-3xl border border-slate-200 p-5">
              <div className="text-xs text-slate-500 font-bold">Request</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">{detail.request_title}</div>
              {detail.description ? <div className="mt-2 text-sm text-slate-600">{detail.description}</div> : null}

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500 font-bold">Goal</div>
                  <div className="font-extrabold text-slate-900">{formatLKR(Number(detail.estimated_price) || 0)}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500 font-bold">Raised</div>
                  <div className="font-extrabold text-slate-900">{formatLKR(Number(detail.amount_raised) || 0)}</div>
                </div>
              </div>
            </div>

            {/* School info */}
            <div className="rounded-3xl border border-slate-200 p-5">
              <div className="text-xs text-slate-500 font-bold">School</div>
              <div className="mt-1 font-extrabold text-slate-900">{detail.school?.school_name || "School"}</div>
              <div className="mt-1 text-sm text-slate-600">
                {detail.school?.province ? `${detail.school.province}` : ""}
                {detail.school?.district ? ` • ${detail.school.district}` : ""}
              </div>
              {detail.school?.address ? <div className="mt-2 text-sm text-slate-600">{detail.school.address}</div> : null}
            </div>

            {/* Evidence */}
            <div className="rounded-3xl border border-slate-200 p-5">
              <div className="text-xs text-slate-500 font-bold">Evidence uploaded</div>

              {!detail.evidences || detail.evidences.length === 0 ? (
                <div className="mt-3 text-sm text-slate-600">No evidence uploaded yet.</div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {detail.evidences.map((e) => {
                    const isPdf =
                      String(e.file_type).toLowerCase() === "pdf" || e.file_url.toLowerCase().endsWith(".pdf");
                    const href = `http://localhost:8000${e.file_url}`;

                    if (isPdf) {
                      return (
                        <a
                          key={e.id}
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-3xl border border-slate-200 p-4 hover:bg-slate-50 transition"
                        >
                          <div className="font-extrabold text-slate-900">📄 PDF Evidence</div>
                          {e.note ? <div className="text-xs text-slate-600 mt-2">{e.note}</div> : null}
                          <div className="text-xs text-slate-500 mt-1 break-all">{e.file_url}</div>
                        </a>
                      );
                    }

                    return (
                      <a
                        key={e.id}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-3xl border border-slate-200 overflow-hidden hover:bg-slate-50 transition"
                      >
                        <div className="aspect-[4/3] bg-slate-100">
                          <img src={href} alt="evidence" className="w-full h-full object-cover" />
                        </div>
                        <div className="p-4">
                          <div className="font-extrabold text-slate-900">🖼️ Image Evidence</div>
                          {e.note ? <div className="text-xs text-slate-600 mt-1">{e.note}</div> : null}
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* ✅ Receipt Modal */}
      <ReceiptModal open={receiptOpen} onClose={() => setReceiptOpen(false)} receipt={receipt} loading={receiptLoading} />
    </div>
  );
}