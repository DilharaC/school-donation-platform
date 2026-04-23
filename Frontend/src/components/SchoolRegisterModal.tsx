// src/components/SchoolRegisterModal.tsx (FULL)
// ✅ Converted from SchoolRegister page -> Modal
// ✅ Same modal behavior as LoginModal: backdrop, animation, ESC, scroll lock
// ✅ Keeps your existing stepper UI + FormData submit

import React, { useCallback, useMemo, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

/** ---------------- Config ---------------- */
const API_BASE = "http://localhost:8000/api";
const REGISTER_ENDPOINT = `${API_BASE}/schools/register`;

/** ---------------- Helpers ---------------- */
const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

type AreaType = "urban" | "rural" | "plantation" | "";

type FormState = {
  school_name: string;
  registration_no: string;
  category: string;

  district: string;
  province: string;

  student_count: string;
  facilities: string;
  area_type: AreaType;
  performance: string;
  prev_donations: string;

  contact_person: string;
  contact_email: string;
  contact_phone: string;

  bank_name: string;
  account_holder: string;
  bank_account: string;

  password: string;

  document: File | null;
  logo: File | null;
};

const PROVINCES = [
  "Western",
  "Central",
  "Southern",
  "Northern",
  "Eastern",
  "North Western",
  "North Central",
  "Uva",
  "Sabaragamuwa",
];

const DISTRICTS: Record<string, string[]> = {
  Western: ["Colombo", "Gampaha", "Kalutara"],
  Central: ["Kandy", "Matale", "Nuwara Eliya"],
  Southern: ["Galle", "Matara", "Hambantota"],
  Northern: ["Jaffna", "Kilinochchi", "Mannar", "Mullaitivu", "Vavuniya"],
  Eastern: ["Trincomalee", "Batticaloa", "Ampara"],
  "North Western": ["Kurunegala", "Puttalam"],
  "North Central": ["Anuradhapura", "Polonnaruwa"],
  Uva: ["Badulla", "Monaragala"],
  Sabaragamuwa: ["Ratnapura", "Kegalle"],
};

const BANKS = [
  "Bank of Ceylon",
  "People's Bank",
  "Commercial Bank",
  "Hatton National Bank (HNB)",
  "Sampath Bank",
  "Seylan Bank",
  "DFCC Bank",
  "National Savings Bank (NSB)",
  "NDB Bank",
  "Pan Asia Bank",
  "Nations Trust Bank",
  "Cargills Bank",
  "Union Bank of Colombo",
  "Amana Bank",
  "Commercial Leasing & Finance Bank",
];

const CATEGORIES = ["National", "Provincial", "Private", "International", "Other"];

const inputBase =
  "w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none bg-white " +
  "focus:ring-4 focus:ring-rose-200 focus:border-rose-300 " +
  "hover:border-slate-300 transition";

const selectBase =
  "w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none bg-white " +
  "focus:ring-4 focus:ring-rose-200 focus:border-rose-300 " +
  "hover:border-slate-300 transition";

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const numSanitize = (v: string) => v.replace(/[^\d]/g, "");

/** ---------------- Minimal Icons (no libs) ---------------- */
function Icon({
  name,
  className,
}: {
  name:
    | "check"
    | "arrowRight"
    | "arrowLeft"
    | "shield"
    | "school"
    | "user"
    | "bank"
    | "doc"
    | "upload"
    | "alert"
    | "info";
  className?: string;
}) {
  const cls = cx("h-5 w-5", className);
  switch (name) {
    case "check":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20 6L9 17l-5-5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "arrowRight":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path
            d="M13 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "arrowLeft":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19 12H7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path
            d="M11 6l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "shield":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V7l8-4z"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "school":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 10l9-5 9 5-9 5-9-5z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M7 12v7h10v-7" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      );
    case "user":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20 21a8 8 0 10-16 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M12 13a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      );
    case "bank":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 10l9-5 9 5H3z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M5 10v10h14V10" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M8 20v-7M12 20v-7M16 20v-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case "doc":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 3h7l3 3v15H7V3z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M14 3v4h4" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      );
    case "upload":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 16V4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path
            d="M7 9l5-5 5 5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M4 20h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case "alert":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 9v4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M12 17h.01" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
          <path
            d="M10.3 4.2l-8 14A2 2 0 004.1 21h15.8a2 2 0 001.8-2.8l-8-14a2 2 0 00-3.4 0z"
            stroke="currentColor"
            strokeWidth="2.0"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "info":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 22a10 10 0 110-20 10 10 0 010 20z" stroke="currentColor" strokeWidth="2.2" />
          <path d="M12 10v6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M12 7h.01" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

/** ---------------- UI Small Pieces ---------------- */
const StepPill = ({ n, label, step }: { n: number; label: string; step: number }) => {
  const active = n === step;
  const done = n < step;

  return (
    <div className="flex items-center gap-2">
      <div
        className={cx(
          "h-9 w-9 rounded-full grid place-items-center text-sm font-extrabold border transition",
          done
            ? "bg-rose-600 text-white border-rose-600"
            : active
            ? "bg-rose-50 text-rose-700 border-rose-300"
            : "bg-white text-slate-400 border-slate-200"
        )}
      >
        {n + 1}
      </div>
      <div className={cx("text-sm font-extrabold", active ? "text-slate-800" : "text-slate-500")}>{label}</div>
    </div>
  );
};

const InputShell = ({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center justify-between">
      <label className="text-xs font-extrabold text-slate-600">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </label>
    </div>
    <div className="mt-1">{children}</div>
    {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
  </div>
);

const SectionTitle = ({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) => (
  <div className="flex items-start gap-3">
    <div className="h-11 w-11 rounded-2xl bg-rose-50 border border-rose-100 grid place-items-center text-rose-700">
      {icon}
    </div>
    <div>
      <div className="text-slate-900 font-extrabold text-lg">{title}</div>
      <div className="text-slate-500 text-sm">{sub}</div>
    </div>
  </div>
);

const FilePick = ({
  label,
  hint,
  accept,
  file,
  onChange,
}: {
  label: string;
  hint?: string;
  accept: string;
  file: File | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div>
    <div className="text-xs font-extrabold text-slate-600">{label}</div>
    <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-200 grid place-items-center text-slate-700">
            <Icon name="upload" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-slate-800">Choose file</div>
            <div className="text-xs text-slate-500">{hint || "Optional"}</div>
          </div>
        </div>
        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-extrabold bg-slate-900 text-white hover:bg-slate-800 transition">
            <Icon name="doc" className="h-4 w-4" />
            Browse
          </span>
          <input type="file" accept={accept} onChange={onChange} className="hidden" />
        </label>
      </div>

      {file ? (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-extrabold text-slate-700">
          <Icon name="doc" className="h-4 w-4 text-slate-600" />
          <span className="max-w-[420px] truncate">{file.name}</span>
        </div>
      ) : null}
    </div>
  </div>
);

export default function SchoolRegisterModal({
  open,
  onClose,
  leftImageUrl = "/images/login-left.jpg",
}: {
  open: boolean;
  onClose: () => void;
  leftImageUrl?: string;
  // NOTE: no setCurrentUser because schools are Inactive and must login after activation
}) {
  const nav = useNavigate();

  const [step, setStep] = useState(0); // 0..4
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [ok, setOk] = useState<string>("");
  const [registered, setRegistered] = useState(false);

  const [form, setForm] = useState<FormState>({
    school_name: "",
    registration_no: "",
    category: "",

    district: "",
    province: "",

    student_count: "",
    facilities: "",
    area_type: "",
    performance: "",
    prev_donations: "0",

    contact_person: "",
    contact_email: "",
    contact_phone: "",

    bank_name: "",
    account_holder: "",
    bank_account: "",

    password: "",

    document: null,
    logo: null,
  });

  // ✅ axios defaults once (same as LoginModal)
  useEffect(() => {
    axios.defaults.baseURL = "http://localhost:8000";
    axios.defaults.withCredentials = true;
  }, []);

  // ✅ ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && resetAndClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ✅ lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const totalSteps = 5;
  const progressPct = useMemo(() => Math.round((step / (totalSteps - 1)) * 100), [step]);

  const resetAll = () => {
    setStep(0);
    setLoading(false);
    setErr("");
    setOk("");
    setRegistered(false);
    setForm({
      school_name: "",
      registration_no: "",
      category: "",
      district: "",
      province: "",
      student_count: "",
      facilities: "",
      area_type: "",
      performance: "",
      prev_donations: "0",
      contact_person: "",
      contact_email: "",
      contact_phone: "",
      bank_name: "",
      account_holder: "",
      bank_account: "",
      password: "",
      document: null,
      logo: null,
    });
  };

  const resetAndClose = () => {
    // keep same behavior as LoginModal
    resetAll();
    onClose();
  };

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;

      const numericFields = new Set(["student_count", "facilities", "performance", "prev_donations"]);
      const nextValue = numericFields.has(name) ? numSanitize(value) : value;

      setForm((p) => ({ ...p, [name]: nextValue }));
    },
    []
  );

  const onProvinceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setForm((p) => ({ ...p, province: v, district: "" }));
  }, []);

  const onFile =
    (name: "document" | "logo") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0] || null;
      setForm((p) => ({ ...p, [name]: f }));
    };

  const validateStep = useCallback(
    (s: number) => {
      setErr("");
      const bad = (m: string) => {
        setErr(m);
        return false;
      };

      if (s === 0) {
        if (!form.school_name.trim()) return bad("School name is required.");
        if (!form.registration_no.trim()) return bad("Registration number is required.");
        if (!form.category.trim()) return bad("Category is required.");
        return true;
      }

      if (s === 1) {
        if (!form.province.trim()) return bad("Province is required.");
        if (!form.district.trim()) return bad("District is required.");
        if (!form.student_count.trim()) return bad("Student count is required.");
        if (!form.facilities.trim()) return bad("Facilities is required.");
        if (!form.area_type.trim()) return bad("Area type is required.");
        if (!form.performance.trim()) return bad("Performance is required.");

        const st = Number(form.student_count);
        const fac = Number(form.facilities);
        const perf = Number(form.performance);

        if (!Number.isFinite(st) || st < 0) return bad("Student count must be a valid number.");
        if (!Number.isFinite(fac) || fac < 0) return bad("Facilities must be a valid number.");
        if (!Number.isFinite(perf) || perf < 0 || perf > 100) return bad("Performance must be 0–100.");
        return true;
      }

      if (s === 2) {
        if (!form.contact_person.trim()) return bad("Contact person is required.");
        if (!form.contact_email.trim()) return bad("Contact email is required.");
        if (!isEmail(form.contact_email)) return bad("Please enter a valid email.");
        if (!form.contact_phone.trim()) return bad("Contact phone is required.");
        return true;
      }

      if (s === 3) {
        if (!form.bank_name.trim()) return bad("Bank name is required.");
        if (!form.account_holder.trim()) return bad("Account holder is required.");
        if (!form.bank_account.trim()) return bad("Bank account is required.");
        return true;
      }

      if (s === 4) {
        if (!form.password.trim()) return bad("Password is required.");
        if (form.password.length < 6) return bad("Password must be at least 6 characters.");
        return true;
      }

      return true;
    },
    [form]
  );

  const next = useCallback(() => {
    if (!validateStep(step)) return;
    setStep((p) => Math.min(totalSteps - 1, p + 1));
  }, [step, totalSteps, validateStep]);

  const prev = useCallback(() => {
    setErr("");
    setStep((p) => Math.max(0, p - 1));
  }, []);

  const submit = useCallback(async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    setErr("");
    setOk("");

    try {
      const fd = new FormData();

      fd.append("school_name", form.school_name.trim());
      fd.append("registration_no", form.registration_no.trim());
      fd.append("contact_email", form.contact_email.trim());
      fd.append("password", form.password);

      fd.append("student_count", String(Number(form.student_count || 0)));
      fd.append("facilities", String(Number(form.facilities || 0)));
      fd.append("area_type", form.area_type);
      fd.append("performance", String(Number(form.performance || 0)));
      fd.append("prev_donations", String(Number(form.prev_donations || 0)));

      fd.append("category", form.category || "");
      fd.append("district", form.district || "");
      fd.append("province", form.province || "");
      fd.append("contact_person", form.contact_person || "");
      fd.append("contact_phone", form.contact_phone || "");

      fd.append("bank_name", form.bank_name || "");
      fd.append("account_holder", form.account_holder || "");
      fd.append("bank_account", form.bank_account || "");

      if (form.document) fd.append("document", form.document);
      if (form.logo) fd.append("logo", form.logo);

      const res = await axios.post(REGISTER_ENDPOINT, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res?.data?.success) {
        setRegistered(true);
        setOk("");
        setErr("");
        return;
      } else {
        setErr(res?.data?.message || "Registration failed.");
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.data?.errors ? Object.values(e.response.data.errors).flat().join(" ") : null) ||
        e?.message ||
        "Registration failed.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }, [form, validateStep]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      {/* Backdrop */}
      <div
        className={cx(
          "absolute inset-0 bg-black/25 backdrop-blur-[0.7px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={resetAndClose}
      />

      {/* Dialog */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className={cx(
            "w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl",
            "transition-all duration-300 ease-out will-change-transform will-change-opacity",
            open ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-95"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-slate-200 p-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-rose-50 border border-rose-100 grid place-items-center text-rose-700">
                <Icon name="school" className="h-6 w-6" />
              </div>
              <div>
                <div className="text-slate-900 text-xl font-extrabold">School Registration</div>
                <div className="text-slate-500 text-sm">
                  Step <span className="font-bold text-slate-700">{step + 1}</span> of {totalSteps}
                </div>
              </div>
            </div>

            <button
              onClick={resetAndClose}
              className="h-10 w-10 rounded-xl hover:bg-slate-100 grid place-items-center transition"
              aria-label="Close"
            >
              <i className="bx bx-x text-2xl text-slate-700" />
            </button>
          </div>

          {/* Body (scrollable) */}
          <div className="max-h-[78vh] overflow-y-auto">
            {/* SUCCESS */}
            {registered ? (
              <div className="p-8 text-center">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 grid place-items-center text-emerald-700">
                  <Icon name="check" className="h-7 w-7" />
                </div>

                <div className="mt-4 text-2xl font-extrabold text-slate-900">Registration successful</div>

                <div className="mt-2 text-slate-600">
                  Your school account has been created and is currently{" "}
                  <span className="font-extrabold text-rose-700">Inactive</span>.
                </div>

                <div className="mt-2 text-slate-600">Please login after admin activation.</div>

                <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      resetAndClose();
                      nav("/school/login?registered=1");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 font-extrabold text-white bg-rose-600 hover:bg-rose-700 transition"
                  >
                    Go to Login <Icon name="arrowRight" className="h-4 w-4" />
                  </button>

                  <button
                    onClick={resetAndClose}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 font-extrabold border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 text-xs text-slate-500 inline-flex items-center gap-2 justify-center">
                  <Icon name="info" className="h-4 w-4 text-slate-400" />
                  If activation takes time, contact support or wait for admin verification.
                </div>
              </div>
            ) : (
              <div className="p-6">
                {/* Progress */}
                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex flex-wrap gap-4">
                      <StepPill n={0} label="Basic" step={step} />
                      <StepPill n={1} label="Address & AI" step={step} />
                      <StepPill n={2} label="Contact" step={step} />
                      <StepPill n={3} label="Bank" step={step} />
                      <StepPill n={4} label="Preview" step={step} />
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-rose-600 transition-all duration-500" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>

                  {err ? (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 text-sm inline-flex items-start gap-2">
                      <Icon name="alert" className="mt-0.5 h-5 w-5" />
                      <div>{err}</div>
                    </div>
                  ) : null}

                  {ok ? (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 text-sm">
                      {ok}
                    </div>
                  ) : null}
                </div>

                {/* Main card */}
                <div className="mt-6 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                  <div className="p-6">
                    {/* Step 0 */}
                    {step === 0 && (
                      <div className="space-y-5">
                        <SectionTitle
                          icon={<Icon name="school" className="h-6 w-6" />}
                          title="Basic details"
                          sub="Enter school identity details to begin registration."
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InputShell label="School Name" required>
                            <input
                              className={inputBase}
                              name="school_name"
                              value={form.school_name}
                              onChange={onChange}
                              placeholder="e.g. Green Valley College"
                              autoComplete="organization"
                            />
                          </InputShell>

                          <InputShell label="Registration No" required>
                            <input
                              className={inputBase}
                              name="registration_no"
                              value={form.registration_no}
                              onChange={onChange}
                              placeholder="Registration number"
                            />
                          </InputShell>

                          <div className="md:col-span-2">
                            <InputShell label="Category" required>
                              <select className={selectBase} name="category" value={form.category} onChange={onChange}>
                                <option value="">Select Category</option>
                                {CATEGORIES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </InputShell>
                          </div>

                          <div className="md:col-span-2">
                            <FilePick
                              label="School Logo (optional)"
                              hint="PNG/JPG recommended"
                              accept="image/*"
                              file={form.logo}
                              onChange={onFile("logo")}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 1 */}
                    {step === 1 && (
                      <div className="space-y-5">
                        <SectionTitle
                          icon={<Icon name="shield" className="h-6 w-6" />}
                          title="Address & need score inputs"
                          sub="These fields are used to calculate the need_score."
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InputShell label="Province" required>
                            <select name="province" value={form.province} onChange={onProvinceChange} className={selectBase}>
                              <option value="">Select Province</option>
                              {PROVINCES.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          </InputShell>

                          <InputShell label="District" required>
                            <select
                              name="district"
                              value={form.district}
                              onChange={onChange}
                              disabled={!form.province}
                              className={cx(selectBase, !form.province && "bg-slate-50 text-slate-400")}
                            >
                              <option value="">Select District</option>
                              {form.province &&
                                DISTRICTS[form.province]?.map((d) => (
                                  <option key={d} value={d}>
                                    {d}
                                  </option>
                                ))}
                            </select>
                          </InputShell>

                          <InputShell label="Number of Students" required hint="Total students currently enrolled.">
                            <input
                              inputMode="numeric"
                              className={inputBase}
                              name="student_count"
                              value={form.student_count}
                              onChange={onChange}
                              placeholder="e.g. 500"
                            />
                          </InputShell>

                          <InputShell
                            label="Facilities (integer)"
                            required
                            hint="Use a consistent scale (ex: 0–100). Higher = better facilities."
                          >
                            <input
                              inputMode="numeric"
                              className={inputBase}
                              name="facilities"
                              value={form.facilities}
                              onChange={onChange}
                              placeholder="e.g. 60"
                            />
                          </InputShell>

                          <InputShell label="Area Type" required>
                            <select className={selectBase} name="area_type" value={form.area_type} onChange={onChange}>
                              <option value="">Select Area Type</option>
                              <option value="urban">Urban</option>
                              <option value="rural">Rural</option>
                              <option value="plantation">Plantation</option>
                            </select>
                          </InputShell>

                          <InputShell label="Academic Performance (0–100)" required hint="0 = low, 100 = excellent.">
                            <input
                              inputMode="numeric"
                              className={inputBase}
                              name="performance"
                              value={form.performance}
                              onChange={onChange}
                              placeholder="e.g. 75"
                            />
                          </InputShell>

                       
                          
                        </div>
                      </div>
                    )}

                    {/* Step 2 */}
                    {step === 2 && (
                      <div className="space-y-5">
                        <SectionTitle
                          icon={<Icon name="user" className="h-6 w-6" />}
                          title="Contact details"
                          sub="We’ll use this info to verify your school."
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InputShell label="Contact Person" required>
                            <input className={inputBase} name="contact_person" value={form.contact_person} onChange={onChange} placeholder="Name" />
                          </InputShell>

                          <InputShell label="Contact Phone" required hint="Example: +94XXXXXXXXX">
                            <input className={inputBase} name="contact_phone" value={form.contact_phone} onChange={onChange} placeholder="+94XXXXXXXXX" />
                          </InputShell>

                          <div className="md:col-span-2">
                            <InputShell label="Contact Email" required>
                              <input
                                type="email"
                                className={inputBase}
                                name="contact_email"
                                value={form.contact_email}
                                onChange={onChange}
                                placeholder="email@example.com"
                              />
                            </InputShell>
                          </div>

                          <div className="md:col-span-2">
                            <FilePick
                              label="Verification Document"
                              hint="PDF/JPG/PNG (optional now)"
                              accept=".pdf,image/*"
                              file={form.document}
                              onChange={onFile("document")}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3 */}
                    {step === 3 && (
                      <div className="space-y-5">
                        <SectionTitle
                          icon={<Icon name="bank" className="h-6 w-6" />}
                          title="Bank details"
                          sub="Used for transfers when funds are sent to the school."
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <InputShell label="Bank Name" required>
                              <select className={selectBase} name="bank_name" value={form.bank_name} onChange={onChange}>
                                <option value="">Select Bank</option>
                                {BANKS.map((b) => (
                                  <option key={b} value={b}>
                                    {b}
                                  </option>
                                ))}
                              </select>
                            </InputShell>
                          </div>

                          <InputShell label="Account Holder" required>
                            <input className={inputBase} name="account_holder" value={form.account_holder} onChange={onChange} placeholder="Account Holder" />
                          </InputShell>

                          <InputShell label="Bank Account" required>
                            <input className={inputBase} name="bank_account" value={form.bank_account} onChange={onChange} placeholder="Account Number" />
                          </InputShell>
                        </div>
                      </div>
                    )}

                    {/* Step 4 */}
                    {step === 4 && (
                      <div className="space-y-5">
                        <SectionTitle
                          icon={<Icon name="shield" className="h-6 w-6" />}
                          title="Password & preview"
                          sub="Review everything before submitting."
                        />

                        <InputShell label="Password" required hint="At least 6 characters.">
                          <input
                            type="password"
                            className={inputBase}
                            name="password"
                            value={form.password}
                            onChange={onChange}
                            placeholder="Create a password"
                            autoComplete="new-password"
                          />
                        </InputShell>

                        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
                          <div className="flex items-center justify-between">
                            <div className="text-slate-900 font-extrabold">Preview</div>
                            <div className="text-xs font-extrabold text-slate-600">Final check</div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-slate-500 text-xs font-extrabold">School</div>
                              <div className="font-extrabold text-slate-800">{form.school_name || "—"}</div>
                            </div>
                            <div>
                              <div className="text-slate-500 text-xs font-extrabold">Reg No</div>
                              <div className="font-extrabold text-slate-800">{form.registration_no || "—"}</div>
                            </div>
                            <div>
                              <div className="text-slate-500 text-xs font-extrabold">Category</div>
                              <div className="font-extrabold text-slate-800">{form.category || "—"}</div>
                            </div>
                            <div>
                              <div className="text-slate-500 text-xs font-extrabold">District / Province</div>
                              <div className="font-extrabold text-slate-800">
                                {(form.district || "—") + " / " + (form.province || "—")}
                              </div>
                            </div>

                            <div className="md:col-span-2">
                              <div className="text-slate-500 text-xs font-extrabold">Contact</div>
                              <div className="font-extrabold text-slate-800">
                                {[form.contact_person, form.contact_email, form.contact_phone].filter(Boolean).join(" • ") || "—"}
                              </div>
                            </div>

                            <div className="md:col-span-2">
                              <div className="text-slate-500 text-xs font-extrabold">Bank</div>
                              <div className="font-extrabold text-slate-800">
                                {[form.bank_name, form.account_holder, form.bank_account].filter(Boolean).join(" • ") || "—"}
                              </div>
                            </div>

                            <div className="md:col-span-2">
                              <div className="text-slate-500 text-xs font-extrabold">Need Score Inputs</div>
                              <div className="font-extrabold text-slate-800">
                                Students: {form.student_count || "—"} • Facilities: {form.facilities || "—"} • Area: {form.area_type || "—"} • Performance:{" "}
                                {form.performance || "—"} • Prev Donations: {form.prev_donations || "0"}
                              </div>
                            </div>

                            <div className="md:col-span-2">
                              <div className="text-slate-500 text-xs font-extrabold">Document</div>
                              <div className="font-extrabold text-slate-800">{form.document?.name || "—"}</div>
                            </div>

                            <div className="md:col-span-2">
                              <div className="text-slate-500 text-xs font-extrabold">Logo</div>
                              <div className="font-extrabold text-slate-800">{form.logo?.name || "—"}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={prev}
                        disabled={step === 0 || loading}
                        className={cx(
                          "inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-extrabold border transition",
                          step === 0 || loading
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <Icon name="arrowLeft" className="h-4 w-4" />
                        Previous
                      </button>

                      <div className="flex-1" />

                      {step < totalSteps - 1 ? (
                        <button
                          type="button"
                          onClick={next}
                          disabled={loading}
                          className={cx(
                            "inline-flex items-center gap-2 rounded-2xl px-6 py-3 font-extrabold text-white transition",
                            loading ? "bg-rose-400 cursor-not-allowed" : "bg-rose-600 hover:bg-rose-700 active:scale-[0.99]"
                          )}
                        >
                          Next <Icon name="arrowRight" className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={submit}
                          disabled={loading}
                          className={cx(
                            "inline-flex items-center gap-2 rounded-2xl px-6 py-3 font-extrabold text-white transition",
                            loading ? "bg-rose-400 cursor-not-allowed" : "bg-rose-600 hover:bg-rose-700 active:scale-[0.99]"
                          )}
                        >
                          {loading ? "Registering…" : "Register"}
                          {!loading ? <Icon name="check" className="h-4 w-4" /> : null}
                        </button>
                      )}
                    </div>

                    <div className="mt-3 text-xs text-slate-500 inline-flex items-center gap-2">
                      <Icon name="info" className="h-4 w-4 text-slate-400" />
                      By registering, the school will be created as{" "}
                      <span className="font-extrabold text-rose-700">Inactive</span> until admin verification.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Optional footer image strip (keeps your theme) */}
          <div className="hidden">
            <img src={leftImageUrl} alt="" />
          </div>
        </div>
      </div>
    </div>
  );
}