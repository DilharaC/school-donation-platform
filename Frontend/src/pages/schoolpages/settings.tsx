import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000/api";

const ME = `${API_BASE}/school/me`; // GET
const UPDATE_ME = `${API_BASE}/school/me`; // POST multipart (you already use this)
const CHANGE_PASSWORD = `${API_BASE}/school/security/change-password`; // POST
const PRIVACY_GET = `${API_BASE}/school/privacy`; // GET
const PRIVACY_SAVE = `${API_BASE}/school/privacy`; // POST
const EXPORT_DONATIONS = `${API_BASE}/school/exports/donations`; // GET (download)
const EXPORT_CAMPAIGNS = `${API_BASE}/school/exports/campaigns`; // GET (download)
const DEACTIVATE = `${API_BASE}/school/deactivate`; // POST

type School = {
  school_id: number;
  school_name: string;
  registration_no?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;

  district?: string | null;
  province?: string | null;
  address?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  verified?: number;
  status?: string;
  need_score?: number;
    category?: string | null;
  level?: string | null;

  document_link?: string | null;
  logo_link?: string | null;

  // Branding extras (optional if you add columns)
  cover_link?: string | null;
  public_description?: string | null;
  theme_color?: string | null;

  // Privacy (optional if you add columns)
  show_contact_public?: number;     // 0/1
  show_donations_public?: number;   // 0/1
  allow_donor_contact?: number;     // 0/1
};

type Privacy = {
  show_contact_public: number;
  show_donations_public: number;
  allow_donor_contact: number;
};

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

