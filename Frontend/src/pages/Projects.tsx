import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

interface Project {
  request_id: number;
  school_id: number;
  request_title: string;
  category: string;
  quantity: number;
  estimated_price: number;
  amount_raised: number;
  description: string;
  image_url?: string;
  document_url?: string;
  status: string;
  school_name: string;
}

type Evidence = {
  id: number;
  file_url: string;
  file_type: "pdf" | "image" | string;
  note?: string | null;
  created_at?: string;
};

type SchoolMini = {
  school_id?: number | null;
  school_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  district?: string | null;
  province?: string | null;
  registration_no?: string | null;
};

type ProjectDetail = {
  request_id: number;
  school_id: number;
  school_name: string;
  request_title: string;
  category: string;
  quantity: number;
  estimated_price: number;
  amount_raised: number;
  description: string;
  image_url?: string | null;
  document_url?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  evidences: Evidence[];
  school?: SchoolMini;
};

interface ProjectsProps {}

const categories = ["All", "Technology", "Books", "Infrastructure", "Furniture", "Arts", "Sports"];

const API_HOST = "http://localhost:8000";
const API_URL = `${API_HOST}/api/donation_requests`;

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

const formatLKR = (n: number) => `LKR ${Number.isFinite(n) ? n.toLocaleString() : "0"}`;

const clampPercent = (raised: number, goal: number) => {
  const g = Number(goal) || 0;
  const r = Number(raised) || 0;
  if (g <= 0) return 0;
  return Math.max(0, Math.min(100, (r / g) * 100));
};

// ✅ Convert "/storage/..." to "http://localhost:8000/storage/..."
const toAbsoluteUrl = (u?: string | null) => {
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/")) return `${API_HOST}${u}`;
  return `${API_HOST}/${u}`;
};

const FALLBACK_IMG = "https://via.placeholder.com/900x600?text=No+Image";

const SkeletonCard = () => (
  <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] md:items-stretch gap-5 rounded-3xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
    <div className="h-44 md:h-full md:min-h-[220px] w-full rounded-2xl bg-slate-200 animate-pulse" />
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-6 w-24 rounded-full bg-slate-200 animate-pulse" />
        <div className="h-6 w-16 rounded-full bg-slate-200 animate-pulse" />
      </div>
      <div className="h-6 w-3/4 rounded bg-slate-200 animate-pulse" />
      <div className="h-4 w-full rounded bg-slate-200 animate-pulse" />
      <div className="h-4 w-5/6 rounded bg-slate-200 animate-pulse" />
      <div className="h-2 w-full rounded-full bg-slate-200 animate-pulse" />
      <div className="flex justify-between">
        <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
        <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
      </div>
      <div className="h-10 w-40 rounded-full bg-slate-200 animate-pulse" />
    </div>
  </div>
);

/** ---------- Auth helpers (Donor only) ---------- */
type AnyUser = {
  userType?: string;   // ✅ backend sends this
  role?: string;
  user_type?: string;
  type?: string;
  [k: string]: any;
};

