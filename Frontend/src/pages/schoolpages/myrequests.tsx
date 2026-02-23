import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

/** ---------------- API ---------------- */
const API_BASE = "http://localhost:8000/api";
const REQUESTS_LIST_ENDPOINT = `${API_BASE}/donation_requests`;
const REQUEST_CREATE_ENDPOINT = `${API_BASE}/request/create`;
const SCHOOL_ME_ENDPOINT = `${API_BASE}/school/me`;

const REQUEST_UPDATE_ENDPOINT = (id: number) => `${API_BASE}/donation_requests/${id}/update`;

const EVIDENCE_LIST_ENDPOINT = (id: number) => `${API_BASE}/donation_requests/${id}/evidences`;
const EVIDENCE_UPLOAD_ENDPOINT = (id: number) => `${API_BASE}/donation_requests/${id}/evidences`;
const EVIDENCE_DELETE_ENDPOINT = (evidenceId: number) => `${API_BASE}/donation_request_evidences/${evidenceId}`;

/** ---------------- Types ---------------- */
type SchoolMeRes = {
  school: { school_id: number; school_name: string; verified?: number; status?: string };
};

type RequestRow = {
  request_id: number;
  school_id: number;
  school_name?: string;
  request_title: string;
  category: string;
  quantity: number;
  estimated_price: number;
  amount_raised: number;
  description: string;
  image_url?: string | null;
  document_url?: string | null;
  status: "Pending" | "Approved" | "Completed";
  created_at?: string;
};

type EvidenceRow = {
  id: number;
  request_id: number;
  file_url: string;
  file_type?: string | null; // image | pdf
  note?: string | null;
  created_at?: string;
};

type Summary = {
  total_requests: number;
  approved_count: number;
  pending_count: number;
  total_raised: number;
  total_target: number;
};

type RequestsListRes = {
  projects: RequestRow[];
  total: number;
  summary?: Summary;
};

/** ---------------- UI Helpers ---------------- */
const cx = (...s: Array<string | false | undefined | null>) => s.filter(Boolean).join(" ");

const Card: React.FC<{ children: any; className?: string }> = ({ children, className }) => (
  <div
    className={cx(
      "rounded-2xl border border-slate-200 bg-white",
      "shadow-[0_1px_0_rgba(15,23,42,0.03),0_10px_30px_rgba(15,23,42,0.06)]",
      "transition hover:shadow-[0_1px_0_rgba(15,23,42,0.03),0_18px_45px_rgba(15,23,42,0.10)] hover:-translate-y-[2px]",
      className
    )}
  >
    {children}
  </div>
);
const Pill: React.FC<{ children: any; className?: string }> = ({ children, className }) => (
  <span
    className={cx(
      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
      "shadow-[0_1px_0_rgba(15,23,42,0.03)]",
      className
    )}
  >
    {children}
  </span>
);
const progressBarClass = (pct: number) => {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 60) return "bg-sky-500";
  if (pct >= 30) return "bg-amber-500";
  return "bg-rose-500";
};

const Button: React.FC<{
  children: any;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  kind?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
}> = ({ children, onClick, className, disabled, kind = "secondary", type = "button" }) => {
  const base =
    "px-4 py-2 rounded-xl font-semibold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-[1px]";
  const styles =
    kind === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : kind === "danger"
      ? "bg-rose-600 text-white hover:bg-rose-700"
      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cx(base, styles, className)}>
      {children}
    </button>
  );
};

const Input: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  rightHint?: string;
  autoFocus?: boolean;
}> = ({ label, value, onChange, placeholder, type = "text", rightHint, autoFocus }) => (
  <label className="block">
    <div className="flex items-center justify-between mb-1">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      {rightHint ? <div className="text-[11px] text-slate-400">{rightHint}</div> : null}
    </div>
    <input
      data-autofocus={autoFocus ? "true" : undefined}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-slate-200/60"
    />
  </label>
);

