import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

/** ---------- Types ---------- */
type SchoolMeRes = {
  school: {
    school_id: number;
    school_name: string;
    registration_no?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;

    alt_phone?: string | null;
    principal_name?: string | null;
    postal_code?: string | null;
    website?: string | null;

    district?: string | null;
    province?: string | null;
    address?: string | null;
    contact_person?: string | null;

    category?: string | null; // Primary | Secondary
    level?: string | null; // Grade 1-5 | Grade 6-9 | Grade 10-13 | All

    student_count?: number | null;
    teacher_count?: number | null;
    establishment_year?: number | null;

    latitude?: number | null;
    longitude?: number | null;

    bank_name?: string | null;
    account_holder?: string | null;
    bank_account?: string | null;

    need_score?: number;
    verified?: number;
    status?: string;

    document_link?: string | null;
    logo_link?: string | null;
  };
};

/** ---------- Small UI helpers ---------- */
const cx = (...s: Array<string | false | undefined | null>) => s.filter(Boolean).join(" ");

const Card: React.FC<{ children: any; className?: string }> = ({ children, className }) => (
  <div className={cx("rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur shadow-sm", className)}>
    {children}
  </div>
);

const SectionTitle: React.FC<{ title: string; subtitle?: string; right?: any }> = ({ title, subtitle, right }) => (
  <div className="flex items-start justify-between gap-3">
    <div>
      <div className="text-sm font-extrabold text-slate-900">{title}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
    {right}
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

const statusPill = (s?: string) => {
  const v = (s || "").toLowerCase();
  if (v === "active") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (v === "inactive") return "bg-slate-50 text-slate-700 border-slate-200";
  if (v === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
};

const needPill = (n?: number) => {
  const v = Number(n || 0);
  if (v >= 70) return "bg-rose-50 text-rose-700 border-rose-200";
  if (v >= 40) return "bg-amber-50 text-amber-700 border-amber-200";
  if (v > 0) return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
};

const fmtNeed = (n?: number) => Number(n || 0).toFixed(1);

const Input: React.FC<{
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  hint?: string;
  error?: string;
}> = ({ label, value, onChange, placeholder, type = "text", disabled = false, hint, error }) => (
  <label className="block">
    <div className="flex items-center justify-between gap-2 mb-1">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      {hint && <div className="text-[11px] text-slate-400">{hint}</div>}
    </div>
    <input
      type={type}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={cx(
        "w-full rounded-xl border px-3 py-2 text-sm outline-none transition",
        error ? "border-rose-300 focus:ring-4 focus:ring-rose-100" : "border-slate-200 focus:ring-4 focus:ring-slate-200/60",
        disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"
      )}
    />
    {error && <div className="mt-1 text-xs text-rose-600">{error}</div>}
  </label>
);

const TextArea: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
  <label className="block">
    <div className="text-xs font-semibold text-slate-600 mb-1">{label}</div>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-slate-200/60"
    />
  </label>
);

const Toast: React.FC<{ text: string; onClose: () => void; kind?: "success" | "error" }> = ({
  text,
  onClose,
  kind = "success",
}) => (
  <div
    className={cx(
      "fixed right-6 top-6 z-50 w-[380px] max-w-[calc(100vw-48px)]",
      "rounded-2xl border p-4 shadow-lg backdrop-blur bg-white/85"
    )}
  >
    <div className="flex items-start gap-3">
      <div
        className={cx(
          "mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center text-sm font-extrabold",
          kind === "success" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
        )}
      >
        {kind === "success" ? "✓" : "!"}
      </div>
      <div className="flex-1">
        <div className="text-sm font-bold text-slate-900">{kind === "success" ? "Success" : "Error"}</div>
        <div className="text-sm text-slate-600 mt-1">{text}</div>
      </div>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
        ✕
      </button>
    </div>
  </div>
);

const Tabs: React.FC<{
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (k: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div className="inline-flex rounded-2xl border border-slate-200 bg-white/70 p-1 shadow-sm">
    {tabs.map((t) => (
      <button
        key={t.key}
        onClick={() => onChange(t.key)}
        className={cx(
          "px-4 py-2 text-sm font-semibold rounded-xl transition",
          active === t.key ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
        )}
      >
        {t.label}
      </button>
    ))}
  </div>
);

const Dropzone: React.FC<{
  accept: string;
  disabled?: boolean;
  onPick: (f: File | null) => void;
  text: string;
  sub?: string;
}> = ({ accept, disabled, onPick, text, sub }) => (
  <label
    className={cx(
      "block rounded-2xl border border-dashed p-4 text-center",
      "border-slate-200 bg-white hover:bg-slate-50 transition",
      disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
    )}
  >
    <input
      type="file"
      accept={accept}
      disabled={disabled}
      onChange={(e) => onPick(e.target.files?.[0] || null)}
      className="hidden"
    />
    <div className="text-sm font-semibold text-slate-900">{text}</div>
    {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
  </label>
);

const FileCard: React.FC<{
  title: string;
  subtitle: string;
  preview?: string | null;
  accept: string;
  disabled?: boolean;

  lockedText?: string;

  linkText?: string;
  linkHref?: string | null;

  onPick: (file: File | null) => void;
  pickedName?: string | null;
}> = ({ title, subtitle, preview, accept, disabled, lockedText, linkText, linkHref, onPick, pickedName }) => {
  return (
    <Card className={cx("p-5", disabled && "opacity-95")}>
      <SectionTitle title={title} subtitle={subtitle} />
      <div className="mt-4 flex items-start gap-3">
        <div className="h-14 w-14 rounded-2xl border border-slate-200 bg-white overflow-hidden flex items-center justify-center">
          {preview ? <img src={preview} className="h-full w-full object-cover" /> : <span className="text-slate-400 text-xs">—</span>}
        </div>

        <div className="flex-1">
          {linkHref ? (
            <a href={linkHref} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-700 hover:underline">
              {linkText || "Open"}
            </a>
          ) : (
            <div className="text-sm text-slate-600">No file uploaded</div>
          )}

          <div className="mt-3">
            {disabled ? (
              <div className="text-xs text-slate-500">{lockedText || "Locked"}</div>
            ) : (
              <Dropzone
                accept={accept}
                onPick={onPick}
                text={pickedName ? `Selected: ${pickedName}` : "Click to upload"}
                sub="You can change it anytime before verification."
              />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

/** ---------- Main Page ---------- */
const MySchool: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<SchoolMeRes["school"] | null>(null);

  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<"profile" | "location" | "bank" | "verification">("profile");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    school_name: "",
    registration_no: "",
    contact_email: "",
    contact_phone: "",

    alt_phone: "",
    principal_name: "",
    postal_code: "",
    website: "",

    district: "",
    province: "",
    address: "",
    contact_person: "",

    category: "",
    level: "",

    student_count: "",
    teacher_count: "",
    establishment_year: "",

    latitude: "",
    longitude: "",

    bank_name: "",
    account_holder: "",
    bank_account: "",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);

  const logoPreview = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : null), [logoFile]);

  // Dirty state
  const initialFormRef = useRef<string>("");
  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== initialFormRef.current || !!logoFile || !!docFile;
  }, [form, logoFile, docFile]);

  const fetchMe = async () => {
    setLoading(true);
    setErrors({});
    try {
      const res = await axios.get("http://localhost:8000/api/school/me", { withCredentials: true });
      const s = res.data.school as SchoolMeRes["school"];
      setSchool(s);

      const nextForm = {
        school_name: s.school_name || "",
        registration_no: s.registration_no || "",
        contact_email: s.contact_email || "",
        contact_phone: s.contact_phone || "",

        alt_phone: s.alt_phone || "",
        principal_name: s.principal_name || "",
        postal_code: s.postal_code || "",
        website: s.website || "",

        district: s.district || "",
        province: s.province || "",
        address: s.address || "",
        contact_person: s.contact_person || "",

        category: s.category || "",
        level: s.level || "",

        student_count: String(s.student_count ?? ""),
        teacher_count: String(s.teacher_count ?? ""),
        establishment_year: String(s.establishment_year ?? ""),

        latitude: String(s.latitude ?? ""),
        longitude: String(s.longitude ?? ""),

        bank_name: s.bank_name || "",
        account_holder: s.account_holder || "",
        bank_account: s.bank_account || "",
      };

      setForm(nextForm);
      initialFormRef.current = JSON.stringify(nextForm);
      setLogoFile(null);
      setDocFile(null);
    } catch (e: any) {
      setSchool(null);
      setToast({ kind: "error", text: e?.response?.data?.message || "Failed to load profile" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLocked = Number(school?.verified || 0) === 1;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.school_name.trim()) e.school_name = "Required";
    if (!form.contact_email.trim()) e.contact_email = "Required";
    if (!form.category) e.category = "Required";
    if (!form.level) e.level = "Required";

    // If NOT verified yet, allow and require reg no + document (optional rule)
    // If you want to REQUIRE document before verification, uncomment:
    // if (!isLocked && !school?.document_link && !docFile) e.document = "Upload verification document";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    setSaving(true);
    setErrors({});

    if (!validate()) {
      setSaving(false);
      setToast({ kind: "error", text: "Please fix the highlighted fields." });
      return;
    }

    try {
      const fd = new FormData();

      // ✅ If locked, don’t send reg no + don’t send document (backend should enforce too)
      const safeForm = { ...form };
      if (isLocked) safeForm.registration_no = school?.registration_no || safeForm.registration_no;

      Object.entries(safeForm).forEach(([k, v]) => fd.append(k, (v ?? "").toString().trim()));

      if (logoFile) fd.append("logo", logoFile);
      if (!isLocked && docFile) fd.append("document", docFile);

      const res = await axios.post("http://localhost:8000/api/school/me", fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updated = res.data.school as SchoolMeRes["school"];
      setSchool(updated);

      // keep form dirty state correct
      const nextForm = { ...safeForm };
      setForm(nextForm);
      initialFormRef.current = JSON.stringify(nextForm);

      setLogoFile(null);
      setDocFile(null);
      setToast({ kind: "success", text: "Saved successfully!" });
    } catch (e: any) {
      const errs = e?.response?.data?.errors;
      if (errs) {
        const firstKey = Object.keys(errs)[0];
        setToast({ kind: "error", text: errs[firstKey]?.[0] || "Save failed" });
      } else {
        setToast({ kind: "error", text: e?.response?.data?.message || "Save failed" });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
        <div className="text-slate-500 py-10 text-center">Loading profile…</div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
        <Card className="p-10 text-center max-w-2xl mx-auto">
          <div className="text-3xl mb-2">🏫</div>
          <div className="text-slate-900 font-extrabold text-xl">Profile not available</div>
          <div className="text-slate-500 text-sm mt-2">Please login as a school account.</div>
          <button onClick={fetchMe} className="mt-5 px-4 py-2 rounded-xl font-semibold bg-blue-700 text-white hover:bg-blue-800">
            Retry
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)] pb-24">
      {toast && <Toast kind={toast.kind} text={toast.text} onClose={() => setToast(null)} />}

      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
      <div className="absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 opacity-80" />

      {/* Header */}
      <div className="pt-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-extrabold shadow-sm overflow-hidden">
                {school.logo_link || logoPreview ? (
                  <img src={logoPreview || school.logo_link || ""} alt="logo" className="h-full w-full object-cover" />
                ) : (
                  (school.school_name?.slice(0, 1)?.toUpperCase() || "S")
                )}
              </div>

              <div>
                <div className="text-3xl font-extrabold tracking-tight text-slate-900">My School</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Pill className={statusPill(school.status)}>{(school.status || "inactive").toUpperCase()}</Pill>
                  <Pill className={needPill(school.need_score)}>Need: {fmtNeed(school.need_score)}</Pill>
                  <Pill
                    className={
                      school.verified ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-700 border-slate-200"
                    }
                  >
                    {school.verified ? "Verified" : "Not Verified"}
                  </Pill>
                  {school.registration_no ? (
                    <Pill className="bg-slate-50 text-slate-700 border-slate-200">Reg: {school.registration_no}</Pill>
                  ) : (
                    <Pill className="bg-rose-50 text-rose-700 border-rose-200">Missing Reg No</Pill>
                  )}
                  {isLocked && <Pill className="bg-slate-900 text-white border-slate-900">🔒 Locked</Pill>}
                </div>

                {isLocked && (
                  <div className="text-xs text-slate-500 mt-2">
                    Registration No and Verification Document are locked after verification.
                  </div>
                )}
              </div>
            </div>

            {/* Actions (desktop) */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={fetchMe}
                className="px-4 py-2 rounded-xl font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                Refresh
              </button>
              <button
                onClick={save}
                disabled={saving || !isDirty}
                className="px-4 py-2 rounded-xl font-semibold bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : isDirty ? "Save Changes" : "Saved"}
              </button>
            </div>
          </div>

          {/* Summary card */}
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-500">Need Score</div>
                <div className="text-lg font-extrabold text-slate-900">{fmtNeed(school.need_score)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-500">Students</div>
                <div className="text-lg font-extrabold text-slate-900">{school.student_count ?? "-"}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-500">Verification</div>
                <div className="text-lg font-extrabold text-slate-900">{school.verified ? "Verified" : "Pending"}</div>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <div className="flex items-center justify-between gap-3">
            <Tabs
              active={activeTab}
              onChange={(k) => setActiveTab(k as any)}
              tabs={[
                { key: "profile", label: "Profile" },
                { key: "location", label: "Location" },
                { key: "bank", label: "Bank" },
                { key: "verification", label: "Verification" },
              ]}
            />

            <div className="text-xs text-slate-500 hidden sm:block">
              {isDirty ? "You have unsaved changes" : "All changes saved"}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* PROFILE */}
        {activeTab === "profile" && (
          <Card className="p-5 lg:col-span-3">
            <SectionTitle title="School Details" subtitle="Core profile fields" />
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="School Name *"
                value={form.school_name}
                onChange={(v) => setForm({ ...form, school_name: v })}
                error={errors.school_name}
              />

              <Input
                label="Registration No"
                value={form.registration_no}
                onChange={(v) => setForm({ ...form, registration_no: v })}
                disabled={isLocked}
                hint={isLocked ? "Locked" : undefined}
                placeholder={isLocked ? "Locked (Verified)" : "Enter registration no"}
              />

              <Input
                label="Contact Email *"
                type="email"
                value={form.contact_email}
                onChange={(v) => setForm({ ...form, contact_email: v })}
                error={errors.contact_email}
              />

              <Input
                label="Contact Phone"
                value={form.contact_phone}
                onChange={(v) => setForm({ ...form, contact_phone: v })}
              />

              <Input label="Alt Phone" value={form.alt_phone} onChange={(v) => setForm({ ...form, alt_phone: v })} />
              <Input
                label="Principal Name"
                value={form.principal_name}
                onChange={(v) => setForm({ ...form, principal_name: v })}
              />

              <Input
                label="Contact Person"
                value={form.contact_person}
                onChange={(v) => setForm({ ...form, contact_person: v })}
              />
              <Input
                label="Postal Code"
                value={form.postal_code}
                onChange={(v) => setForm({ ...form, postal_code: v })}
              />

              <Input
                label="Website"
                value={form.website}
                onChange={(v) => setForm({ ...form, website: v })}
                placeholder="https://..."
              />

              {/* Category */}
              <label className="block">
                <div className="text-xs font-semibold text-slate-600 mb-1">Category *</div>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={cx(
                    "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none",
                    errors.category ? "border-rose-300 focus:ring-4 focus:ring-rose-100" : "border-slate-200 focus:ring-4 focus:ring-slate-200/60"
                  )}
                >
                  <option value="">Select Category</option>
                  <option value="Primary">Primary</option>
                  <option value="Secondary">Secondary</option>
                </select>
                {errors.category && <div className="mt-1 text-xs text-rose-600">{errors.category}</div>}
              </label>

              {/* Level */}
              <label className="block">
                <div className="text-xs font-semibold text-slate-600 mb-1">School Level *</div>
                <select
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                  className={cx(
                    "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none",
                    errors.level ? "border-rose-300 focus:ring-4 focus:ring-rose-100" : "border-slate-200 focus:ring-4 focus:ring-slate-200/60"
                  )}
                >
                  <option value="">Select Level</option>
                  <option value="Grade 1-5">Grade 1-5</option>
                  <option value="Grade 6-9">Grade 6-9</option>
                  <option value="Grade 10-13">Grade 10-13</option>
                  <option value="All">All</option>
                </select>
                {errors.level && <div className="mt-1 text-xs text-rose-600">{errors.level}</div>}
              </label>

              <Input
                label="Student Count"
                type="number"
                value={form.student_count}
                onChange={(v) => setForm({ ...form, student_count: v })}
              />
              <Input
                label="Teacher Count"
                type="number"
                value={form.teacher_count}
                onChange={(v) => setForm({ ...form, teacher_count: v })}
              />

              <Input
                label="Establishment Year"
                type="number"
                value={form.establishment_year}
                onChange={(v) => setForm({ ...form, establishment_year: v })}
              />

              <div className="md:col-span-2">
                <TextArea label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
              </div>
            </div>
          </Card>
        )}

        {/* LOCATION */}
        {activeTab === "location" && (
          <Card className="p-5 lg:col-span-3">
            <SectionTitle title="Location" subtitle="District / province / coordinates" />
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="District" value={form.district} onChange={(v) => setForm({ ...form, district: v })} />
              <Input label="Province" value={form.province} onChange={(v) => setForm({ ...form, province: v })} />
              <Input label="Latitude" type="number" value={form.latitude} onChange={(v) => setForm({ ...form, latitude: v })} />
              <Input label="Longitude" type="number" value={form.longitude} onChange={(v) => setForm({ ...form, longitude: v })} />
              <div className="md:col-span-2">
                <TextArea label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
              </div>
            </div>
          </Card>
        )}

        {/* BANK */}
        {activeTab === "bank" && (
          <Card className="p-5 lg:col-span-3">
            <SectionTitle title="Bank Details" subtitle="Optional (used for settlements)" />
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Bank Name" value={form.bank_name} onChange={(v) => setForm({ ...form, bank_name: v })} />
              <Input
                label="Account Holder"
                value={form.account_holder}
                onChange={(v) => setForm({ ...form, account_holder: v })}
              />
              <Input
                label="Bank Account"
                value={form.bank_account}
                onChange={(v) => setForm({ ...form, bank_account: v })}
              />
            </div>
          </Card>
        )}

        {/* VERIFICATION */}
        {activeTab === "verification" && (
          <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FileCard
              title="Logo"
              subtitle="Upload school logo (JPG/PNG)"
              preview={logoPreview || school.logo_link || null}
              accept="image/png,image/jpeg"
              disabled={false}
              onPick={setLogoFile}
              pickedName={logoFile?.name || null}
            />

            <FileCard
              title="Verification Document"
              subtitle="Upload PDF/JPG/PNG"
              preview={null}
              accept="application/pdf,image/png,image/jpeg"
              disabled={isLocked}
              lockedText="Document upload is locked after verification."
              linkText="Open current document"
              linkHref={school.document_link || null}
              onPick={setDocFile}
              pickedName={docFile?.name || null}
            />

            <Card className="p-5 lg:col-span-2">
              <SectionTitle title="Verification Notes" subtitle="How locking works" />
              <div className="mt-3 text-sm text-slate-600 leading-relaxed">
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Before verification, you can edit <b>Registration No</b> and upload the <b>Verification Document</b>.
                  </li>
                  <li>
                    After verification, both fields are <b>locked</b> to prevent tampering.
                  </li>
                  <li>
                    If you need to change them later, an admin should <b>unverify</b> the school (set verified = 0).
                  </li>
                </ul>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Sticky action bar (mobile + always visible) */}
      <div className="fixed bottom-4 left-0 right-0 z-40 px-4">
        <div className="mx-auto max-w-6xl">
          <Card className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {saving ? "Saving changes..." : isDirty ? "You have unsaved changes" : "Tip: Keep your details updated for faster verification."}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchMe}
                className="px-4 py-2 rounded-xl font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                Refresh
              </button>

              <button
                onClick={save}
                disabled={saving || !isDirty}
                className="px-4 py-2 rounded-xl font-semibold bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : isDirty ? "Save Changes" : "Saved"}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MySchool;