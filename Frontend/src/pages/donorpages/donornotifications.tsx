import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000/api";
const NOTIF_API = `${API_BASE}/notifications`;
const NOTIF_READ_ALL = `${API_BASE}/notifications/read-all`;
const NOTIF_MARK_READ = (id: string) => `${API_BASE}/notifications/${id}/read`;
const NOTIF_DELETE = (id: string) => `${API_BASE}/notifications/${id}`;

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

function safeJson(v: any) {
  if (!v) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

// ✅ Rewrite message body with names (no IDs)
function buildPrettyBody(data: any) {
  const base = (data?.body || "").toString();
  const schoolName = data?.school_name || "";
  const requestTitle = data?.request_title || "";

  // If backend already sent a nice body, just improve it
  if (base) {
    let out = base;

    // Replace "The school" with real name if we have it
    if (schoolName) out = out.replace(/\bThe school\b/gi, schoolName);

    // Replace "request:" part with title if we have it
    // examples: "request: abc", "request : abc", etc
    if (requestTitle) {
      out = out.replace(/(request\s*:\s*)(.+)$/i, `$1${requestTitle}`);
      out = out.replace(/Request\s*#\d+/gi, requestTitle); // just in case
    }

    return out;
  }

  // If body missing, build from scratch
  if (schoolName && requestTitle) return `${schoolName} added an update for: ${requestTitle}.`;
  if (requestTitle) return `New update for: ${requestTitle}.`;
  return "You have a new update.";
}

export default function DonorNotifications() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [tab, setTab] = useState<"all" | "unread">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  const fetchData = async (opts?: { keepPage?: boolean }) => {
    setLoading(true);
    try {
      const res = await axios.get(NOTIF_API, {
        withCredentials: true,
        params: {
          role: "donor",
          unread: tab === "unread" ? 1 : 0,
          search: search || "",
          page: opts?.keepPage ? page : 1,
          limit,
        },
      });

      setRows(res.data.rows || []);
      setTotal(Number(res.data.total || 0));
      setUnreadCount(Number(res.data.unread_count || 0));
      if (!opts?.keepPage) setPage(1);
    } catch (e) {
      console.error(e);
      alert("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData({ keepPage: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tab]);

  const onApply = () => fetchData();
  const onClear = () => {
    setSearch("");
    setPage(1);
    setTimeout(() => fetchData(), 0);
  };

  const markRead = async (id: string) => {
    try {
      await axios.post(NOTIF_MARK_READ(id), null, {
        withCredentials: true,
        params: { role: "donor" },
      });

      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, read_at: new Date().toISOString() } : r)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
      alert("Failed to mark as read");
    }
  };

  const markAllRead = async () => {
    try {
      await axios.post(NOTIF_READ_ALL, null, {
        withCredentials: true,
        params: { role: "donor" },
      });

      setRows((prev) => prev.map((r) => (r.read_at ? r : { ...r, read_at: new Date().toISOString() })));
      setUnreadCount(0);

      if (tab === "unread") {
        setPage(1);
        setTimeout(() => fetchData(), 0);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to mark all read");
    }
  };

  const deleteNotif = async (id: string) => {
    if (!confirm("Delete this notification?")) return;
    try {
      await axios.delete(NOTIF_DELETE(id), { withCredentials: true, params: { role: "donor" } });

      const removed = rows.find((x) => x.id === id);
      setRows((prev) => prev.filter((x) => x.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      if (removed && !removed.read_at) setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
      alert("Failed to delete");
    }
  };

  return (
    <div className="px-6 py-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="text-2xl font-extrabold text-slate-900">Notifications</div>
          <div className="text-slate-500 text-sm mt-1">Updates about your donations and supported requests</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className={cx(
              "rounded-xl px-4 py-2 text-sm font-extrabold border",
              unreadCount === 0
                ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
            )}
          >
            Mark all read
          </button>

          <button
            onClick={() => fetchData({ keepPage: true })}
            className="rounded-xl px-4 py-2 text-sm font-extrabold bg-[#0B1E3B] text-white shadow-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats + Tabs + Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-bold">Unread</div>
          <div className="text-3xl font-extrabold text-[#0B1E3B] mt-1">{unreadCount}</div>
          <div className="text-xs text-slate-500 mt-1">Needs your attention</div>
        </div>

        <div className="md:col-span-2 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => {
                  setTab("all");
                  setPage(1);
                }}
                className={cx(
                  "px-4 py-2 rounded-lg text-sm font-extrabold",
                  tab === "all" ? "bg-white shadow text-slate-900" : "text-slate-600"
                )}
              >
                All
              </button>
              <button
                onClick={() => {
                  setTab("unread");
                  setPage(1);
                }}
                className={cx(
                  "px-4 py-2 rounded-lg text-sm font-extrabold",
                  tab === "unread" ? "bg-white shadow text-slate-900" : "text-slate-600"
                )}
              >
                Unread
              </button>
            </div>

            <div className="flex-1 flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title/body..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              />
              <button onClick={onApply} className="rounded-xl px-4 py-2 text-sm font-extrabold bg-[#0B1E3B] text-white">
                Apply
              </button>
              <button
                onClick={onClear}
                className="rounded-xl px-4 py-2 text-sm font-extrabold border border-slate-200 bg-white text-slate-800"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 font-extrabold text-slate-900">Messages ({total})</div>

        {loading ? (
          <div className="py-10 text-center text-slate-500">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-slate-500">No notifications found</div>
        ) : (
          rows.map((r) => {
            const unread = !r.read_at;
            const data = r.data_obj || safeJson(r.data) || {}; // ✅ prefer enriched
            const title = data?.title || "Notification";
            const body = buildPrettyBody(data);

            return (
              <div
                key={r.id}
                className={cx(
                  "px-5 py-4 border-t border-slate-100 transition cursor-pointer",
                  unread ? "bg-blue-50 hover:bg-blue-50/70" : "hover:bg-slate-50"
                )}
                onClick={() => {
                  if (!r.read_at) markRead(r.id);
                }}
                role="button"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 text-lg truncate">{title}</div>
                    <div className="text-slate-600 text-sm mt-1">{body}</div>

                    <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-500">
                      <span>{fmtDate(r.created_at)}</span>

                      {/* ✅ Names only */}
                      {data?.school_name && (
                        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-extrabold">
                          {data.school_name}
                        </span>
                      )}

                      {data?.request_title && (
                        <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-extrabold">
                          {data.request_title}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {unread && (
                      <span className="px-2 py-1 text-xs font-extrabold rounded-full bg-amber-100 text-amber-700">
                        Unread
                      </span>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotif(r.id);
                      }}
                      className="px-3 py-2 text-xs font-extrabold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Pagination */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-slate-200">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-2 text-xs font-extrabold rounded-xl bg-slate-100 text-slate-700 disabled:opacity-40"
          >
            Prev
          </button>

          <span className="text-xs text-slate-500">
            Page {page} / {totalPages}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-2 text-xs font-extrabold rounded-xl bg-slate-100 text-slate-700 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}