const TextArea: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rightHint?: string;
  autoFocus?: boolean;
}> = ({ label, value, onChange, placeholder, rightHint, autoFocus }) => (
  <label className="block">
    <div className="flex items-center justify-between mb-1">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      {rightHint ? <div className="text-[11px] text-slate-400">{rightHint}</div> : null}
    </div>
    <textarea
      data-autofocus={autoFocus ? "true" : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-slate-200/60"
    />
  </label>
);

const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: any; wide?: boolean }> = ({
  open,
  onClose,
  title,
  children,
  wide,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const didAutoFocus = useRef(false);

  useEffect(() => {
    if (!open) {
      didAutoFocus.current = false;
      return;
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();

      if (e.key === "Tab") {
        const root = panelRef.current;
        if (!root) return;

        const focusables = root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);

    if (!didAutoFocus.current) {
      didAutoFocus.current = true;
      setTimeout(() => {
        const root = panelRef.current;
        if (!root) return;

        const target =
          root.querySelector<HTMLElement>('[data-autofocus="true"]') ||
          root.querySelector<HTMLElement>("input, textarea, select");

        target?.focus();
      }, 0);
    }

    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={panelRef}
          className={cx("w-full rounded-2xl bg-white shadow-xl border border-slate-200", wide ? "max-w-5xl" : "max-w-2xl")}
        >
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="text-sm font-extrabold text-slate-900">{title}</div>
            <button tabIndex={-1} onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close modal">
              ✕
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
};

const statusPill = (s?: string) => {
  const v = (s || "").toLowerCase();
  if (v === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (v === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
  if (v === "completed") return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
};

const money = (n: number) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(Number(n || 0));

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const safePct = (raised: number, target: number) => {
  const t = Number(target || 0);
  const r = Number(raised || 0);
  if (t <= 0) return 0;
  return Math.max(0, Math.min(100, (r / t) * 100));
};

const timeAgo = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

// ✅ make relative storage paths work
const resolveImageUrl = (url?: string | null) => {
  if (!url) return null;
  const u = String(url).trim();
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/")) return `http://localhost:8000${u}`;
  return `http://localhost:8000/${u}`;
};

/** ---------------- Page ---------------- */
const MyRequests: React.FC = () => {
  const [loading, setLoading] = useState(true);

  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [schoolName, setSchoolName] = useState<string>("");

  const [rows, setRows] = useState<RequestRow[]>([]);
  const [total, setTotal] = useState(0);

  const [summary, setSummary] = useState<Summary>({
    total_requests: 0,
    approved_count: 0,
    pending_count: 0,
    total_raised: 0,
    total_target: 0,
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [status, setStatus] = useState<string>("");
  const [sort, setSort] = useState<"recent" | "target" | "funded" | "progress">("recent");

  const [page, setPage] = useState(1);
  const limit = 6;

  const [msg, setMsg] = useState<string | null>(null);
  const [msgKind, setMsgKind] = useState<"info" | "success" | "error">("info");

  const toast = (text: string, kind: "info" | "success" | "error" = "info") => {
    setMsg(text);
    setMsgKind(kind);
  };

  // Create
  const [creating, setCreating] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);

  // View
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [selected, setSelected] = useState<RequestRow | null>(null);

  // Evidence (✅ MULTIPLE + INPUT RESET + SCROLL LIST)
  const [evidences, setEvidences] = useState<EvidenceRow[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidenceNote, setEvidenceNote] = useState("");
  const evidenceInputRef = useRef<HTMLInputElement | null>(null);

  // Edit
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // ✅ create form includes imageFile
  const [form, setForm] = useState({
    request_title: "",
    category: "Books",
    quantity: "1",
    estimated_price: "",
    description: "",
    document_url: "",
    imageFile: null as File | null,
  });

  // ✅ edit form
  const [editForm, setEditForm] = useState({
    request_title: "",
    category: "Books",
    quantity: "1",
    estimated_price: "",
    description: "",
    document_url: "",
    imageFile: null as File | null,
  });

  // Preview create
  const previewUrl = useMemo(() => {
    if (!form.imageFile) return "";
    return URL.createObjectURL(form.imageFile);
  }, [form.imageFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Preview edit
  const editPreviewUrl = useMemo(() => {
    if (!editForm.imageFile) return "";
    return URL.createObjectURL(editForm.imageFile);
  }, [editForm.imageFile]);

  useEffect(() => {
    return () => {
      if (editPreviewUrl) URL.revokeObjectURL(editPreviewUrl);
    };
  }, [editPreviewUrl]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const overallPct = useMemo(() => {
    const t = Number(summary.total_target || 0);
    const r = Number(summary.total_raised || 0);
    if (t <= 0) return 0;
    return Math.round((r / t) * 100);
  }, [summary.total_target, summary.total_raised]);

  // auto hide toast
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2800);
    return () => clearTimeout(t);
  }, [msg]);

  const fetchSchoolMe = async () => {
    const res = await axios.get(SCHOOL_ME_ENDPOINT, { withCredentials: true });
    const s = (res.data as SchoolMeRes).school;
    setSchoolId(s.school_id);
    setSchoolName(s.school_name || "My School");
  };

  const fetchList = async (p = page) => {
    setLoading(true);
    try {
      if (!schoolId) await fetchSchoolMe();

      const res = await axios.get<RequestsListRes>(REQUESTS_LIST_ENDPOINT, {
        params: {
          search: search || "",
          category: category || "All",
          status: status || null,
          page: p,
          limit,
        },
        withCredentials: true,
      });

      setRows(res.data.projects || []);
      setTotal(res.data.total || 0);

      if (res.data.summary) {
        setSummary({
          total_requests: Number(res.data.summary.total_requests || 0),
          approved_count: Number(res.data.summary.approved_count || 0),
          pending_count: Number(res.data.summary.pending_count || 0),
          total_raised: Number(res.data.summary.total_raised || 0),
          total_target: Number(res.data.summary.total_target || 0),
        });
      }
    } catch (e: any) {
      console.error("LIST ERROR:", e);
      setRows([]);
      setTotal(0);
      toast(e?.response?.data?.message || "Failed to load requests", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refetch on filters
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchList(1);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, status]);

  const fetchEvidences = async (requestId: number) => {
    setEvidenceLoading(true);
    try {
      const res = await axios.get(EVIDENCE_LIST_ENDPOINT(requestId), { withCredentials: true });
      setEvidences(res.data?.evidences || res.data?.data || []);
    } catch (e: any) {
      console.error("EVIDENCE LIST ERROR:", e);
      setEvidences([]);
    } finally {
      setEvidenceLoading(false);
    }
  };

  // ✅ Upload multiple files (backend expects "files")
  const uploadEvidence = async () => {
    if (!selected?.request_id) return;

    if (!evidenceFiles || evidenceFiles.length === 0) {
      toast("Please choose at least 1 file (image/pdf).", "error");
      return;
    }

    setEvidenceUploading(true);
    try {
      const fd = new FormData();
      evidenceFiles.forEach((f) => fd.append("files[]", f)); // ✅ Laravel multiple

      if (evidenceNote.trim()) fd.append("note", evidenceNote.trim());

      await axios.post(EVIDENCE_UPLOAD_ENDPOINT(selected.request_id), fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast("✅ Evidence uploaded!", "success");

      // ✅ reset UI
      setEvidenceFiles([]);
      setEvidenceNote("");
      if (evidenceInputRef.current) evidenceInputRef.current.value = "";

      await fetchEvidences(selected.request_id);
    } catch (e: any) {
      console.error("EVIDENCE UPLOAD ERROR:", e);
      const errs = e?.response?.data?.errors;
      if (errs) {
        const firstKey = Object.keys(errs)[0];
        toast(errs[firstKey]?.[0] || "Upload failed", "error");
      } else {
        toast(e?.response?.data?.message || "Upload failed", "error");
      }
    } finally {
      setEvidenceUploading(false);
    }
  };

  const deleteEvidence = async (evidenceId: number) => {
    const ok = window.confirm("Delete this evidence?");
    if (!ok) return;

    try {
      await axios.delete(EVIDENCE_DELETE_ENDPOINT(evidenceId), { withCredentials: true });
      toast("✅ Evidence deleted", "success");
      if (selected?.request_id) await fetchEvidences(selected.request_id);
    } catch (e: any) {
      console.error("EVIDENCE DELETE ERROR:", e);
      toast(e?.response?.data?.message || "Delete failed", "error");
    }
  };

  const openView = async (id: number) => {
    setViewOpen(true);
    setViewLoading(true);
    setSelected(null);
    setEvidences([]);
    setEvidenceFiles([]);
    setEvidenceNote("");
    if (evidenceInputRef.current) evidenceInputRef.current.value = "";

    try {
      const res = await axios.get(`${REQUESTS_LIST_ENDPOINT}/${id}`, { withCredentials: true });
      const project = res.data?.project || res.data?.data || res.data?.request;
      if (!project) throw new Error("No project key in response");
      setSelected(project as RequestRow);
      await fetchEvidences(id);
    } catch (e: any) {
      console.error("VIEW ERROR:", e);
      toast(e?.response?.data?.message || e?.message || "Failed to load request details", "error");
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const openEdit = (r: RequestRow) => {
    setEditId(r.request_id);
    setEditForm({
      request_title: r.request_title || "",
      category: r.category || "Books",
      quantity: String(r.quantity ?? 1),
      estimated_price: String(r.estimated_price ?? ""),
      description: r.description || "",
      document_url: r.document_url || "",
      imageFile: null,
    });
    setEditing(true);
  };

  const resetCreate = () => {
    setForm({
      request_title: "",
      category: "Books",
      quantity: "1",
      estimated_price: "",
      description: "",
      document_url: "",
      imageFile: null,
    });
  };

  const canCreate = useMemo(() => Boolean(form.request_title.trim() && form.description.trim() && form.estimated_price), [form]);
  const canEdit = useMemo(() => Boolean(editForm.request_title.trim() && editForm.description.trim() && editForm.estimated_price), [editForm]);

  // ✅ multipart create
  const createRequest = async () => {
    setSavingCreate(true);

    if (!schoolId) {
      setSavingCreate(false);
      toast("School not authenticated", "error");
      return;
    }

    if (!canCreate) {
      setSavingCreate(false);
      toast("Please fill Title, Description and Estimated Price.", "error");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("school_id", String(schoolId));
      fd.append("request_title", form.request_title.trim());
      fd.append("category", form.category);
      fd.append("quantity", String(Number(form.quantity || 1)));
      fd.append("estimated_price", String(Number(form.estimated_price)));
      fd.append("description", form.description.trim());
      if (form.document_url.trim()) fd.append("document_url", form.document_url.trim());
      if (form.imageFile) fd.append("image", form.imageFile);

      await axios.post(REQUEST_CREATE_ENDPOINT, fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      setCreating(false);
      resetCreate();
      setPage(1);
      await fetchList(1);
      toast("✅ Request created successfully!", "success");
    } catch (e: any) {
      console.error("CREATE ERROR:", e);
      const errs = e?.response?.data?.errors;
      if (errs) {
        const firstKey = Object.keys(errs)[0];
        toast(errs[firstKey]?.[0] || "Create failed", "error");
      } else {
        toast(e?.response?.data?.message || "Create failed", "error");
      }
    } finally {
      setSavingCreate(false);
    }
  };

  // ✅ multipart update
  const updateRequest = async () => {
    if (!editId) return;

    setSavingEdit(true);

    if (!schoolId) {
      setSavingEdit(false);
      toast("School not authenticated", "error");
      return;
    }

    if (!canEdit) {
      setSavingEdit(false);
      toast("Please fill Title, Description and Estimated Price.", "error");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("school_id", String(schoolId));
      fd.append("request_title", editForm.request_title.trim());
      fd.append("category", editForm.category);
      fd.append("quantity", String(Number(editForm.quantity || 1)));
      fd.append("estimated_price", String(Number(editForm.estimated_price)));
      fd.append("description", editForm.description.trim());
      if (editForm.document_url.trim()) fd.append("document_url", editForm.document_url.trim());
      if (editForm.imageFile) fd.append("image", editForm.imageFile);

      await axios.post(REQUEST_UPDATE_ENDPOINT(editId), fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast("✅ Updated successfully!", "success");
      setEditing(false);
      setEditId(null);
      await fetchList(page);
    } catch (e: any) {
      console.error("UPDATE ERROR:", e);
      toast(e?.response?.data?.message || "Update failed", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const askDelete = (id: number) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const doDelete = async () => {
    if (!deleteId) return;
    setDeleteBusy(true);
    try {
      await axios.delete(`${REQUESTS_LIST_ENDPOINT}/${deleteId}`, { withCredentials: true });
      setDeleteOpen(false);
      setDeleteId(null);
      await fetchList(page);
      toast("✅ Deleted", "success");
    } catch (e: any) {
      console.error("DELETE ERROR:", e);
      toast(e?.response?.data?.message || "Delete failed", "error");
    } finally {
      setDeleteBusy(false);
    }
  };

  const goPage = async (p: number) => {
    const next = clamp(p, 1, totalPages);
    setPage(next);
    await fetchList(next);
  };

  const sortedRows = useMemo(() => {
    const arr = [...rows];
    if (sort === "target") arr.sort((a, b) => Number(b.estimated_price || 0) - Number(a.estimated_price || 0));
    else if (sort === "funded") arr.sort((a, b) => Number(b.amount_raised || 0) - Number(a.amount_raised || 0));
    else if (sort === "progress") arr.sort((a, b) => safePct(b.amount_raised, b.estimated_price) - safePct(a.amount_raised, a.estimated_price));
    else {
      arr.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
    }
    return arr;
  }, [rows, sort]);

  const toastStyles =
    msgKind === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : msgKind === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-slate-200 bg-white text-slate-700";

  return (
    <div className="relative min-h-[calc(100vh-80px)] pb-12">
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
      <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 opacity-80" />

      {/* Toast */}
      {msg && (
        <div className="fixed top-4 right-4 z-[9999] max-w-sm">
          <div className={cx("rounded-2xl border px-4 py-3 shadow-lg text-sm", toastStyles)}>
            <div className="flex items-start gap-2">
              <div className="mt-0.5">{msgKind === "success" ? "✅" : msgKind === "error" ? "⚠️" : "ℹ️"}</div>
              <div className="flex-1">{msg}</div>
              <button className="text-slate-400 hover:text-slate-700" onClick={() => setMsg(null)} aria-label="Close toast">
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="pt-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-slate-900">My Requests</div>
            <div className="text-sm text-slate-600 mt-1">
              Create and manage your donation requests for <span className="font-semibold">{schoolName || "your school"}</span>.
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Pill className="bg-white text-slate-700 border-slate-200">Total: {summary.total_requests || total}</Pill>
              <Pill className="bg-white text-slate-700 border-slate-200">
                Page: {page}/{totalPages}
              </Pill>
              <Pill className="bg-white text-slate-700 border-slate-200">Approved: {summary.approved_count}</Pill>
              <Pill className="bg-white text-slate-700 border-slate-200">Pending: {summary.pending_count}</Pill>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => fetchList(page)} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button kind="primary" onClick={() => setCreating(true)}>
              + New Request
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-5">
            <div className="text-xs text-slate-500">Total Raised</div>
            <div className="mt-1 text-xl font-extrabold text-slate-900">{money(summary.total_raised)}</div>
          </Card>

          <Card className="p-5">
            <div className="text-xs text-slate-500">Total Target</div>
            <div className="mt-1 text-xl font-extrabold text-slate-900">{money(summary.total_target)}</div>
          </Card>

          <Card className="p-5">
            <div className="text-xs text-slate-500">Funding Progress</div>
            <div className="mt-1 flex items-end gap-2">
              <div className="text-xl font-extrabold text-slate-900">{overallPct}%</div>
              <div className="text-xs text-slate-500 mb-1">overall</div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
             <div
  className={cx("h-full transition-all", progressBarClass(overallPct))}
  style={{ width: `${clamp(overallPct, 0, 100)}%` }}
/>
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-xs text-slate-500">Quick Tips</div>
            <div className="mt-2 text-sm text-slate-700 font-semibold">Upload an image</div>
            <div className="text-[11px] text-slate-500">Images increase trust and attention.</div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Input label="Search" value={search} onChange={setSearch} placeholder="Title / Description..." />

            <label className="block">
              <div className="text-xs font-semibold text-slate-600 mb-1">Category</div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-slate-200/60"
              >
                <option value="All">All</option>
                <option value="Books">Books</option>
                <option value="Stationery">Stationery</option>
                <option value="Furniture">Furniture</option>
                <option value="Sports">Sports</option>
                <option value="Lab">Lab</option>
                <option value="ICT">ICT</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label className="block">
              <div className="text-xs font-semibold text-slate-600 mb-1">Status</div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-slate-200/60"
              >
                <option value="">All</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </label>

            <label className="block">
              <div className="text-xs font-semibold text-slate-600 mb-1">Sort</div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-slate-200/60"
              >
                <option value="recent">Most Recent</option>
                <option value="target">Highest Target</option>
                <option value="funded">Most Raised</option>
                <option value="progress">Highest Progress</option>
              </select>
            </label>

            <div className="flex items-end gap-2">
              <Button
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                  setStatus("");
                  setSort("recent");
                }}
                className="w-full"
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* List */}
      <div className="mt-6">
        {loading ? (
          <div className="text-slate-500 text-center py-10">Loading…</div>
        ) : sortedRows.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="text-4xl mb-3">📌</div>
            <div className="text-slate-900 font-extrabold text-xl">No requests found</div>
            <Button kind="primary" className="mt-6" onClick={() => setCreating(true)}>
              + New Request
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedRows.map((r) => {
              const pct = safePct(r.amount_raised, r.estimated_price);
              const isFull = pct >= 100;
              const remaining = Math.max(0, Number(r.estimated_price || 0) - Number(r.amount_raised || 0));
              const imgSrc = resolveImageUrl(r.image_url);

              return (
                <Card key={r.request_id} className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="text-sm font-extrabold text-slate-900 truncate">{r.request_title}</div>
                        {isFull ? <Pill className="bg-emerald-50 text-emerald-700 border-emerald-200">Fully Funded</Pill> : null}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <Pill className="bg-white text-slate-700 border-slate-200">{r.category}</Pill>
                        <Pill className={statusPill(r.status)}>{r.status}</Pill>
                        {r.created_at ? <Pill className="bg-white text-slate-500 border-slate-200">🕒 {timeAgo(r.created_at)}</Pill> : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {r.status !== "Approved" && r.status !== "Completed" ? (
                        <button onClick={() => openEdit(r)} className="text-slate-400 hover:text-slate-900" title="Edit">
                          ✏️
                        </button>
                      ) : null}

                      {r.status !== "Approved" && r.status !== "Completed" ? (
                        <button onClick={() => askDelete(r.request_id)} className="text-slate-400 hover:text-rose-600" title="Delete">
                          🗑️
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {imgSrc ? (
                    <div className="mt-4">
                      <img
                        src={imgSrc}
                        alt={r.request_title}
                        className="w-full h-36 object-cover rounded-2xl border border-slate-200 bg-slate-50"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Raised</span>
                      <span className="font-semibold text-slate-900">{money(Number(r.amount_raised || 0))}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Target</span>
                      <span className="font-semibold text-slate-900">{money(Number(r.estimated_price || 0))}</span>
                    </div>

                   <div className="mt-2 h-2.5 rounded-full bg-slate-200/70 overflow-hidden shadow-inner">
                    <div
  className={cx("h-full transition-all duration-500", progressBarClass(pct))}
  style={{ width: `${pct}%` }}
/>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{pct.toFixed(0)}% funded</span>
                      {!isFull ? <span>Remaining: {money(remaining)}</span> : <span>Goal reached</span>}
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-slate-600 line-clamp-3">{r.description}</div>

                  <div className="mt-5">
                    <Button onClick={() => openView(r.request_id)} className="w-full">
                      View Details
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {sortedRows.length > 0 && !loading && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button onClick={() => goPage(1)} disabled={page <= 1}>
              {"<<"}
            </Button>
            <Button onClick={() => goPage(page - 1)} disabled={page <= 1}>
              Prev
            </Button>
            <div className="px-3 py-2 text-sm text-slate-700">
              Page <b>{page}</b> / {totalPages}
            </div>
            <Button onClick={() => goPage(page + 1)} disabled={page >= totalPages}>
              Next
            </Button>
            <Button onClick={() => goPage(totalPages)} disabled={page >= totalPages}>
              {">>"}
            </Button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={creating} onClose={() => setCreating(false)} title="Create New Request">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input autoFocus label="Title *" value={form.request_title} onChange={(v) => setForm({ ...form, request_title: v })} />
          <label className="block">
            <div className="text-xs font-semibold text-slate-600 mb-1">Category *</div>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-slate-200/60"
            >
              <option value="Books">Books</option>
              <option value="Stationery">Stationery</option>
              <option value="Furniture">Furniture</option>
              <option value="Sports">Sports</option>
              <option value="Lab">Lab</option>
              <option value="ICT">ICT</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <Input label="Quantity *" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} />
          <Input label="Estimated Price (LKR) *" type="number" value={form.estimated_price} onChange={(v) => setForm({ ...form, estimated_price: v })} />

          <div className="md:col-span-2">
            <TextArea label="Description *" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-slate-600 mb-1">Upload Image (optional)</div>
            <input
              type="file"
              accept="image/*"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-slate-200/60"
              onChange={(e) => setForm((prev) => ({ ...prev, imageFile: e.target.files?.[0] || null }))}
            />
          </div>

          <Input label="Document URL (optional)" value={form.document_url} onChange={(v) => setForm({ ...form, document_url: v })} />
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button onClick={() => setCreating(false)}>Cancel</Button>
          <Button kind="primary" onClick={createRequest} disabled={savingCreate || !canCreate}>
            {savingCreate ? "Creating..." : "Create"}
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Request">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input autoFocus label="Title *" value={editForm.request_title} onChange={(v) => setEditForm({ ...editForm, request_title: v })} />

          <label className="block">
            <div className="text-xs font-semibold text-slate-600 mb-1">Category *</div>
            <select
              value={editForm.category}
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-slate-200/60"
            >
              <option value="Books">Books</option>
              <option value="Stationery">Stationery</option>
              <option value="Furniture">Furniture</option>
              <option value="Sports">Sports</option>
              <option value="Lab">Lab</option>
              <option value="ICT">ICT</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <Input label="Quantity *" type="number" value={editForm.quantity} onChange={(v) => setEditForm({ ...editForm, quantity: v })} />
          <Input label="Estimated Price (LKR) *" type="number" value={editForm.estimated_price} onChange={(v) => setEditForm({ ...editForm, estimated_price: v })} />

          <div className="md:col-span-2">
            <TextArea label="Description *" value={editForm.description} onChange={(v) => setEditForm({ ...editForm, description: v })} />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-slate-600 mb-1">Replace Image (optional)</div>
            <input
              type="file"
              accept="image/*"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-slate-200/60"
              onChange={(e) => setEditForm((prev) => ({ ...prev, imageFile: e.target.files?.[0] || null }))}
            />
            {editForm.imageFile ? (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
                <img src={editPreviewUrl} alt="Preview" className="w-full h-48 object-cover" />
              </div>
            ) : null}
          </div>

          <Input label="Document URL (optional)" value={editForm.document_url} onChange={(v) => setEditForm({ ...editForm, document_url: v })} placeholder="https://..." />
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button onClick={() => setEditing(false)}>Cancel</Button>
          <Button kind="primary" onClick={updateRequest} disabled={savingEdit || !canEdit}>
            {savingEdit ? "Saving..." : "Update"}
          </Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={viewOpen} onClose={() => setViewOpen(false)} title="Request Details" wide>
        {viewLoading ? (
          <div className="text-slate-500 py-10 text-center">Loading…</div>
        ) : !selected ? (
          <div className="text-slate-500 py-10 text-center">No data</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-6 lg:col-span-2">
              <div className="text-xl font-extrabold text-slate-900">{selected.request_title}</div>

              <div className="mt-2 flex flex-wrap gap-2">
                <Pill className="bg-white text-slate-700 border-slate-200">{selected.category}</Pill>
                <Pill className={statusPill(selected.status)}>{selected.status}</Pill>
                <Pill className="bg-white text-slate-700 border-slate-200">Qty: {selected.quantity}</Pill>
              </div>

              {resolveImageUrl(selected.image_url) ? (
                <div className="mt-5">
                  <img
                    src={resolveImageUrl(selected.image_url)!}
                    alt={selected.request_title}
                    className="w-full h-64 object-cover rounded-2xl border border-slate-200 bg-slate-50"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              ) : null}

              <div className="mt-5 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{selected.description}</div>
            </Card>

            <div className="space-y-4">
              <Card className="p-6">
                <div className="text-sm font-extrabold text-slate-900">Links</div>
                <div className="mt-3 space-y-2 text-sm">
                  {selected.image_url ? (
                    <a className="text-slate-900 font-semibold hover:underline" href={resolveImageUrl(selected.image_url)!} target="_blank" rel="noreferrer">
                      Open image ↗
                    </a>
                  ) : (
                    <div className="text-slate-500">No image</div>
                  )}

                  {selected.document_url ? (
                    <a className="text-slate-900 font-semibold hover:underline" href={selected.document_url} target="_blank" rel="noreferrer">
                      Open document ↗
                    </a>
                  ) : (
                    <div className="text-slate-500">No document</div>
                  )}
                </div>
              </Card>

              {/* ✅ Evidence Upload + List (FIXED + SCROLL + RESET INPUT) */}
              <Card className="p-6">
                <div className="text-sm font-extrabold text-slate-900">Upload Evidence</div>

                <div className="mt-3 space-y-3">
                  <input
                    ref={evidenceInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-slate-200/60"
                    onChange={(e) => setEvidenceFiles(Array.from(e.target.files || []))}
                  />

                  {evidenceFiles.length > 0 ? (
                    <div className="text-xs text-slate-600">
                      Selected: <b>{evidenceFiles.length}</b> file(s)
                    </div>
                  ) : null}

                  <input
                    value={evidenceNote}
                    onChange={(e) => setEvidenceNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-slate-200/60"
                  />

                  <Button kind="primary" className="w-full" onClick={uploadEvidence} disabled={evidenceUploading}>
                    {evidenceUploading ? "Uploading..." : "Upload Evidence"}
                  </Button>

                  <div className="pt-2 border-t border-slate-200">
                    <div className="text-xs font-semibold text-slate-600 mb-2">Uploaded Files</div>

                    {evidenceLoading ? (
                      <div className="text-slate-500 text-sm">Loading…</div>
                    ) : evidences.length === 0 ? (
                      <div className="text-slate-500 text-sm">No evidences uploaded yet.</div>
                    ) : (
                      <div className="max-h-64 overflow-auto pr-1 space-y-2">
                        {evidences.map((ev) => {
                          const url = resolveImageUrl(ev.file_url) || ev.file_url;
                          const isPdf = (ev.file_type || "").toLowerCase() === "pdf" || url.toLowerCase().endsWith(".pdf");
                          return (
                            <div key={ev.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-900 truncate">{isPdf ? "📄 PDF Evidence" : "🖼️ Image Evidence"}</div>
                                {ev.note ? <div className="text-xs text-slate-500 truncate">{ev.note}</div> : null}
                                <a className="text-xs text-slate-700 underline" href={url} target="_blank" rel="noreferrer">
                                  Open ↗
                                </a>
                              </div>

                              <button className="text-rose-600 font-semibold text-sm" onClick={() => deleteEvidence(ev.id)}>
                                Delete
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-sm font-extrabold text-slate-900">Actions</div>
                <div className="mt-3 space-y-2">
                  {selected.status !== "Approved" && selected.status !== "Completed" ? (
                    <Button kind="danger" onClick={() => askDelete(selected.request_id)} className="w-full">
                      Delete Request
                    </Button>
                  ) : (
                    <div className="text-xs text-slate-500">Approved/Completed requests cannot be deleted.</div>
                  )}

                  <Button onClick={() => setViewOpen(false)} className="w-full">
                    Close
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal open={deleteOpen} onClose={() => (deleteBusy ? null : setDeleteOpen(false))} title="Confirm Delete">
        <div className="text-sm text-slate-700">Are you sure you want to delete this request? This action cannot be undone.</div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button onClick={() => setDeleteOpen(false)} disabled={deleteBusy}>
            Cancel
          </Button>
          <Button kind="danger" onClick={doDelete} disabled={deleteBusy}>
            {deleteBusy ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default MyRequests;