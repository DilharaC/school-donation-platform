// src/components/LoginModal.tsx (FULL UPDATED)
// ✅ Added: Register as Donor + Register as School buttons (open modals)
// ✅ Keeps: auth:changed, redirect logic, same UI style

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import DonorRegisterModal from "../components/DonorRegisterModal";
import SchoolRegisterModal from "../components/SchoolRegisterModal"; // create same like donor

type User = {
  userType: "donor" | "school";
  name?: string;
  donorName?: string;
  schoolName?: string;
  email?: string;
};

type LoginResponse = {
  success: boolean;
  user?: User;
  message?: string;
};

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

export default function LoginModal({
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

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ NEW: register modals
  const [donorRegOpen, setDonorRegOpen] = useState(false);
  const [schoolRegOpen, setSchoolRegOpen] = useState(false);

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
    setPassword("");
    setIdentifier("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await axios.get("/sanctum/csrf-cookie");
      const res = await axios.post<LoginResponse>("/api/login", { identifier, password });

      if (!res.data?.success || !res.data?.user) {
        setError(res.data?.message || "Login failed.");
        return;
      }

      localStorage.setItem("currentUser", JSON.stringify(res.data.user));
      setCurrentUser(res.data.user);

      window.dispatchEvent(new Event("auth:changed"));

      const redirect = sessionStorage.getItem("afterLoginRedirect");
      if (redirect) {
        sessionStorage.removeItem("afterLoginRedirect");
        resetAndClose();
        navigate(redirect);
        return;
      }

      resetAndClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Server error.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Open register modal (close login modal nicely)
  const openDonorRegister = () => {
    // close login first (smooth)
    resetAndClose();
    // then open register
    setTimeout(() => setDonorRegOpen(true), 50);
  };

  const openSchoolRegister = () => {
    resetAndClose();
    setTimeout(() => setSchoolRegOpen(true), 50);
  };

  // NOTE: login modal hidden when open=false, but register modals can still open.
  // so we render register modals OUTSIDE login modal return too.

  return (
    <>
      {open && (
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
                <img src={leftImageUrl} alt="Login" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/40" />

                <div className="relative p-10 text-white h-full flex flex-col">
                  <div className="text-3xl font-extrabold tracking-tight">Success starts here</div>

                  <ul className="mt-6 space-y-3 text-sm font-semibold">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                        ✓
                      </span>
                      Verified schools & transparent evidence
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                        ✓
                      </span>
                      Track donations and receipts
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                        ✓
                      </span>
                      Help classrooms faster
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right login panel */}
              <div className="p-6 sm:p-8 md:p-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xl font-extrabold text-slate-900">Sign in to your account</div>
                    <div className="text-sm text-slate-500 mt-1">Use Email or School Registration No.</div>
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
                    <label className="text-xs font-extrabold text-slate-600">Email / Registration No</label>
                    <input
                      className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-rose-100 focus:border-rose-300"
                      placeholder="e.g. school@email.com or SCH-REG-2025-001"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                    />
                  </div>

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

                  <button
                    type="submit"
                    disabled={loading}
                    className={cx(
                      "w-full h-11 rounded-xl font-extrabold text-sm text-white transition shadow-sm",
                      loading ? "bg-rose-300 cursor-not-allowed" : "bg-rose-500 hover:bg-rose-600"
                    )}
                  >
                    {loading ? "Signing in..." : "Continue"}
                  </button>

                  {/* ✅ NEW: Register buttons */}
                  <div className="pt-2">
                    <div className="text-xs text-slate-500 mb-2">Don’t have an account?</div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={openDonorRegister}
                        className="h-11 rounded-xl border border-slate-200 bg-white text-slate-900 font-extrabold text-sm hover:bg-slate-50 transition"
                      >
                        Register as Donor
                      </button>

                      <button
                        type="button"
                        onClick={openSchoolRegister}
                        className="h-11 rounded-xl border border-slate-200 bg-white text-slate-900 font-extrabold text-sm hover:bg-slate-50 transition"
                      >
                        Register as School
                      </button>
                    </div>
                  </div>

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
      )}

      {/* ✅ Register modals (open separately) */}
      <DonorRegisterModal
        open={donorRegOpen}
        onClose={() => setDonorRegOpen(false)}
        setCurrentUser={setCurrentUser}
        leftImageUrl={leftImageUrl}
      />

     <SchoolRegisterModal
  open={schoolRegOpen}
  onClose={() => setSchoolRegOpen(false)}
  leftImageUrl={leftImageUrl}
/>
    </>
  );
}