// MyDonations.tsx (FULL UPDATED FILE)
// ✅ Softer text colors
// ✅ Better button colors (blue primary, clean secondary)
// ✅ Reduced overly dark text
// ✅ Supports: campaign + direct school fund
// ✅ Supports: allocation-based “Donated Requests”
// ✅ Adds: “View Allocation” modal per donation
// ✅ Fixes: request_id nullable
// ✅ Evidence section UI kept modern

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  PhotoIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  ReceiptPercentIcon,
  PrinterIcon,
  Squares2X2Icon,
  ListBulletIcon,
  EyeIcon,
} from "@heroicons/react/24/solid";

const API_BASE = "http://localhost:8000/api";

const MY_DONATIONS = `${API_BASE}/donor/my-donations`;
const MY_REQUEST_ALLOCATIONS = `${API_BASE}/donor/my-request-allocations`;
const REQUEST_DETAIL = (id: number) => `${API_BASE}/donation_requests/${id}`;
const RECEIPT_ENDPOINT = (id: number) => `${API_BASE}/donations/${id}/receipt`;
const ALLOCATION_ENDPOINT = (donationId: number) =>
  `${API_BASE}/donor/donations/${donationId}/allocations`;

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");
const formatLKR = (n: number) => `LKR ${Number.isFinite(n) ? n.toLocaleString() : "0"}`;

/** Convert "/storage/.." or "http.." to absolute URL */
const toAbs = (u?: string | null) => {
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `http://localhost:8000${u.startsWith("/") ? "" : "/"}${u}`;
};

type DonationRow = {
  donation_id: number;
  request_id?: number | null;
  donation_type?: "campaign" | "school_fund" | string;
  amount: number;
  status: "paid" | "pending" | string;
  created_at: string;
  time?: string | null;

  request_title?: string | null;
  school_id?: number | null;
  school_name?: string | null;
  district?: string | null;
  province?: string | null;

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

type RequestAllocationRow = {
  request_id: number;
  request_title: string;
  school_name?: string | null;
  province?: string | null;
  district?: string | null;

  total_allocated: number;
  allocations_count: number;
  last_allocated_at?: string | null;
};

type AllocationRow = {
  allocation_id: number;
  allocation_type: "request" | "school_fund" | string;
  request_id: number | null;
  request_title?: string | null;
  allocated_amount: number;
  created_at?: string;
};

type DonationAllocationRes = {
  donation: {
    donation_id: number;
    amount: number;
    status: string;
    created_at: string;
  };
  allocated_total: number;
  allocations: AllocationRow[];
};

/** ---------------- Small UI helpers ---------------- */

function SectionTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Squares2X2Icon className="h-4 w-4 text-blue-500" />
          Donor dashboard
        </div>
        <div className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
      </div>
      {right}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-500">{label}</div>
          <div className="mt-1 text-xl font-semibold text-slate-800">{value}</div>
        </div>
        {icon ? (
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-700">
            {icon}
          </div>
        ) : null}
      </div>
      {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function Pill({
  children,
  tone = "slate",
  icon,
}: {
  children: React.ReactNode;
  tone?: "slate" | "emerald" | "amber" | "rose" | "indigo" | "blue";
  icon?: React.ReactNode;
}) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        map[tone]
      )}
    >
      {icon ? <span className="h-3.5 w-3.5">{icon}</span> : null}
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

const statusIcon = (s: string) => {
  const v = (s || "").toLowerCase();
  if (v === "paid") return <CheckCircleIcon className="h-3.5 w-3.5" />;
  if (v === "pending") return <ClockIcon className="h-3.5 w-3.5" />;
  return null;
};

const initials = (name?: string | null) => {
  const n = (name || "School").trim();
  const parts = n.split(/\s+/);
  const a = parts[0]?.[0] || "S";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
};