const Card = ({ children, className }: any) => (
  <div className={cx("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>{children}</div>
);

const Pill = ({ children, className }: any) => (
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

const Toggle = ({ label, desc, value, onChange, disabled }: any) => (
  <div className={cx("flex items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4", disabled && "opacity-60")}>
    <div>
      <div className="text-sm font-extrabold text-slate-900">{label}</div>
      {desc && <div className="text-xs text-slate-500 mt-1">{desc}</div>}
    </div>
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={cx(
        "w-14 h-8 rounded-full border transition relative",
        value ? "bg-slate-900 border-slate-900" : "bg-slate-100 border-slate-200",
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      )}
    >
      <span
        className={cx(
          "absolute top-1 h-6 w-6 rounded-full bg-white shadow",
          value ? "left-7" : "left-1"
        )}
      />
    </button>
  </div>
);

const Input = ({ label, value, onChange, type = "text", disabled, placeholder }: any) => (
  <label className="block">
    <div className="text-xs font-extrabold text-slate-700 mb-1">{label}</div>
    <input
      type={type}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cx(
        "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-4",
        "border-slate-200 focus:ring-slate-200/60",
        disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"
      )}
    />
  </label>
);

const TextArea = ({ label, value, onChange, placeholder, disabled }: any) => (
  <label className="block">
    <div className="text-xs font-extrabold text-slate-700 mb-1">{label}</div>
    <textarea
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      className={cx(
        "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-4",
        "border-slate-200 focus:ring-slate-200/60",
        disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"
      )}
    />
  </label>
);

const Tabs = ({ active, onChange }: any) => {
  const items = [
    { k: "security", t: "Security" },          // (1)
    { k: "privacy", t: "Privacy" },            // (3)
    { k: "verification", t: "Verification" },  // (4)
    { k: "location", t: "Location" },          // (6)
   
    { k: "exports", t: "Exports" },            // (8)
    { k: "danger", t: "Danger Zone" },         // (9)
  ];
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
      {items.map((x) => (
        <button
          key={x.k}
          onClick={() => onChange(x.k)}
          className={cx(
            "px-4 py-2 rounded-xl text-sm font-extrabold transition",
            active === x.k ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
          )}
        >
          {x.t}
        </button>
      ))}
    </div>
  );
};

export default function SchoolSettings() {
  const api = useMemo(
    () => axios.create({ withCredentials: true, headers: { Accept: "application/json" } }),
    []
  );

  const [tab, setTab] = useState<"security" | "privacy" | "verification" | "location" | "exports" | "danger">("security");

  const [school, setSchool] = useState<School | null>(null);
  const [privacy, setPrivacy] = useState<Privacy>({ show_contact_public: 0, show_donations_public: 0, allow_donor_contact: 1 });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Security form
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm_password: "" });

  // Location / branding (only settings fields here)
  const [location, setLocation] = useState({ district: "", province: "", address: "", latitude: "", longitude: "" });
 





 

  const isLocked = Number(school?.verified || 0) === 1;

  const loadAll = async () => {
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const me = await api.get(ME);
      const s = me.data.school as School;
      setSchool(s);

      // location initial
      setLocation({
        district: s.district || "",
        province: s.province || "",
        address: s.address || "",
        latitude: s.latitude != null ? String(s.latitude) : "",
        longitude: s.longitude != null ? String(s.longitude) : "",
      });

   ;

      // privacy initial (load from endpoint; fallback to school fields if you store there)
      try {
        const pr = await api.get(PRIVACY_GET);
        setPrivacy(pr.data.privacy);
      } catch {
        setPrivacy({
          show_contact_public: Number(s.show_contact_public || 0),
          show_donations_public: Number(s.show_donations_public || 0),
          allow_donor_contact: Number(s.allow_donor_contact ?? 1),
        });
      }
    } catch (e: any) {
      setSchool(null);
      setErr(e?.response?.data?.message || "Unauthenticated. Please login as school.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Actions ----------
  const changePassword = async () => {
    setSaving(true);
    setMsg(null);
    setErr(null);

    if (!pw.current_password || !pw.new_password || !pw.confirm_password) {
      setSaving(false);
      setErr("Fill all password fields.");
      return;
    }
    if (pw.new_password.length < 6) {
      setSaving(false);
      setErr("New password must be at least 6 characters.");
      return;
    }
    if (pw.new_password !== pw.confirm_password) {
      setSaving(false);
      setErr("New password and confirm password do not match.");
      return;
    }

    try {
      await api.post(CHANGE_PASSWORD, {
        current_password: pw.current_password,
        new_password: pw.new_password,
      });
      setPw({ current_password: "", new_password: "", confirm_password: "" });
      setMsg("Password updated.");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Password change failed.");
    } finally {
      setSaving(false);
    }
  };

  const savePrivacy = async () => {
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      await api.post(PRIVACY_SAVE, privacy);
      setMsg("Privacy settings saved.");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to save privacy settings.");
    } finally {
      setSaving(false);
    }
  };

  const saveLocation = async () => {
    if (!school) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const fd = new FormData();
      // required fields for your updateMe validation
      fd.append("school_name", school.school_name || "");
      fd.append("contact_email", school.contact_email || "");
      fd.append("category", school.category || "Primary");
      fd.append("level", school.level || "All");

      fd.append("district", location.district);
      fd.append("province", location.province);
      fd.append("address", location.address);
      if (location.latitude !== "") fd.append("latitude", location.latitude);
      if (location.longitude !== "") fd.append("longitude", location.longitude);

      const res = await api.post(UPDATE_ME, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setSchool(res.data.school);
      setMsg("Location updated.");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to update location.");
    } finally {
      setSaving(false);
    }
  };

  const download = async (url: string, filename: string) => {
    setErr(null);
    setMsg(null);
    try {
      const res = await api.get(url, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
      setMsg("Download started.");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Download failed.");
    }
  };

  const deactivate = async () => {
    if (!confirm("Deactivate your school account? You can request re-activation from admin later.")) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      await api.post(DEACTIVATE);
      setMsg("Account deactivated. Please logout.");
      await loadAll();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to deactivate.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading…</div>;

  if (!school) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="p-6">
          <div className="text-xl font-extrabold text-slate-900">Settings</div>
          <div className="mt-2 text-sm text-rose-700 font-semibold">{err || "Unauthenticated"}</div>
          <button onClick={loadAll} className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white font-extrabold hover:bg-black">
            Retry
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="text-2xl font-extrabold text-slate-900">Settings</div>
          <div className="text-sm text-slate-500">Security, privacy, verification, location, exports & danger zone.</div>
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

      <div className="mt-5">
        <Tabs active={tab} onChange={setTab} />
      </div>

      {/* Content */}
      <div className="mt-5">
        {/* (1) Security */}
        {tab === "security" && (
          <Card className="p-6">
            <div className="text-lg font-extrabold text-slate-900">Change Password</div>
            <div className="text-sm text-slate-500 mt-1">Keep your account secure.</div>

            <div className="mt-5 grid md:grid-cols-2 gap-4">
              <Input label="Current Password" type="password" value={pw.current_password} onChange={(v: string) => setPw({ ...pw, current_password: v })} />
              <div />
              <Input label="New Password" type="password" value={pw.new_password} onChange={(v: string) => setPw({ ...pw, new_password: v })} />
              <Input label="Confirm New Password" type="password" value={pw.confirm_password} onChange={(v: string) => setPw({ ...pw, confirm_password: v })} />
            </div>

            <div className="mt-5 flex justify-end">
              <button
                disabled={saving}
                onClick={changePassword}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-extrabold hover:bg-black disabled:opacity-50"
              >
                {saving ? "Saving..." : "Update Password"}
              </button>
            </div>
          </Card>
        )}

        {/* (3) Privacy */}
        {tab === "privacy" && (
          <Card className="p-6">
            <div className="text-lg font-extrabold text-slate-900">Privacy & Visibility</div>
            <div className="text-sm text-slate-500 mt-1">Control what donors can see.</div>

            <div className="mt-5 grid gap-3">
              <Toggle
                label="Show contact details publicly"
                desc="If off, email/phone won’t be shown on public pages."
                value={!!privacy.show_contact_public}
                onChange={(v: boolean) => setPrivacy({ ...privacy, show_contact_public: v ? 1 : 0 })}
              />
              <Toggle
                label="Show donations list publicly"
                desc="If off, donations list is private to your school/admin."
                value={!!privacy.show_donations_public}
                onChange={(v: boolean) => setPrivacy({ ...privacy, show_donations_public: v ? 1 : 0 })}
              />
              <Toggle
                label="Allow donors to contact school"
                desc="If off, donors cannot send messages to your school."
                value={!!privacy.allow_donor_contact}
                onChange={(v: boolean) => setPrivacy({ ...privacy, allow_donor_contact: v ? 1 : 0 })}
              />
            </div>

            <div className="mt-5 flex justify-end">
              <button
                disabled={saving}
                onClick={savePrivacy}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-extrabold hover:bg-black disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Privacy"}
              </button>
            </div>
          </Card>
        )}

        {/* (4) Verification */}
        {tab === "verification" && (
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-6">
              <div className="text-lg font-extrabold text-slate-900">Verification Status</div>
              <div className="text-sm text-slate-500 mt-1">Checklist used by admin.</div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div className="font-bold text-slate-900">Registration Number</div>
                  <div className={cx("font-extrabold", school.registration_no ? "text-emerald-700" : "text-rose-700")}>
                    {school.registration_no ? "✅ Provided" : "❌ Missing"}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div className="font-bold text-slate-900">Verification Document</div>
                  <div className={cx("font-extrabold", school.document_link ? "text-emerald-700" : "text-rose-700")}>
                    {school.document_link ? "✅ Uploaded" : "❌ Missing"}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div className="font-bold text-slate-900">Verified by Admin</div>
                  <div className={cx("font-extrabold", school.verified ? "text-blue-700" : "text-amber-700")}>
                    {school.verified ? "✅ Verified" : "⏳ Pending"}
                  </div>
                </div>

                {isLocked && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                    🔒 After verification: Registration No + Verification Document are locked.
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <div className="text-lg font-extrabold text-slate-900">Open Uploaded Files</div>
              <div className="text-sm text-slate-500 mt-1">Read-only access.</div>

              <div className="mt-5 space-y-3">
                <a
                  className={cx(
                    "block rounded-2xl border p-4 font-extrabold",
                    school.document_link ? "border-slate-200 hover:bg-slate-50 text-slate-900" : "border-slate-200 text-slate-400"
                  )}
                  href={school.document_link || undefined}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => !school.document_link && e.preventDefault()}
                >
                  Verification Document
                </a>

                <a
                  className={cx(
                    "block rounded-2xl border p-4 font-extrabold",
                    school.logo_link ? "border-slate-200 hover:bg-slate-50 text-slate-900" : "border-slate-200 text-slate-400"
                  )}
                  href={school.logo_link || undefined}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => !school.logo_link && e.preventDefault()}
                >
                  Logo
                </a>
              </div>
            </Card>
          </div>
        )}

        {/* (6) Location */}
        {tab === "location" && (
          <Card className="p-6">
            <div className="text-lg font-extrabold text-slate-900">Location Settings</div>
            <div className="text-sm text-slate-500 mt-1">Used for maps and district/province filters.</div>

            <div className="mt-5 grid md:grid-cols-2 gap-4">
              <Input label="District" value={location.district} onChange={(v: string) => setLocation({ ...location, district: v })} />
              <Input label="Province" value={location.province} onChange={(v: string) => setLocation({ ...location, province: v })} />
              <Input label="Latitude" type="number" value={location.latitude} onChange={(v: string) => setLocation({ ...location, latitude: v })} placeholder="6.9271" />
              <Input label="Longitude" type="number" value={location.longitude} onChange={(v: string) => setLocation({ ...location, longitude: v })} placeholder="79.8612" />
              <div className="md:col-span-2">
                <TextArea label="Address" value={location.address} onChange={(v: string) => setLocation({ ...location, address: v })} placeholder="School address..." />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                disabled={saving}
                onClick={saveLocation}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-extrabold hover:bg-black disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Location"}
              </button>
            </div>
          </Card>
        )}

       

        {/* (8) Exports */}
        {tab === "exports" && (
          <Card className="p-6">
            <div className="text-lg font-extrabold text-slate-900">Exports</div>
            <div className="text-sm text-slate-500 mt-1">Download your data as CSV.</div>

            <div className="mt-5 grid md:grid-cols-2 gap-4">
              <Card className="p-5">
                <div className="text-sm font-extrabold text-slate-900">Donations CSV</div>
                <div className="text-xs text-slate-500 mt-1">All donations for your school (paid + pending).</div>
                <button
                  onClick={() => download(EXPORT_DONATIONS, "donations.csv")}
                  className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white font-extrabold hover:bg-black"
                >
                  Download
                </button>
              </Card>

              <Card className="p-5">
                <div className="text-sm font-extrabold text-slate-900">Campaigns CSV</div>
                <div className="text-xs text-slate-500 mt-1">Your donation requests list.</div>
                <button
                  onClick={() => download(EXPORT_CAMPAIGNS, "campaigns.csv")}
                  className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white font-extrabold hover:bg-black"
                >
                  Download
                </button>
              </Card>
            </div>
          </Card>
        )}

        {/* (9) Danger Zone */}
        {tab === "danger" && (
          <Card className="p-6 border-rose-200">
            <div className="text-lg font-extrabold text-rose-700">Danger Zone</div>
            <div className="text-sm text-slate-500 mt-1">These actions can affect your account visibility.</div>

            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="text-sm font-extrabold text-rose-800">Deactivate School Account</div>
              <div className="text-xs text-rose-700 mt-1">
                Your school will become inactive and not visible publicly. Admin can re-activate later.
              </div>
              <button
                disabled={saving}
                onClick={deactivate}
                className="mt-4 px-4 py-2 rounded-xl bg-rose-700 text-white font-extrabold hover:bg-rose-800 disabled:opacity-50"
              >
                {saving ? "Working..." : "Deactivate"}
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}