import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000/api";
const LEDGER_API = `${API_BASE}/admin/ledger`;

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

function tryJson(v: any) {
  if (!v) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

const titleize = (s?: string) =>
  (s || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

/** User-friendly colored pill per event type */
const eventPillClass = (event?: string) => {
  const e = (event || "").toUpperCase();

  // money / payment
  if (e.includes("DONATION") || e.includes("PAID")) {
    return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200";
  }
  // request / campaign
  if (e.includes("REQUEST") || e.includes("CAMPAIGN")) {
    return "bg-blue-50 text-blue-800 ring-1 ring-blue-200";
  }
  // evidence / proof
  if (e.includes("EVIDENCE") || e.includes("PROOF") || e.includes("UPLOAD")) {
    return "bg-violet-50 text-violet-800 ring-1 ring-violet-200";
  }
  // school changes
  if (e.includes("SCHOOL") || e.includes("VERIFIED") || e.includes("STATUS")) {
    return "bg-amber-50 text-amber-900 ring-1 ring-amber-200";
  }
  // donor
  if (e.includes("DONOR")) {
    return "bg-sky-50 text-sky-800 ring-1 ring-sky-200";
  }

  return "bg-slate-100 text-slate-800 ring-1 ring-slate-200";
};

/** Match outline button accent to event */
const eventButtonClass = (event?: string) => {
  const e = (event || "").toUpperCase();

  if (e.includes("DONATION") || e.includes("PAID")) return "border-emerald-200 text-emerald-800 hover:bg-emerald-50";
  if (e.includes("REQUEST") || e.includes("CAMPAIGN")) return "border-blue-200 text-blue-800 hover:bg-blue-50";
  if (e.includes("EVIDENCE") || e.includes("PROOF") || e.includes("UPLOAD")) return "border-violet-200 text-violet-800 hover:bg-violet-50";
  if (e.includes("SCHOOL") || e.includes("VERIFIED") || e.includes("STATUS")) return "border-amber-200 text-amber-900 hover:bg-amber-50";
  if (e.includes("DONOR")) return "border-sky-200 text-sky-800 hover:bg-sky-50";

  return "border-slate-200 text-slate-800 hover:bg-slate-50";
};

export default function AdminAuditTrail() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<{ event_types: string[]; entity_types: string[] }>({
    event_types: [],
    entity_types: [],
  });
  const [loading, setLoading] = useState(false);

  // UI state
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // drawer
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<any | null>(null);

  // toast
  const [toast, setToast] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);
  const payloadObj = useMemo(() => tryJson(active?.payload_json), [active]);

  const fetchData = async (next?: { page?: number; search?: string; eventType?: string; entityType?: string }) => {
    const p = next?.page ?? page;
    const s = next?.search ?? search;
    const et = next?.eventType ?? eventType;
    const ent = next?.entityType ?? entityType;

    setLoading(true);
    try {
      const res = await axios.get(LEDGER_API, {
        params: { search: s, event_type: et, entity_type: ent, page: p, limit },
        withCredentials: true,
      });

      setRows(res.data.rows || []);
      setTotal(Number(res.data.total || 0));
      setFilters(res.data.filters || { event_types: [], entity_types: [] });
    } catch (e) {
      console.error(e);
      setToast("Failed to load audit trail");
      setTimeout(() => setToast(null), 2500);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const onApply = () => {
    setPage(1);
    setSearch(searchDraft.trim());
    fetchData({ page: 1, search: searchDraft.trim() });
  };

  const onClear = () => {
    setSearchDraft("");
    setSearch("");
    setEventType("");
    setEntityType("");
    setPage(1);
    fetchData({ page: 1, search: "", eventType: "", entityType: "" });
  };

  const openRow = (r: any) => {
    setActive(r);
    setOpen(true);
  };

  const copy = async (text?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copied");
      setTimeout(() => setToast(null), 1500);
    } catch {
      setToast("Copy failed");
      setTimeout(() => setToast(null), 1500);
    }
  };

  return (
    <div className="px-6 py-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[110] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-sm font-bold text-slate-800">
          {toast}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
              {/* clipboard icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="4" rx="1" />
                <path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
              </svg>
            </span>
            <div>
              <div className="text-slate-900 font-extrabold text-2xl">Audit Trail</div>
              <div className="text-slate-500 text-sm mt-1">Immutable ledger entries (events, hashes, payloads).</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData()}
            className="rounded-xl px-4 py-2 text-sm font-extrabold bg-[#0B1E3B] text-white shadow-sm hover:opacity-95"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <div className="text-xs font-bold text-slate-600 mb-1">Search</div>
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onApply();
              }}
              placeholder="Search event / entity / id / hash / payload…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />
            {(search || eventType || entityType) && (
              <div className="mt-2 text-xs text-slate-500">
                Active filters:{" "}
                <span className="font-bold text-slate-700">
                  {search ? `Search="${search}"` : "Search=All"}
                  {" · "}
                  {eventType ? `Event=${eventType}` : "Event=All"}
                  {" · "}
                  {entityType ? `Entity=${entityType}` : "Entity=All"}
                </span>
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-bold text-slate-600 mb-1">Event Type</div>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">All</option>
              {filters.event_types.map((x) => (
                <option key={x} value={x}>
                  {titleize(x)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-600 mb-1">Entity Type</div>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">All</option>
              {filters.entity_types.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={onApply}
              className="w-full rounded-xl px-4 py-2 text-sm font-extrabold bg-[#0B1E3B] text-white shadow-sm hover:opacity-95"
            >
              Apply
            </button>
            <button
              onClick={onClear}
              className="w-full rounded-xl px-4 py-2 text-sm font-extrabold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="text-sm font-extrabold text-slate-900">
            Entries <span className="text-slate-500 font-bold">({total})</span>
          </div>
          <div className="text-xs text-slate-500">
            Page {page} / {totalPages}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center">
            <div className="text-slate-900 font-extrabold">No ledger entries found.</div>
            <div className="text-slate-500 text-sm mt-1">Try clearing filters or changing event/entity type.</div>
            <button
              onClick={onClear}
              className="mt-4 rounded-xl px-4 py-2 text-sm font-extrabold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-600">
                  <th className="px-4 py-3 font-bold">ID</th>
                  <th className="px-4 py-3 font-bold">Event</th>
                  <th className="px-4 py-3 font-bold">Entity</th>
                  <th className="px-4 py-3 font-bold">Entity ID</th>
                  <th className="px-4 py-3 font-bold">Created</th>
                  <th className="px-4 py-3 font-bold">Hash</th>
                  <th className="px-4 py-3 font-bold"></th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-extrabold text-slate-900">{r.id}</td>

                    <td className="px-4 py-3">
                      <span
                        className={cx(
                          "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-extrabold",
                          eventPillClass(r.event_type)
                        )}
                        title={r.event_type}
                      >
                        {titleize(r.event_type)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-700">{r.entity_type}</td>
                    <td className="px-4 py-3 text-slate-700">{r.entity_id}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(r.created_at)}</td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono text-xs">
                          {(r.hash || "").slice(0, 12)}…
                        </span>
                        <button
                          onClick={() => copy(r.hash)}
                          className="rounded-lg px-2 py-1 text-[11px] font-extrabold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          title="Copy hash"
                        >
                          Copy
                        </button>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => openRow(r)}
                        className={cx(
                          "rounded-xl px-3 py-2 text-xs font-extrabold border bg-white transition",
                          eventButtonClass(r.event_type)
                        )}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={cx(
              "rounded-xl px-3 py-2 text-xs font-extrabold border",
              page <= 1 ? "border-slate-200 text-slate-400 bg-slate-50" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
            )}
          >
            Prev
          </button>

          <div className="text-xs text-slate-500">
            Showing{" "}
            <span className="font-bold text-slate-700">
              {(page - 1) * limit + 1}
            </span>{" "}
            –{" "}
            <span className="font-bold text-slate-700">
              {Math.min(page * limit, total)}
            </span>{" "}
            of <span className="font-bold text-slate-700">{total}</span>
          </div>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className={cx(
              "rounded-xl px-3 py-2 text-xs font-extrabold border",
              page >= totalPages ? "border-slate-200 text-slate-400 bg-slate-50" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
            )}
          >
            Next
          </button>
        </div>
      </div>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-[90]">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex items-start justify-between">
              <div>
                <div className="text-slate-900 font-extrabold text-lg">Ledger Entry #{active?.id}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={cx("inline-flex items-center rounded-full px-2 py-1 text-[11px] font-extrabold", eventPillClass(active?.event_type))}>
                    {titleize(active?.event_type)}
                  </span>
                  <span className="text-slate-500 text-sm">{fmtDate(active?.created_at)}</span>
                </div>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-xl h-10 w-10 grid place-items-center border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs font-bold text-slate-500 mb-1">Entity</div>
                  <div className="font-extrabold text-slate-900">{active?.entity_type}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs font-bold text-slate-500 mb-1">Entity ID</div>
                  <div className="font-extrabold text-slate-900">{active?.entity_id}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-500 mb-1">Hash</div>
                    <div className="font-mono text-xs text-slate-700 break-all">{active?.hash}</div>
                  </div>
                  <button
                    onClick={() => copy(active?.hash)}
                    className="rounded-xl px-3 py-2 text-xs font-extrabold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                  >
                    Copy
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="w-full">
                    <div className="text-xs font-bold text-slate-500 mb-1">Previous Hash</div>
                    <div className="font-mono text-xs text-slate-700 break-all">{active?.prev_hash}</div>
                  </div>
                  <button
                    onClick={() => copy(active?.prev_hash)}
                    className="rounded-xl px-3 py-2 text-xs font-extrabold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-500">Payload</div>
                  <button
                    onClick={() => copy(JSON.stringify(payloadObj ?? active?.payload_json ?? {}, null, 2))}
                    className="rounded-xl px-3 py-2 text-xs font-extrabold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                  >
                    Copy JSON
                  </button>
                </div>

                <pre className="mt-2 text-xs bg-slate-50 rounded-xl p-3 overflow-auto max-h-[380px] text-slate-800">
{JSON.stringify(payloadObj ?? active?.payload_json ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}