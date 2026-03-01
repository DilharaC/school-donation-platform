// src/components/DonorRegisterModal.tsx (FULL)
// ✅ Same UI/UX as LoginModal (backdrop, animation, ESC close, scroll lock)
// ✅ Registers donor -> auto logs in -> saves currentUser -> dispatches "auth:changed" -> redirects if needed

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

type User = {
  userType: "donor" | "school";
  name?: string;
  donorName?: string;
  schoolName?: string;
  email?: string;
};

type RegisterResponse = {
  message?: string;
  donor?: {
    donor_id?: number;
    full_name?: string;
    email?: string;
    phone?: string | null;
    address?: string | null;
  };
};

type LoginResponse = {
  success: boolean;
  user?: User;
  message?: string;
};

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

export default function DonorRegisterModal({
  open,
  onClose,
  setCurrentUser,
  leftImageUrl = "/images/login-left.jpg",
}: {
  open: boolean;
  onClose: () => void;
  setCurrentUser: (u: any) => void;
  leftImageUrl?: string;
}) {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // axios defaults once
  useEffect(() => {
    axios.defaults.baseURL = "http://localhost:8000";
    axios.defaults.withCredentials = true;
  }, []);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && resetAndClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const resetAndClose = () => {
    setError("");
    setLoading(false);
    setFullName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setPassword("");
    setConfirmPassword("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // ✅ Sanctum CSRF
      await axios.get("/sanctum/csrf-cookie");

      // ✅ Register donor (make sure your route matches this)
      // Laravel controller: DonorController@register
      await axios.post<RegisterResponse>("/api/donor/register", {
        full_name: fullName,
        email,
        password,
        phone: phone || null,
        address: address || null,
      });

      // ✅ Auto-login immediately (same flow as LoginModal)
      const loginRes = await axios.post<LoginResponse>("/api/login", {
        identifier: email,
        password,
      });

      if (!loginRes.data?.success || !loginRes.data?.user) {
        setError(loginRes.data?.message || "Registered, but auto-login failed. Please login.");
        return;
      }

      localStorage.setItem("currentUser", JSON.stringify(loginRes.data.user));
      setCurrentUser(loginRes.data.user);

      // update same-tab listeners
      window.dispatchEvent(new Event("auth:changed"));

      // redirect after register/login if set (same key you use in LoginModal)
      const redirect = sessionStorage.getItem("afterLoginRedirect");
      if (redirect) {
        sessionStorage.removeItem("afterLoginRedirect");
        resetAndClose();
        navigate(redirect);
        return;
      }

      resetAndClose();
    } catch (err: any) {
      // Laravel validation errors often come as { message, errors: {...} }
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(" ")
          : null) ||
        "Server error.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
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
            "w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl grid md:grid-cols-2",
            "transition-all duration-300 ease-out will-change-transform will-change-opacity",
            open ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-95"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left image panel */}
          <div className="relative hidden md:block h-[520px]">
            <img src={leftImageUrl} alt="Register" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/40" />

            <div className="relative p-10 text-white h-full flex flex-col">
              <div className="text-3xl font-extrabold tracking-tight">Join as a donor</div>

              <ul className="mt-6 space-y-3 text-sm font-semibold">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                    ✓
                  </span>
                  Donate to verified school requests
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                    ✓
                  </span>
                  See receipts & evidence updates
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                    ✓
                  </span>
                  Track your donation history
                </li>
              </ul>
            </div>
          </div>

          {/* Right register panel */}
          <div className="p-6 sm:p-8 md:p-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-extrabold text-slate-900">Create your donor account</div>
                <div className="text-sm text-slate-500 mt-1">Fill in your details to continue</div>
              </div>

              <button
                onClick={resetAndClose}
                className="h-10 w-10 rounded-xl hover:bg-slate-100 grid place-items-center transition"
                aria-label="Close"
              >
                <i className="bx bx-x text-2xl text-slate-700" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <div>
                <label className="text-xs font-extrabold text-slate-600">Full Name</label>
                <input
                  className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-rose-100 focus:border-rose-300"
                  placeholder="e.g. Chamuditha Dilhara"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-600">Email</label>
                <input
                  className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-rose-100 focus:border-rose-300"
                  placeholder="e.g. donor@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-600">Phone (optional)</label>
                  <input
                    className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-rose-100 focus:border-rose-300"
                    placeholder="07xxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-600">Address (optional)</label>
                  <input
                    className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-rose-100 focus:border-rose-300"
                    placeholder="e.g. Colombo"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-600">Password</label>
                  <input
                    className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-rose-100 focus:border-rose-300"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-600">Confirm Password</label>
                  <input
                    className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-rose-100 focus:border-rose-300"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cx(
                  "w-full h-11 rounded-xl font-extrabold text-sm text-white transition shadow-sm",
                  loading ? "bg-rose-300 cursor-not-allowed" : "bg-rose-500 hover:bg-rose-600"
                )}
              >
                {loading ? "Creating account..." : "Create account"}
              </button>

              <div className="pt-2 text-xs text-slate-500">
                By joining, you agree to our{" "}
                <span className="font-bold text-slate-700 hover:underline cursor-pointer">Terms</span> and{" "}
                <span className="font-bold text-slate-700 hover:underline cursor-pointer">Privacy Policy</span>.
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}