const readUser = (): AnyUser | null => {
  try {
    const raw =
      localStorage.getItem("currentUser") ||
      localStorage.getItem("user") ||
      localStorage.getItem("authUser");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getRole = (u: AnyUser | null) => {
  if (!u) return "";
  return String(u.userType || u.role || u.user_type || u.type || "").toLowerCase();
};

const Projects: React.FC<ProjectsProps> = () => {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const projectsPerPage = 6;

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);

  // ✅ Simple toast message
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), 2600);
  };

  // ✅ Load current user
  const [currentUser, setCurrentUser] = useState<AnyUser | null>(() => readUser());
  useEffect(() => {
    const onStorage = () => setCurrentUser(readUser());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isDonor = getRole(currentUser) === "donor";

const donateGuard = (requestId: number) => {
  const redirectTo = `/donate/${requestId}`;

  if (!currentUser) {
    showToast("You need to login as a donor to donate.");
    openDonorLoginModal(redirectTo);
    return;
  }

  if (getRole(currentUser) !== "donor") {
    showToast("Only donors can donate.");
    return;
  }

  navigate(redirectTo);
};
// ✅ Put this ABOVE donateGuard (important)
const openDonorLoginModal = (redirectTo?: string) => {
  // ✅ close project drawer first
  closeDrawer();

  // store where to go after login
  if (redirectTo) sessionStorage.setItem("afterLoginRedirect", redirectTo);

  // open login modal (Layout listens to this event)
  window.dispatchEvent(
    new CustomEvent("openLoginModal", {
      detail: { redirectTo },
    })
  );
};


  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Smooth scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const response = await axios.get(API_URL, {
        params: { search: debouncedSearch, category, page, limit: projectsPerPage },
      });

      const list = response.data?.projects || [];
      const total = Number(response.data?.total || 0);

      setProjects(list);
      setTotalProjects(total);
      setTotalPages(Math.max(1, Math.ceil(total / projectsPerPage)));
    } catch (e) {
      console.error(e);
      setErrorMsg("Couldn’t load projects. Please try again.");
      setProjects([]);
      setTotalProjects(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, category, page]);

  // ESC close drawer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    if (drawerOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen]);

  // Show all page numbers
  const allPages = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages]);

  const onPickCategory = (cat: string) => {
    setCategory(cat);
    setPage(1);
  };

  const start = totalProjects === 0 ? 0 : (page - 1) * projectsPerPage + 1;
  const end = Math.min(page * projectsPerPage, totalProjects);

  const openDrawer = async (id: number) => {
    setSelectedId(id);
    setDrawerOpen(true);
    setDetail(null);
    setDetailErr(null);
    setDetailLoading(true);

    try {
      const res = await axios.get(`${API_URL}/${id}`);
      setDetail(res.data?.project || null);
    } catch (e) {
      console.error(e);
      setDetailErr("Couldn’t load details. Please try again.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedId(null);
    setDetail(null);
    setDetailErr(null);
    setDetailLoading(false);
  };

  const detailImg = detail?.image_url ? toAbsoluteUrl(detail.image_url) : selectedId ? FALLBACK_IMG : FALLBACK_IMG;

  const school = detail?.school;
  const schoolAddress = [school?.address, school?.district, school?.province].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ✅ Toast */}
      <div
        className={cx(
          "fixed z-[120] left-1/2 top-5 -translate-x-1/2 transition-all duration-300",
          toast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        )}
      >
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-sm font-semibold text-slate-800">
          {toast}
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-rose-50 via-white to-slate-50" />
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-indigo-200/30 blur-3xl" />

        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
                Verified school needs • Real impact
              </div>

              <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Explore Projects</h1>
              <p className="mt-3 text-slate-600 max-w-2xl">
                Support rural schools by donating to projects that address their specific needs. Browse by category,
                search quickly, and track funding progress in real time.
              </p>

              <div className="mt-6">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path d="M16.2 16.2 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by keyword, school name, or location…"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-12 py-3.5 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-rose-300 focus:ring-4 focus:ring-rose-200/50"
                  />
                </div>
              </div>
            </div>

            {/* Right side stats */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">Make a difference</div>
                    <div className="mt-1 text-xs text-slate-600">Donate to a project and track impact updates.</div>
                  </div>
                  <div className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 border border-rose-100">
                    Transparent funding
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-xs text-slate-500">Projects</div>
                    <div className="mt-1 text-lg font-black text-slate-900">{loading ? "…" : totalProjects}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-xs text-slate-500">Category</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900 truncate">{category}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-xs text-slate-500">Page</div>
                    <div className="mt-1 text-lg font-black text-slate-900">
                      {page}/{totalPages}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-slate-600">
                  Showing{" "}
                  <span className="font-extrabold text-slate-900">
                    {start}–{end}
                  </span>{" "}
                  of <span className="font-extrabold text-slate-900">{totalProjects}</span> projects
                </div>

             
                  
                
              </div>
            </div>
          </div>

          {/* Category pills */}
          <div className="mt-8 flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = cat === category;
              return (
                <button
                  key={cat}
                  onClick={() => onPickCategory(cat)}
                  className={cx(
                    "rounded-full px-4 py-2 text-sm font-bold border transition shadow-sm",
                    active
                      ? "bg-rose-600 text-white border-rose-600 hover:bg-rose-700"
                      : "bg-white text-slate-700 border-slate-200 hover:border-rose-200 hover:bg-rose-50"
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        {errorMsg && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="grid gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="text-4xl mb-3">🔎</div>
            <div className="text-slate-900 font-black text-xl">No projects found</div>
            <div className="text-slate-600 text-sm mt-1">Try another keyword or switch category.</div>
          </div>
        ) : (
          <div className="grid gap-5">
            {projects.map((proj) => {
              const percent = clampPercent(proj.amount_raised, proj.estimated_price);
              const img = proj.image_url ? toAbsoluteUrl(proj.image_url) : FALLBACK_IMG;

              return (
                <div
                  key={proj.request_id}
                  className="group grid grid-cols-1 md:grid-cols-[320px_1fr] md:items-stretch gap-5 rounded-3xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm hover:shadow-md transition"
                >
                  {/* Full-height image */}
                  <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 md:self-stretch h-full min-h-[220px]">
                    <img
                      src={img}
                      alt={proj.request_title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
                      }}
                    />
                    <div className="absolute left-3 top-3 flex items-center gap-2">
                      <span className="rounded-full bg-white/90 backdrop-blur px-3 py-1 text-xs font-extrabold text-slate-800 border border-white/60">
                        {proj.category}
                      </span>
                      <span className="rounded-full bg-slate-900/80 backdrop-blur px-3 py-1 text-xs font-bold text-white">
                        #{proj.request_id}
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 truncate">{proj.request_title}</h3>
                        <p className="mt-1 text-sm text-slate-600 truncate">{proj.school_name}</p>
                      </div>

                      <span
                        className={cx(
                          "rounded-full px-3 py-1 text-xs font-extrabold border",
                          String(proj.status).toLowerCase().includes("approved")
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        )}
                      >
                        {proj.status}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-slate-600 line-clamp-2">{proj.description}</p>

                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div className="font-semibold text-slate-700">
                          <span className="text-slate-900 font-black">{formatLKR(proj.amount_raised)}</span>{" "}
                          <span className="text-slate-500">raised</span>
                        </div>
                        <div className="text-slate-600">
                          Goal: <span className="font-extrabold text-slate-900">{formatLKR(proj.estimated_price)}</span>
                        </div>
                      </div>

                      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-rose-600 transition-[width] duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">{Math.round(percent)}% funded</span>
                        <span className="text-slate-500">
                          Qty: <span className="font-semibold">{proj.quantity}</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      {/* Drawer open */}
                      <button
                        onClick={() => openDrawer(proj.request_id)}
                        className="inline-flex items-center justify-center rounded-full bg-rose-600 px-5 py-2.5 text-sm font-black text-white hover:bg-rose-700 shadow-sm"
                      >
                        View Project <span className="ml-2">→</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={cx(
                "rounded-full px-4 py-2 text-sm font-bold border shadow-sm",
                page === 1
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              )}
            >
              Prev
            </button>

            {allPages.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cx(
                  "h-10 w-10 rounded-full text-sm font-black border shadow-sm transition",
                  page === p
                    ? "bg-rose-600 text-white border-rose-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-rose-50 hover:border-rose-200"
                )}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={cx(
                "rounded-full px-4 py-2 text-sm font-bold border shadow-sm",
                page === totalPages
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              )}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ================= Drawer ================= */}
      <div className={cx("fixed inset-0 z-[90]", drawerOpen ? "pointer-events-auto" : "pointer-events-none")}>
        {/* Backdrop */}
        <div
          onClick={closeDrawer}
          className={cx("absolute inset-0 bg-slate-900/35 transition-opacity duration-300", drawerOpen ? "opacity-100" : "opacity-0")}
        />

        {/* Panel */}
        <div
          className={cx(
            "absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-2xl border-l border-slate-200 transition-transform duration-300",
            drawerOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-200">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-500">Project Details</div>
              <div className="mt-1 text-lg font-black text-slate-900 truncate">
                {detailLoading ? "Loading…" : detail?.request_title || "—"}
              </div>
              <div className="mt-1 text-sm text-slate-600 truncate">{detail?.school_name || ""}</div>
            </div>

            <button
              onClick={closeDrawer}
              className="rounded-full border border-slate-200 bg-white h-10 w-10 grid place-items-center hover:bg-slate-50"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto h-[calc(100%-76px)]">
            {detailErr && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {detailErr}
              </div>
            )}

            {detailLoading ? (
              <div className="space-y-4">
                <div className="h-44 w-full rounded-2xl bg-slate-200 animate-pulse" />
                <div className="h-6 w-3/4 rounded bg-slate-200 animate-pulse" />
                <div className="h-4 w-full rounded bg-slate-200 animate-pulse" />
                <div className="h-4 w-5/6 rounded bg-slate-200 animate-pulse" />
              </div>
            ) : detail ? (
              <div className="space-y-5">
                {/* Image */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  <img
                    src={detailImg}
                    alt={detail.request_title}
                    className="w-full h-56 object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
                    }}
                  />
                  <div className="absolute left-3 top-3 flex gap-2">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold border border-white/60">
                      {detail.category}
                    </span>
                    <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold text-white">
                      #{detail.request_id}
                    </span>
                  </div>
                </div>

                {/* Funding */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-semibold text-slate-700">
                      <span className="text-slate-900 font-black">{formatLKR(detail.amount_raised)}</span>{" "}
                      <span className="text-slate-500">raised</span>
                    </div>
                    <div className="text-slate-600">
                      Goal: <span className="font-extrabold text-slate-900">{formatLKR(detail.estimated_price)}</span>
                    </div>
                  </div>

                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-rose-600 transition-[width] duration-500"
                      style={{ width: `${clampPercent(detail.amount_raised, detail.estimated_price)}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">
                      {Math.round(clampPercent(detail.amount_raised, detail.estimated_price))}% funded
                    </span>
                    <span className="text-slate-500">
                      Qty: <span className="font-semibold">{detail.quantity}</span>
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <div className="text-sm font-extrabold text-slate-900">Description</div>
                  <p className="mt-2 text-sm text-slate-600 whitespace-pre-line">{detail.description}</p>
                </div>

                {/* School info */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-extrabold text-slate-900">School</div>
                  <div className="mt-2 text-sm text-slate-700">
                    <div className="font-bold text-slate-900">{school?.school_name || detail.school_name}</div>

                    {schoolAddress ? (
                      <div className="mt-1 text-slate-600">📍 {schoolAddress}</div>
                    ) : (
                      <div className="mt-1 text-slate-400">No address</div>
                    )}

                    <div className="mt-3 grid gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Email</span>
                        <span className="font-semibold text-slate-900">{school?.contact_email || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Phone</span>
                        <span className="font-semibold text-slate-900">{school?.contact_phone || "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evidence */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-extrabold text-slate-900">Evidence</div>

                  {detail.evidences?.length ? (
                    <div className="mt-3 space-y-2">
                      {detail.evidences.slice(0, 6).map((e) => {
                        const url = toAbsoluteUrl(e.file_url);
                        const isPdf = String(e.file_type).toLowerCase().includes("pdf");
                        return (
                          <a
                            key={e.id}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 truncate">
                                {isPdf ? "PDF Document" : "Image Evidence"}
                              </div>
                              <div className="text-xs text-slate-500 truncate">{e.note || url}</div>
                            </div>
                            <span className="text-slate-400">↗</span>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-slate-500">No evidence uploaded yet.</div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  {/* ✅ Donor-only donate */}
                  <button
                    onClick={() => donateGuard(detail.request_id)}
                    className="inline-flex flex-1 items-center justify-center rounded-full bg-rose-600 px-5 py-3 text-sm font-black text-white hover:bg-rose-700 shadow-sm"
                  >
                    Donate Now 💖
                  </button>

                  {detail.document_url ? (
                    <a
                      href={toAbsoluteUrl(detail.document_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50"
                    >
                      View Document
                    </a>
                  ) : null}
                </div>

                {/* ✅ extra hint for non-donor */}
                {!currentUser ? (
                  <div className="text-xs text-slate-500">
                    To donate, please login as a <span className="font-bold">Donor</span>.
                  </div>
                ) : !isDonor ? (
                  <div className="text-xs text-amber-700">
                    Your account type is <span className="font-bold">{getRole(currentUser) || "unknown"}</span>. Only
                    donors can donate.
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-slate-500">Select a project to view details.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Projects;