function Segmented({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (v: string) => void;
  items: Array<{ key: string; label: string; icon?: React.ReactNode }>;
}) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          className={cx(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
            value === it.key ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
          )}
        >
          {it.icon ? <span className="h-4 w-4">{it.icon}</span> : null}
          {it.label}
        </button>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex gap-4">
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-100" />
        <div className="flex-1">
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          <div className="mt-4 h-3 w-1/3 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="w-24">
          <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
          <div className="mt-3 h-6 w-16 animate-pulse rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-700">
        {icon}
      </div>
      <div className="mt-4 text-xl font-semibold text-slate-800">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{desc}</div>
    </div>
  );
}

/** Drawer */
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
        className={cx(
          "absolute inset-0 bg-black/35 backdrop-blur-[1px] transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        className={cx(
          "absolute right-0 top-0 h-full w-full bg-white shadow-2xl transition-transform duration-200 sm:w-[640px]",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b p-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <EyeIcon className="h-4 w-4 text-blue-500" />
                Evidence & details
              </div>
              <div className="truncate text-lg font-semibold text-slate-800">{title}</div>
            </div>
            <button
              onClick={onClose}
              className="flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <XMarkIcon className="h-4 w-4" />
              Close
            </button>
          </div>
          <div className="overflow-auto p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Receipt Modal */
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
        <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
          <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-700">
            <XMarkIcon className="h-5 w-5" />
          </button>

          <div className="text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-700">
              <ReceiptPercentIcon className="h-6 w-6" />
            </div>
            <div className="mt-3 text-xs font-semibold text-slate-500">Donation Receipt</div>
            <div className="mt-1 text-xl font-semibold text-slate-800">#{receipt?.donation_id || ""}</div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-slate-500">Loading receipt…</div>
          ) : !receipt ? (
            <div className="py-10 text-center font-semibold text-rose-600">Could not load receipt.</div>
          ) : (
            <div className="mt-6 space-y-3 text-sm">
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Row label="Amount" value={<b className="text-slate-800">{formatLKR(Number(receipt.amount) || 0)}</b>} />
                <Row
                  label="Status"
                  value={
                    <span className="flex items-center justify-end gap-2 font-semibold uppercase text-emerald-700">
                      <CheckCircleIcon className="h-4 w-4" />
                      {String(receipt.status || "").toUpperCase()}
                    </span>
                  }
                />
                <Row
                  label="Date"
                  value={<span className="font-medium text-slate-700">{new Date(receipt.created_at).toLocaleString()}</span>}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs font-semibold text-slate-500">Request</div>
                <div className="mt-1 font-semibold text-slate-800">{receipt.request_title || "School Fund"}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs font-semibold text-slate-500">School</div>
                <div className="mt-1 font-semibold text-slate-800">{receipt.school_name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {receipt.province} • {receipt.district}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => window.print()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
          >
            <PrinterIcon className="h-5 w-5" />
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

/** Allocation Modal */
function AllocationModal({
  open,
  onClose,
  data,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  data: DonationAllocationRes | null;
  loading: boolean;
}) {
  return (
    <div className={open ? "fixed inset-0 z-[115]" : "hidden"}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
          <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-700">
            <XMarkIcon className="h-5 w-5" />
          </button>

          <div className="text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-700">
              <Squares2X2Icon className="h-6 w-6" />
            </div>
            <div className="mt-3 text-xs font-semibold text-slate-500">Donation Allocation</div>
            <div className="mt-1 text-xl font-semibold text-slate-800">#{data?.donation?.donation_id || ""}</div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-slate-500">Loading allocation…</div>
          ) : !data ? (
            <div className="py-10 text-center font-semibold text-rose-600">Could not load allocation.</div>
          ) : (
            <div className="mt-6 space-y-3 text-sm">
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Row
                  label="Donation Amount"
                  value={<b className="text-slate-800">{formatLKR(Number(data.donation.amount) || 0)}</b>}
                />
                <Row
                  label="Allocated Total"
                  value={<b className="text-slate-800">{formatLKR(Number(data.allocated_total) || 0)}</b>}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-2 text-xs font-semibold text-slate-500">Breakdown</div>

                {data.allocations?.length ? (
                  <div className="space-y-2">
                    {data.allocations.map((a) => (
                      <div key={a.allocation_id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-800">
                            {a.allocation_type === "request"
                              ? a.request_title || (a.request_id ? `Request #${a.request_id}` : "Request")
                              : "School Fund"}
                          </div>
                          <div className="text-[11px] font-medium text-slate-500">
                            {String(a.allocation_type || "").toUpperCase()}
                          </div>
                        </div>
                        <div className="shrink-0 font-semibold text-slate-700">
                          {formatLKR(Number(a.allocated_amount) || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-600">No allocations found.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

/** Avatar with request image OR school logo OR initials */
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
  useEffect(() => {
    if (requestId > 0 && !requestImage && !schoolLogo) getThumb(requestId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const src = toAbs(requestImage) || toAbs(schoolLogo);

  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-blue-600 ring-1 ring-black/5">
      {src ? (
        <img
          src={src}
          alt="thumb"
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-sm font-semibold text-white">{initials(label)}</div>
      )}
    </div>
  );
}

/** Simple progress bar */
function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-blue-600" style={{ width: `${v}%` }} />
    </div>
  );
}

/** Debounce hook */
function useDebounced<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** small missing icon used in EmptyState above */
function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
      <path d="M20 7h-1.4a3.5 3.5 0 0 0-6.6-1.3A3.5 3.5 0 0 0 5.4 7H4a2 2 0 0 0-2 2v2h10V7h2v4h10V9a2 2 0 0 0-2-2Zm-6.5-1.5A1.5 1.5 0 1 1 15 7h-2V5.5ZM9 7a1.5 1.5 0 1 1 1.5-1.5V7H9Zm3 6H2v7a2 2 0 0 0 2 2h8v-9Zm2 9h6a2 2 0 0 0 2-2v-7H14v9Z" />
    </svg>
  );
}

/** ---------------- Modern Evidence UI ---------------- */

function EvidenceCard({ e }: { e: Evidence }) {
  const raw = e?.file_url || "";
  const href = toAbs(raw);
  const type = String(e?.file_type || "").toLowerCase();
  const isPdf = type === "pdf" || raw.toLowerCase().endsWith(".pdf");

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cx(
        "group block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition",
        "hover:border-slate-300 hover:shadow-md"
      )}
      title="Open in new tab"
    >
      <div className="relative aspect-[4/3] bg-slate-50">
        {isPdf ? (
          <>
            <iframe
              src={`${href}#page=1&view=FitH`}
              className="pointer-events-none absolute inset-0 h-full w-full opacity-90"
              title={`pdf-${e.id}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
            <div className="absolute left-3 top-3">
              <Pill tone="blue" icon={<DocumentTextIcon className="h-3.5 w-3.5" />}>
                PDF
              </Pill>
            </div>
            <div className="absolute right-3 top-3 opacity-0 transition group-hover:opacity-100">
              <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur">
                Open <span aria-hidden>↗</span>
              </span>
            </div>
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl border border-blue-200 bg-white/95 text-blue-700 shadow-sm">
                <DocumentTextIcon className="h-5 w-5" />
              </div>
              <div className="text-white drop-shadow">
                <div className="text-sm font-semibold leading-tight">PDF Evidence</div>
                <div className="text-[11px] font-medium opacity-90">Tap to view</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <img
              src={href}
              alt="evidence"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
              onError={(ev) => {
                (ev.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
            <div className="absolute left-3 top-3">
              <Pill tone="blue" icon={<PhotoIcon className="h-3.5 w-3.5" />}>
                IMAGE
              </Pill>
            </div>
            <div className="absolute right-3 top-3 opacity-0 transition group-hover:opacity-100">
              <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur">
                View <span aria-hidden>↗</span>
              </span>
            </div>
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl border border-blue-200 bg-white/95 text-blue-700 shadow-sm">
                <PhotoIcon className="h-5 w-5" />
              </div>
              <div className="text-white drop-shadow">
                <div className="text-sm font-semibold leading-tight">Image Evidence</div>
                <div className="text-[11px] font-medium opacity-90">Tap to zoom</div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-800">{isPdf ? "PDF Evidence" : "Image Evidence"}</div>
            {e.note ? <div className="mt-1 line-clamp-2 text-xs text-slate-600">{e.note}</div> : null}
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              OPEN
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="truncate text-[11px] font-medium text-slate-500">
            {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
          </div>
          <div className="max-w-[55%] truncate text-[11px] font-medium text-slate-500">{raw}</div>
        </div>
      </div>
    </a>
  );
}

function EvidenceSection({ evidences }: { evidences: Evidence[] }) {
  const [filter, setFilter] = useState<"all" | "pdf" | "image">("all");

  const counts = useMemo(() => {
    const pdf = evidences.filter((e) => {
      const t = String(e.file_type || "").toLowerCase();
      return t === "pdf" || String(e.file_url || "").toLowerCase().endsWith(".pdf");
    }).length;
    const img = evidences.length - pdf;
    return { pdf, img, all: evidences.length };
  }, [evidences]);

  const filtered = useMemo(() => {
    if (filter === "all") return evidences;
    if (filter === "pdf") {
      return evidences.filter((e) => {
        const t = String(e.file_type || "").toLowerCase();
        return t === "pdf" || String(e.file_url || "").toLowerCase().endsWith(".pdf");
      });
    }
    return evidences.filter((e) => {
      const t = String(e.file_type || "").toLowerCase();
      const isPdf = t === "pdf" || String(e.file_url || "").toLowerCase().endsWith(".pdf");
      return !isPdf;
    });
  }, [evidences, filter]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <PhotoIcon className="h-4 w-4 text-blue-500" />
            Evidence uploaded
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {counts.all ? (
              <>
                <span className="font-semibold text-slate-800">{counts.all}</span> file(s) •{" "}
                <span className="font-semibold text-slate-800">{counts.pdf}</span> PDF •{" "}
                <span className="font-semibold text-slate-800">{counts.img}</span> image
              </>
            ) : (
              "No files yet"
            )}
          </div>
        </div>

        {counts.all ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter("all")}
              className={cx(
                "rounded-2xl border px-3 py-2 text-xs font-semibold transition",
                filter === "all" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 hover:bg-slate-50"
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilter("pdf")}
              className={cx(
                "flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition",
                filter === "pdf" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 hover:bg-slate-50"
              )}
            >
              <DocumentTextIcon className="h-4 w-4" />
              PDF
            </button>
            <button
              onClick={() => setFilter("image")}
              className={cx(
                "flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition",
                filter === "image" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 hover:bg-slate-50"
              )}
            >
              <PhotoIcon className="h-4 w-4" />
              Images
            </button>
          </div>
        ) : null}
      </div>

      {!counts.all ? (
        <div className="mt-4 text-sm text-slate-600">
          No evidence uploaded yet.
          <div className="mt-1 text-xs text-slate-500">Once the school uploads proof, it will appear here.</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-slate-700">
          No files match this filter.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((e) => (
            <EvidenceCard key={e.id} e={e} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyDonations() {
  const [tab, setTab] = useState<"donations" | "requests">("requests");

  const [draftSearch, setDraftSearch] = useState("");
  const debouncedSearch = useDebounced(draftSearch, 350);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"paid" | "pending" | "all">("paid");

  const [loadingDonations, setLoadingDonations] = useState(true);
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [donationsTotal, setDonationsTotal] = useState(0);
  const [donationsPage, setDonationsPage] = useState(1);
  const donationsLimit = 10;

  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requests, setRequests] = useState<DonatedRequestRow[]>([]);
  const [reqTotal, setReqTotal] = useState(0);
  const [reqPage, setReqPage] = useState(1);
  const reqLimit = 10;

  const [err, setErr] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<RequestDetailRes["project"] | null>(null);
  const [selectedReq, setSelectedReq] = useState<DonatedRequestRow | null>(null);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  const [allocationOpen, setAllocationOpen] = useState(false);
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [allocationData, setAllocationData] = useState<DonationAllocationRes | null>(null);

  const [thumbs, setThumbs] = useState<Record<number, { request_image?: string | null; school_logo?: string | null }>>(
    {}
  );
  const inflight = useRef<Set<number>>(new Set());

  const donationsPages = useMemo(() => Math.max(1, Math.ceil(donationsTotal / donationsLimit)), [donationsTotal]);
  const reqPages = useMemo(() => Math.max(1, Math.ceil(reqTotal / reqLimit)), [reqTotal]);

  const fetchThumbForRequest = async (requestId: number) => {
    if (!requestId || requestId <= 0) return;
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
      setThumbs((prev) => ({ ...prev, [requestId]: { request_image: null, school_logo: null } }));
    } finally {
      inflight.current.delete(requestId);
    }
  };

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

  const fetchDonatedRequests = async () => {
    setLoadingRequests(true);
    setErr(null);

    try {
      const res = await axios.get(MY_REQUEST_ALLOCATIONS, {
        withCredentials: true,
        params: { search, status, page: reqPage, limit: reqLimit },
      });

      const rows: RequestAllocationRow[] = res.data?.requests ?? [];
      const total = Number(res.data?.total ?? rows.length);

      setRequests(
        rows.map((r) => ({
          request_id: r.request_id,
          request_title: r.request_title,
          school_name: r.school_name,
          province: r.province,
          district: r.district,
          total_donated: Number(r.total_allocated) || 0,
          donations_count: Number(r.allocations_count) || 0,
          last_donated_at: r.last_allocated_at ?? null,
          first_donation_id: null,
        }))
      );
      setReqTotal(total);

      setLoadingRequests(false);
      return;
    } catch {
      // fallback below
    }

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
        const id = d.request_id ? Number(d.request_id) : 0;
        if (!id) continue;

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

  const openEvidenceDrawer = async (r: DonatedRequestRow) => {
    setSelectedReq(r);
    setDrawerOpen(true);
    setDetail(null);
    setDetailLoading(true);

    try {
      const res = await axios.get<RequestDetailRes>(REQUEST_DETAIL(r.request_id), { withCredentials: true });
      setDetail(res.data?.project ?? null);

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

  const openAllocation = async (donationId: number) => {
    setAllocationOpen(true);
    setAllocationLoading(true);
    setAllocationData(null);

    try {
      const res = await axios.get<DonationAllocationRes>(ALLOCATION_ENDPOINT(donationId), { withCredentials: true });
      setAllocationData(res.data ?? null);
    } catch {
      setAllocationData(null);
    } finally {
      setAllocationLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "donations") fetchDonations();
    if (tab === "requests") fetchDonatedRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, donationsPage, reqPage, status, search]);

  useEffect(() => {
    setSearch(debouncedSearch.trim());
    setDonationsPage(1);
    setReqPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const refresh = () => (tab === "donations" ? fetchDonations() : fetchDonatedRequests());

  const stats = useMemo(() => {
    const list = tab === "donations" ? donations : [];
    const paidCount = list.filter((d) => String(d.status).toLowerCase() === "paid").length;
    const pendingCount = list.filter((d) => String(d.status).toLowerCase() === "pending").length;
    const sum = list.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

    const reqSum = requests.reduce((acc, r) => acc + (Number(r.total_donated) || 0), 0);
    const reqCount = reqTotal;

    return { sum, paidCount, pendingCount, reqSum, reqCount };
  }, [donations, requests, reqTotal, tab]);

  return (
    <div className="w-full px-3 pb-10 text-slate-700 sm:px-0">
      <SectionTitle
        title="My Donations"
        subtitle="Track your donations and open evidence for donated requests."
        right={
          <button
            onClick={refresh}
            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Refresh
          </button>
        }
      />

      {/* Summary row */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label={tab === "donations" ? "Total (this page list)" : "Total allocated (requests page)"}
          value={formatLKR(tab === "donations" ? stats.sum : stats.reqSum)}
          hint={tab === "donations" ? "Based on currently loaded donations list" : "Based on request allocations"}
          icon={<ReceiptPercentIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Status"
          value={
            tab === "donations"
              ? `${stats.paidCount} Paid • ${stats.pendingCount} Pending`
              : status === "all"
              ? "Paid + Pending"
              : status === "paid"
              ? "Paid"
              : "Pending"
          }
          hint="Use filters below to change"
          icon={<CheckCircleIcon className="h-5 w-5" />}
        />
        <StatCard
          label={tab === "requests" ? "Donated requests" : "Total donations"}
          value={tab === "requests" ? String(stats.reqCount) : String(donationsTotal)}
          hint={tab === "requests" ? "Grouped by request" : "Across all pages"}
          icon={<BuildingOffice2Icon className="h-5 w-5" />}
        />
      </div>

      {/* Tabs + Filters */}
      <div className="sticky top-[10px] z-[5] mt-5">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Segmented
                value={tab}
                onChange={(v) => {
                  setTab(v as any);
                  setDonationsPage(1);
                  setReqPage(1);
                }}
                items={[
                  { key: "requests", label: "Donated Requests (Evidence)", icon: <Squares2X2Icon className="h-4 w-4" /> },
                  { key: "donations", label: "Donations List", icon: <ListBulletIcon className="h-4 w-4" /> },
                ]}
              />

              <div className="flex items-center gap-2">
                {status === "paid" ? (
                  <Pill tone="emerald" icon={<CheckCircleIcon className="h-3.5 w-3.5" />}>
                    PAID
                  </Pill>
                ) : null}
                {status === "pending" ? (
                  <Pill tone="amber" icon={<ClockIcon className="h-3.5 w-3.5" />}>
                    PENDING
                  </Pill>
                ) : null}
                {status === "all" ? <Pill tone="slate">ALL</Pill> : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <label className="text-xs font-semibold text-slate-600">Search</label>
                <div className="relative mt-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={draftSearch}
                    onChange={(e) => setDraftSearch(e.target.value)}
                    placeholder="Search by request title / school / district / province..."
                    className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  {draftSearch ? (
                    <button
                      onClick={() => setDraftSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      title="Clear"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  ) : null}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Tip: typing auto-applies (debounced). Status changes apply instantly.
                </div>
              </div>

              <div className="lg:col-span-3">
                <label className="text-xs font-semibold text-slate-600">Status</label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as any);
                    setDonationsPage(1);
                    setReqPage(1);
                  }}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="all">All</option>
                </select>
              </div>

              <div className="flex items-end lg:col-span-2">
                <button
                  onClick={() => refresh()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <ArrowPathIcon className="h-5 w-5 text-slate-500" />
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {err ? (
        <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-800">
          <div className="font-semibold">Something went wrong</div>
          <div className="mt-1 text-sm">{err}</div>
        </div>
      ) : null}

      {/* Content */}
      <div className="mt-6">
        {tab === "donations" && (
          <>
            {loadingDonations ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : donations.length === 0 ? (
              <EmptyState
                icon={<ReceiptPercentIcon className="h-6 w-6" />}
                title="No donations found"
                desc="Try changing filters or clearing search."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {donations.map((d) => {
                  const reqId = d.request_id ? Number(d.request_id) : 0;
                  const isDirectFund = !reqId;

                  const t = !isDirectFund ? thumbs[reqId] : undefined;

                  const requestImage = isDirectFund ? null : d.request_image_url ?? t?.request_image ?? null;
                  const schoolLogo = d.school_logo_url ?? (isDirectFund ? null : t?.school_logo ?? null);

                  const title = isDirectFund ? "School Fund" : d.request_title || `Request #${reqId}`;
                  const schoolName = d.school_name?.trim() ? d.school_name : "School";

                  return (
                    <div
                      key={d.donation_id}
                      className={cx(
                        "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition",
                        "hover:border-slate-300 hover:shadow-md"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <Avatar
                          label={schoolName}
                          requestId={reqId}
                          requestImage={requestImage}
                          schoolLogo={schoolLogo}
                          getThumb={(id) => {
                            if (id > 0) fetchThumbForRequest(id);
                          }}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-base font-semibold text-slate-800">{title}</div>

                              <div className="mt-1 flex items-center gap-2 truncate text-xs text-slate-500">
                                <BuildingOffice2Icon className="h-4 w-4 text-slate-400" />
                                <span className="font-medium text-slate-600">{schoolName}</span>
                                {(d.province || d.district) && (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPinIcon className="h-4 w-4 text-slate-400" />
                                    {d.province ? d.province : ""}
                                    {d.district ? ` • ${d.district}` : ""}
                                  </span>
                                )}
                              </div>

                              <div className="mt-3 flex items-center gap-2">
                                <Pill tone={statusTone(d.status)} icon={statusIcon(d.status) || undefined}>
                                  {String(d.status).toUpperCase()}
                                </Pill>
                                <Pill tone="indigo">#{d.donation_id}</Pill>
                                {isDirectFund ? <Pill tone="slate">SCHOOL FUND</Pill> : <Pill tone="slate">CAMPAIGN</Pill>}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="font-semibold text-slate-700">{formatLKR(Number(d.amount) || 0)}</div>
                              <div className="mt-1 text-xs text-slate-500">{d.time || new Date(d.created_at).toLocaleString()}</div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-end gap-2">
                            <button
                              onClick={() => openAllocation(d.donation_id)}
                              className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              <Squares2X2Icon className="h-4 w-4 text-slate-500" />
                              View Allocation
                            </button>

                            <button
                              onClick={() => openReceipt(d.donation_id)}
                              className="flex items-center gap-2 rounded-2xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              <ReceiptPercentIcon className="h-4 w-4" />
                              View Receipt
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                Page <span className="font-semibold text-slate-800">{donationsPage}</span> / {donationsPages} • Total{" "}
                <span className="font-semibold text-slate-800">{donationsTotal}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={donationsPage <= 1}
                  onClick={() => setDonationsPage((p) => Math.max(1, p - 1))}
                  className={cx(
                    "rounded-2xl border px-4 py-2 text-sm font-semibold",
                    donationsPage <= 1 ? "border-slate-200 text-slate-400" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Prev
                </button>
                <button
                  disabled={donationsPage >= donationsPages}
                  onClick={() => setDonationsPage((p) => Math.min(donationsPages, p + 1))}
                  className={cx(
                    "rounded-2xl border px-4 py-2 text-sm font-semibold",
                    donationsPage >= donationsPages ? "border-slate-200 text-slate-400" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {tab === "requests" && (
          <>
            {loadingRequests ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <EmptyState icon={<GiftIcon />} title="No donated requests" desc="Donate to a request and it will appear here." />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {requests.map((r) => {
                  const t = thumbs[r.request_id];
                  const requestImage = t?.request_image ?? null;
                  const schoolLogo = t?.school_logo ?? null;

                  return (
                    <button
                      key={r.request_id}
                      onClick={() => openEvidenceDrawer(r)}
                      className={cx(
                        "group w-full rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition",
                        "hover:-translate-y-[2px] hover:border-slate-300 hover:shadow-md"
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
                              <div className="truncate text-base font-semibold text-slate-800">{r.request_title}</div>

                              <div className="mt-1 flex items-center gap-2 truncate text-xs text-slate-500">
                                <BuildingOffice2Icon className="h-4 w-4 text-slate-400" />
                                <span className="font-medium text-slate-600">{r.school_name || "School"}</span>
                                {(r.province || r.district) && (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPinIcon className="h-4 w-4 text-slate-400" />
                                    {r.province ? r.province : ""}
                                    {r.district ? ` • ${r.district}` : ""}
                                  </span>
                                )}
                              </div>

                              <div className="mt-3 flex items-center gap-2">
                                <Pill tone="indigo">Request #{r.request_id}</Pill>
                                <Pill tone="slate">
                                  {r.donations_count} record{r.donations_count === 1 ? "" : "s"}
                                </Pill>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="font-semibold text-slate-700">{formatLKR(Number(r.total_donated) || 0)}</div>
                              {r.last_donated_at ? (
                                <div className="mt-1 flex items-center justify-end gap-1 text-xs text-slate-500">
                                  <ClockIcon className="h-4 w-4 text-slate-400" />
                                  {new Date(r.last_donated_at).toLocaleString()}
                                </div>
                              ) : (
                                <div className="mt-1 text-xs text-slate-400">—</div>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-end">
                            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                              <EyeIcon className="h-4 w-4" />
                              View evidence
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                Page <span className="font-semibold text-slate-800">{reqPage}</span> / {reqPages} • Total{" "}
                <span className="font-semibold text-slate-800">{reqTotal}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={reqPage <= 1}
                  onClick={() => setReqPage((p) => Math.max(1, p - 1))}
                  className={cx(
                    "rounded-2xl border px-4 py-2 text-sm font-semibold",
                    reqPage <= 1 ? "border-slate-200 text-slate-400" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Prev
                </button>
                <button
                  disabled={reqPage >= reqPages}
                  onClick={() => setReqPage((p) => Math.min(reqPages, p + 1))}
                  className={cx(
                    "rounded-2xl border px-4 py-2 text-sm font-semibold",
                    reqPage >= reqPages ? "border-slate-200 text-slate-400" : "border-slate-200 text-slate-600 hover:bg-slate-50"
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
            {/* Request summary */}
            <div className="rounded-3xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <DocumentTextIcon className="h-4 w-4 text-blue-500" />
                    Request
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-800">{detail.request_title}</div>
                  {detail.category ? (
                    <div className="mt-2">
                      <Pill tone="indigo">{String(detail.category).toUpperCase()}</Pill>
                    </div>
                  ) : null}
                </div>
                {detail.status ? (
                  <Pill tone={statusTone(detail.status)} icon={statusIcon(detail.status) || undefined}>
                    {String(detail.status).toUpperCase()}
                  </Pill>
                ) : null}
              </div>

              {detail.description ? <div className="mt-3 text-sm text-slate-600">{detail.description}</div> : null}

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-500">Goal</div>
                  <div className="font-semibold text-slate-800">{formatLKR(Number(detail.estimated_price) || 0)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-500">Raised</div>
                  <div className="font-semibold text-slate-800">{formatLKR(Number(detail.amount_raised) || 0)}</div>
                </div>
              </div>

              <div className="mt-4">
                {(() => {
                  const goal = Number(detail.estimated_price) || 0;
                  const raised = Number(detail.amount_raised) || 0;
                  const pct = goal > 0 ? (raised / goal) * 100 : 0;
                  return (
                    <>
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                        <span className="font-medium">Progress</span>
                        <span className="font-medium">{Math.round(Math.max(0, Math.min(100, pct)))}%</span>
                      </div>
                      <ProgressBar value={pct} />
                    </>
                  );
                })()}
              </div>
            </div>

            {/* School info */}
            <div className="rounded-3xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <BuildingOffice2Icon className="h-4 w-4 text-blue-500" />
                School
              </div>
              <div className="mt-1 font-semibold text-slate-800">{detail.school?.school_name || "School"}</div>

              <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <MapPinIcon className="h-4 w-4 text-slate-400" />
                <span>
                  {detail.school?.province ? `${detail.school.province}` : ""}
                  {detail.school?.district ? ` • ${detail.school.district}` : ""}
                </span>
              </div>

              {detail.school?.address ? (
                <div className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                  <MapPinIcon className="mt-0.5 h-4 w-4 text-slate-400" />
                  <span>{detail.school.address}</span>
                </div>
              ) : null}

              {(detail.school?.contact_email || detail.school?.contact_phone) && (
                <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  {detail.school?.contact_email ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-500">Email</div>
                      <div className="break-all font-medium text-slate-700">{detail.school.contact_email}</div>
                    </div>
                  ) : null}
                  {detail.school?.contact_phone ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-500">Phone</div>
                      <div className="break-all font-medium text-slate-700">{detail.school.contact_phone}</div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Evidence */}
            <EvidenceSection evidences={detail.evidences || []} />
          </div>
        )}
      </Drawer>

      {/* Receipt Modal */}
      <ReceiptModal open={receiptOpen} onClose={() => setReceiptOpen(false)} receipt={receipt} loading={receiptLoading} />

      {/* Allocation Modal */}
      <AllocationModal open={allocationOpen} onClose={() => setAllocationOpen(false)} data={allocationData} loading={allocationLoading} />
    </div>
  );
}