import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const API_ME = "http://localhost:8000/api/school/me"; // GET + POST

type School = {
  school_id: number;
  school_name: string;
  registration_no?: string | null;
  verified?: number;
  status?: string;
  need_score?: number;
  document_link?: string | null;
  logo_link?: string | null;
  contact_email?: string | null;
  category?: string | null;
  level?: string | null;
};

const cx = (...s: Array<string | false | undefined | null>) => s.filter(Boolean).join(" ");

function formatBytes(bytes: number) {
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes || 1) / Math.log(1024)));
  const v = bytes / Math.pow(1024, i);
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function isImg(f: File) {
  return /^image\/(png|jpe?g|webp)$/i.test(f.type);
}
function isDoc(f: File) {
  return f.type === "application/pdf" || /^image\/(png|jpe?g|webp)$/i.test(f.type);
}

const Card: React.FC<{ children: any; className?: string }> = ({ children, className }) => (
  <div className={cx("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>{children}</div>
);

const Pill: React.FC<{ children: any; className?: string }> = ({ children, className }) => (
  <span className={cx("inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold", className)}>
    {children}
  </span>
);

const statusPill = (s?: string) => {
  const v = (s || "inactive").toLowerCase();
  if (v === "active") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (v === "inactive") return "bg-slate-50 text-slate-700 border-slate-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

export default function SchoolDocuments() {
  const api = useMemo(
    () =>
      axios.create({
        withCredentials: true,
        headers: { Accept: "application/json" },
      }),
    []
  );

  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pct, setPct] = useState(0);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const logoInput = useRef<HTMLInputElement | null>(null);
  const docInput = useRef<HTMLInputElement | null>(null);

  const isLocked = Number(school?.verified || 0) === 1;

  const logoPreview = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : null), [logoFile]);
  useEffect(() => {
  return () => {
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
  };
}, [logoPreview]);

  const fetchMe = async () => {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.get(API_ME);
      setSchool(res.data.school);
    } catch (e: any) {
      setSchool(null);
      setErr(e?.response?.data?.message || "Unauthenticated. Please login as school.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateFiles = () => {
    // size limits (match your backend: logo 4MB, doc 5MB)
    if (logoFile) {
      if (!isImg(logoFile)) return "Logo must be JPG/PNG/WEBP.";
      if (logoFile.size > 4 * 1024 * 1024) return "Logo is too large (max 4MB).";
    }
    if (docFile) {
      if (isLocked) return "Document upload is locked after verification.";
      if (!isDoc(docFile)) return "Document must be PDF or image (JPG/PNG/WEBP).";
      if (docFile.size > 5 * 1024 * 1024) return "Document is too large (max 5MB).";
    }
    return null;
  };

  const onSave = async () => {
    if (!school) return;

    setSaving(true);
    setPct(0);
    setErr(null);
    setMsg(null);

    const v = validateFiles();
    if (v) {
      setSaving(false);
      setErr(v);
      return;
    }

    try {
      const fd = new FormData();

      // ✅ keep backend validation happy (required fields in updateMe)
      fd.append("school_name", school.school_name || "");
      fd.append("contact_email", school.contact_email || "");
      fd.append("category", school.category || "Primary");
      fd.append("level", school.level || "All");

      // ✅ files
      if (logoFile) fd.append("logo", logoFile);
      if (!isLocked && docFile) fd.append("document", docFile);

      const res = await api.post(API_ME, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (p) => {
          if (!p.total) return;
          setPct(Math.round((p.loaded / p.total) * 100));
        },
      });

      setSchool(res.data.school);
      setLogoFile(null);
      setDocFile(null);
      setMsg("Uploaded successfully.");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Upload failed.");
    } finally {
      setSaving(false);
      setTimeout(() => setPct(0), 700);
    }
  };

  // drag & drop
  const onDropLogo = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setErr(null);
    setLogoFile(f);
  };
  const onDropDoc = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setErr(null);
    setDocFile(f);
  };

  if (loading) {
    return <div className="p-6 text-slate-500">Loading…</div>;
  }

  if (!school) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="p-6">
          <div className="text-xl font-extrabold text-slate-900">Documents</div>
          <div className="mt-2 text-sm text-rose-700 font-semibold">{err || "Unauthenticated"}</div>
          <button
            onClick={fetchMe}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white font-extrabold hover:bg-black"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  const dirty = !!logoFile || !!docFile;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="text-2xl font-extrabold text-slate-900">School Documents</div>
          <div className="text-sm text-slate-500">
            Upload logo and verification document. Document upload is locked after verification.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill className={statusPill(school.status)}>{(school.status || "inactive").toUpperCase()}</Pill>
          <Pill className={school.verified ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-700 border-slate-200"}>
            {school.verified ? "VERIFIED" : "NOT VERIFIED"}
          </Pill>
          {isLocked && <Pill className="bg-slate-900 text-white border-slate-900">🔒 LOCKED</Pill>}
        </div>
      </div>

      {/* Alerts */}
      {msg && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 font-semibold">{msg}</div>}
      {err && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 font-semibold">{err}</div>}

      {/* Progress */}
      {saving && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-extrabold text-slate-600 mb-1">
            <span>Uploading</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-slate-900" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="mt-5 grid md:grid-cols-2 gap-4">
        {/* Logo card */}
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Logo</div>
              <div className="text-xs text-slate-500">JPG/PNG/WEBP · max 4MB</div>
            </div>
            {school.logo_link && (
              <a href={school.logo_link} target="_blank" rel="noreferrer" className="text-xs font-extrabold text-slate-900 underline">
                Open current
              </a>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-16 w-16 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
              {logoPreview ? (
                <img src={logoPreview} className="h-full w-full object-cover" />
              ) : school.logo_link ? (
                <img src={school.logo_link} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-extrabold text-slate-400">LOGO</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-900 truncate">{logoFile ? logoFile.name : "No new logo selected"}</div>
              <div className="text-xs text-slate-500">{logoFile ? formatBytes(logoFile.size) : "Drop a new logo here"}</div>
            </div>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDropLogo}
            className={cx(
              "mt-4 rounded-2xl border-2 border-dashed p-4 text-center transition",
              logoFile ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
            )}
          >
            <input
              ref={logoInput}
              className="hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            />
            <div className="text-sm font-extrabold text-slate-900">{logoFile ? "Logo selected" : "Drag & drop logo"}</div>
            <div className="text-xs text-slate-500 mt-1">or click below</div>

            <div className="mt-3 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => logoInput.current?.click()}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-extrabold hover:bg-slate-50"
              >
                Choose file
              </button>
              {logoFile && (
                <button
                  type="button"
                  onClick={() => setLogoFile(null)}
                  className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs font-extrabold text-rose-700 hover:bg-rose-100"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Document card */}
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Verification Document</div>
              <div className="text-xs text-slate-500">PDF/JPG/PNG/WEBP · max 5MB</div>
            </div>
            {school.document_link && (
              <a href={school.document_link} target="_blank" rel="noreferrer" className="text-xs font-extrabold text-slate-900 underline">
                Open current
              </a>
            )}
          </div>

          {isLocked && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              🔒 Document upload is locked after verification.
            </div>
          )}

          <div className="mt-4">
            <div className="text-sm font-extrabold text-slate-900">
              {docFile ? docFile.name : school.document_link ? "Current document exists" : "No document uploaded"}
            </div>
            <div className="text-xs text-slate-500 mt-1">{docFile ? formatBytes(docFile.size) : "Upload a clear registration document."}</div>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={isLocked ? (e) => e.preventDefault() : onDropDoc}
            className={cx(
              "mt-4 rounded-2xl border-2 border-dashed p-4 text-center transition",
              isLocked ? "border-slate-200 bg-slate-100 opacity-70 cursor-not-allowed" : docFile ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
            )}
          >
            <input
              ref={docInput}
              className="hidden"
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              disabled={isLocked}
              onChange={(e) => setDocFile(e.target.files?.[0] || null)}
            />
            <div className="text-sm font-extrabold text-slate-900">
              {isLocked ? "Locked" : docFile ? "Document selected" : "Drag & drop document"}
            </div>
            <div className="text-xs text-slate-500 mt-1">{isLocked ? "Verified schools cannot change documents." : "or click below"}</div>

            <div className="mt-3 flex justify-center gap-2">
              <button
                type="button"
                disabled={isLocked}
                onClick={() => docInput.current?.click()}
                className={cx(
                  "px-3 py-2 rounded-xl border text-xs font-extrabold",
                  isLocked ? "bg-slate-200 border-slate-200 text-slate-500 cursor-not-allowed" : "bg-white border-slate-200 hover:bg-slate-50"
                )}
              >
                Choose file
              </button>
              {docFile && !isLocked && (
                <button
                  type="button"
                  onClick={() => setDocFile(null)}
                  className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs font-extrabold text-rose-700 hover:bg-rose-100"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500">{dirty ? "You have unsaved changes" : "No pending changes"}</div>
        <div className="flex gap-2">
          <button
            onClick={fetchMe}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-extrabold hover:bg-slate-50 disabled:opacity-60"
          >
            Refresh
          </button>
          <button
            onClick={onSave}
            disabled={saving || !dirty}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-extrabold hover:bg-black disabled:opacity-50"
          >
            {saving ? "Uploading..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}