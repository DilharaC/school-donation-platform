// src/pages/donorpages/settings.tsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000/api";

const ME = `${API_BASE}/donor/me`; // GET
const UPDATE_ME = `${API_BASE}/donor/me`; // POST (or PUT)
const CHANGE_PASSWORD = `${API_BASE}/donor/security/change-password`; // POST
const EXPORT_DONATIONS = `${API_BASE}/donor/exports/donations`; // GET blob

type Donor = {
  donor_id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  created_at?: string | null;
  status?: string | null;
};

type TabKey = "profile" | "security" | "exports" | "danger";

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cx("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>{children}</div>
);

const Pill = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span
    className={cx(
      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
      className
    )}
  >
    {children}
  </span>
);

const Input = ({
  label,
  value,
  onChange,
  type = "text",
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
}) => (
  <label className="block">
    <div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>
    <input
      type={type}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cx(
        "w-full rounded-xl border px-3 py-2 text-sm text-slate-700 outline-none focus:ring-4",
        "border-slate-200 focus:ring-blue-100",
        disabled ? "cursor-not-allowed bg-slate-100 text-slate-500" : "bg-white"
      )}
    />
  </label>
);

const TextArea = ({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) => (
  <label className="block">
    <div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>
    <textarea
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      className={cx(
        "w-full rounded-xl border px-3 py-2 text-sm text-slate-700 outline-none focus:ring-4",
        "border-slate-200 focus:ring-blue-100",
        disabled ? "cursor-not-allowed bg-slate-100 text-slate-500" : "bg-white"
      )}
    />
  </label>
);

const Tabs = ({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) => {
  const items: Array<{ k: TabKey; t: string }> = [
    { k: "profile", t: "Profile" },
    { k: "security", t: "Security" },
    { k: "exports", t: "Exports" },
  
  ];

  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
      {items.map((x) => (
        <button
          key={x.k}
          onClick={() => onChange(x.k)}
          className={cx(
            "rounded-xl px-4 py-2 text-sm font-semibold transition",
            active === x.k ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
          )}
        >
          {x.t}
        </button>
      ))}
    </div>
  );
};

export default function DonorSettings() {
  const api = useMemo(
    () => axios.create({ withCredentials: true, headers: { Accept: "application/json" } }),
    []
  );

  const [tab, setTab] = useState<TabKey>("profile");

  const [donor, setDonor] = useState<Donor | null>(null);

  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [pw, setPw] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadMe = async () => {
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await api.get(ME);
      const d = (res.data?.donor || res.data) as Donor;

      setDonor(d);
      setProfile({
        full_name: d.full_name || "",
        email: d.email || "",
        phone: d.phone || "",
        address: d.address || "",
      });
    } catch (e: any) {
      setDonor(null);
      setErr(e?.response?.data?.message || "Unauthenticated. Please login as donor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    setMsg(null);
    setErr(null);

    if (!profile.full_name.trim()) {
      setSaving(false);
      setErr("Full name is required.");
      return;
    }
    if (!profile.email.trim()) {
      setSaving(false);
      setErr("Email is required.");
      return;
    }

    try {
      const res = await api.post(UPDATE_ME, {
        full_name: profile.full_name.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim() || null,
        address: profile.address.trim() || null,
      });

      const d = (res.data?.donor || res.data) as Donor;
      setDonor(d);
      setMsg("Profile updated.");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

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

  if (loading) return <div className="p-6 text-slate-500">Loading…</div>;

  if (!donor) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card className="p-6">
          <div className="text-xl font-semibold text-slate-800">Donor Settings</div>
          <div className="mt-2 text-sm font-medium text-rose-700">{err || "Unauthenticated"}</div>
          <button
            onClick={loadMe}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6 text-slate-700">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-semibold text-slate-800">Settings</div>
          <div className="text-sm text-slate-500">Profile, security, exports & account actions.</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill className="border-blue-200 bg-blue-50 text-blue-700">DONOR</Pill>
          <Pill className="border-slate-200 bg-slate-50 text-slate-600">{donor.email}</Pill>
        </div>
      </div>

      {/* Alerts */}
      {msg ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-medium text-emerald-800">
          {msg}
        </div>
      ) : null}
      {err ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-medium text-rose-800">
          {err}
        </div>
      ) : null}

      <div className="mt-5">
        <Tabs active={tab} onChange={setTab} />
      </div>

      <div className="mt-5">
        {/* Profile */}
        {tab === "profile" && (
          <Card className="p-6">
            <div className="text-lg font-semibold text-slate-800">Profile</div>
            <div className="mt-1 text-sm text-slate-500">Update your contact details.</div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Input
                label="Full name"
                value={profile.full_name}
                onChange={(v) => setProfile({ ...profile, full_name: v })}
              />
              <Input
                label="Email"
                value={profile.email}
                onChange={(v) => setProfile({ ...profile, email: v })}
              />

              <Input
                label="Phone"
                value={profile.phone}
                onChange={(v) => setProfile({ ...profile, phone: v })}
                placeholder="07XXXXXXXX"
              />
              <div />
              <div className="md:col-span-2">
                <TextArea
                  label="Address"
                  value={profile.address}
                  onChange={(v) => setProfile({ ...profile, address: v })}
                  placeholder="Your address..."
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                disabled={saving}
                onClick={saveProfile}
                className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </Card>
        )}

        {/* Security */}
        {tab === "security" && (
          <Card className="p-6">
            <div className="text-lg font-semibold text-slate-800">Change Password</div>
            <div className="mt-1 text-sm text-slate-500">Keep your account secure.</div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Input
                label="Current Password"
                type="password"
                value={pw.current_password}
                onChange={(v) => setPw({ ...pw, current_password: v })}
              />
              <div />
              <Input
                label="New Password"
                type="password"
                value={pw.new_password}
                onChange={(v) => setPw({ ...pw, new_password: v })}
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={pw.confirm_password}
                onChange={(v) => setPw({ ...pw, confirm_password: v })}
              />
            </div>

            <div className="mt-5 flex justify-end">
              <button
                disabled={saving}
                onClick={changePassword}
                className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Update Password"}
              </button>
            </div>
          </Card>
        )}

        {/* Exports */}
        {tab === "exports" && (
          <Card className="p-6">
            <div className="text-lg font-semibold text-slate-800">Exports</div>
            <div className="mt-1 text-sm text-slate-500">Download your donations as CSV.</div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Card className="p-5">
                <div className="text-sm font-semibold text-slate-800">My Donations CSV</div>
                <div className="mt-1 text-xs text-slate-500">All your donations (paid + pending).</div>
                <button
                  onClick={() => download(EXPORT_DONATIONS, "my_donations.csv")}
                  className="mt-4 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Download
                </button>
              </Card>
            </div>
          </Card>
        )}

        
      </div>
    </div>
  );
}