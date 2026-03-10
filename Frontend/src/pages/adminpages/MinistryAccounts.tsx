import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000/api";
const ACCOUNTS_API = `${API_BASE}/ministry/accounts`;

type MinistryAccount = {
  id: number;
  name: string;
  email: string;
  is_active: number | boolean;
  created_at?: string;
  updated_at?: string;
};

type FormState = {
  name: string;
  email: string;
  password: string;
  is_active: boolean;
};

const cx = (...s: Array<string | false | null | undefined>) =>
  s.filter(Boolean).join(" ");

const emptyForm: FormState = {
  name: "",
  email: "",
  password: "",
  is_active: true,
};

const fmtDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

export default function AdminMinistryAccounts() {
  const [rows, setRows] = useState<MinistryAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(ACCOUNTS_API, {
        params: { search },
      });
      setRows(res.data?.accounts || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load ministry accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) =>
      [r.name, r.email, String(r.id)].some((v) =>
        String(v || "").toLowerCase().includes(q)
      )
    );
  }, [rows, search]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setOpenForm(false);
  };

  const handleOpenCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setOpenForm(true);
  };

  const handleOpenEdit = (row: MinistryAccount) => {
    setForm({
      name: row.name || "",
      email: row.email || "",
      password: "",
      is_active: !!row.is_active,
    });
    setEditingId(row.id);
    setOpenForm(true);
  };

  const handleChange = (
    key: keyof FormState,
    value: string | boolean
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return alert("Name is required");
    if (!form.email.trim()) return alert("Email is required");
    if (!editingId && !form.password.trim()) return alert("Password is required for new account");

    try {
      setSaving(true);

      const payload: any = {
        name: form.name,
        email: form.email,
        is_active: form.is_active ? 1 : 0,
      };

      if (form.password.trim()) {
        payload.password = form.password;
      }

      if (editingId) {
        await axios.put(`${ACCOUNTS_API}/${editingId}`, payload);
      } else {
        await axios.post(ACCOUNTS_API, payload);
      }

      await loadAccounts();
      resetForm();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to save account");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      setBusyId(id);
      await axios.patch(`${ACCOUNTS_API}/${id}/toggle`);
      setRows((prev) =>
        prev.map((row) =>
          row.id === id
            ? { ...row, is_active: row.is_active ? 0 : 1 }
            : row
        )
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update account status");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Ministry Account Management
          </h1>
          <p className="text-sm text-slate-500">
            Admin can create, edit, and activate/deactivate ministry accounts
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-80 rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
          />
          <button
            onClick={handleOpenCreate}
            className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            + Add Ministry Account
          </button>
        </div>
      </div>

      {openForm && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">
            {editingId ? "Edit Ministry Account" : "Create Ministry Account"}
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
                placeholder="Enter email"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Password {editingId ? "(leave blank to keep current)" : ""}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
                placeholder="Enter password"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                value={form.is_active ? "1" : "0"}
                onChange={(e) => handleChange("is_active", e.target.value === "1")}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className={cx(
                "rounded-xl px-5 py-2 font-medium text-white",
                saving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {saving ? "Saving..." : editingId ? "Update Account" : "Create Account"}
            </button>

            <button
              onClick={resetForm}
              className="rounded-xl border border-slate-300 px-5 py-2 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">ID</th>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Created At</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Loading ministry accounts...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No ministry accounts found
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const active = !!row.is_active;

                  return (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{row.id}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                      <td className="px-4 py-3 text-slate-600">{row.email}</td>
                      <td className="px-4 py-3 text-slate-600">{fmtDate(row.created_at)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cx(
                            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                            active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          )}
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(row)}
                            className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white hover:bg-amber-600"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleToggle(row.id)}
                            disabled={busyId === row.id}
                            className={cx(
                              "rounded-lg px-3 py-2 text-xs font-medium text-white",
                              active
                                ? "bg-red-500 hover:bg-red-600"
                                : "bg-blue-600 hover:bg-blue-700",
                              busyId === row.id && "opacity-60"
                            )}
                          >
                            {busyId === row.id
                              ? "Updating..."
                              : active
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}