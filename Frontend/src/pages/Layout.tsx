// Layout.tsx (FULL) — wider + no black (uses rose + slate), full-width pages supported
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import LoginModal from "../pages/LoginModal";

interface LayoutProps {
  currentUser: any;
  setCurrentUser: (user: any) => void;
}

const cx = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

const getInitials = (name?: string) => {
  const n = (name || "").trim();
  if (!n) return "U";
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "U";
};

const Layout: React.FC<LayoutProps> = ({ currentUser, setCurrentUser }) => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();

  const DashboardLink = currentUser?.userType === "donor" ? "/donor " : "/school/schooloverview";

  const primaryCta = useMemo(() => {
    if (!currentUser) return { to: "/support-school", label: "Support a School" };
    return currentUser?.userType === "donor"
      ? { to: "/support-school", label: "Support a School" }
      : { to: "/register-school", label: "Register School" };
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await axios.get("http://localhost:8000/sanctum/csrf-cookie", { withCredentials: true });
      await axios.post("http://localhost:8000/api/logout", {}, { withCredentials: true });

      setCurrentUser(null);
      localStorage.removeItem("currentUser");
      setDropdownVisible(false);
      setMobileOpen(false);
      navigate("/");
    } catch (err: any) {
      console.error("Logout failed:", err);
    }
  };
const [loginOpen, setLoginOpen] = useState(false);
// ✅ Listen global event to open LoginModal (ex: from Projects donate button)
useEffect(() => {
  const handler = (e: any) => {
    setLoginOpen(true);

    if (e?.detail?.redirectTo) {
      sessionStorage.setItem("afterLoginRedirect", e.detail.redirectTo);
    }
  };

  window.addEventListener("openLoginModal", handler);
  return () => window.removeEventListener("openLoginModal", handler);
}, []);
  // Close dropdown on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(t)) setDropdownVisible(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  // ESC closes menus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownVisible(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
useEffect(() => {
  const handler = (e: any) => {
    setLoginOpen(true);
    if (e?.detail?.redirectTo) {
      sessionStorage.setItem("afterLoginRedirect", e.detail.redirectTo);
    }
  };
  window.addEventListener("openLoginModal", handler);
  return () => window.removeEventListener("openLoginModal", handler);
}, []);

  // Header hide/show on scroll
  useEffect(() => {
    let lastScrollTop = 0;

    const handleScroll = () => {
      const header = headerRef.current;
      if (!header) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      if (scrollTop === 0) {
        header.classList.remove("-translate-y-full");
        header.classList.remove("shadow-sm");
        header.classList.add("translate-y-0");
      } else if (scrollTop > lastScrollTop) {
        header.classList.add("-translate-y-full");
        header.classList.remove("shadow-sm");
      } else {
        header.classList.remove("-translate-y-full");
        header.classList.add("shadow-sm");
      }

      lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const mainLinks = [
    { to: "/", label: "Home" },
    { to: "/projects", label: "Projects" },
    { to: "/about", label: "About" },
    { to: "/blog", label: "Updates" },
    { to: "/contact", label: "Contact" },
  ];

  const helpLinks = [
    { to: "/support-school", label: "Donate money" },
    { to: "/projects", label: "Fund a project" },
    { to: "/volunteer", label: "Volunteer" },
    { to: "/partner", label: "Partner with us" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Utility bar */}
      <div className="hidden md:block border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 h-10 flex items-center justify-between">
          <div className="text-xs text-slate-500">Transparent donations • Verified schools • Evidence & receipts</div>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
            <Link className="hover:text-slate-900" to="/faq">
              FAQs
            </Link>
            <Link className="hover:text-slate-900" to="/contact">
              Contact
            </Link>
            {currentUser && (
              <Link className="hover:text-slate-900" to="/account">
                Update details
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Header */}
   <header
  ref={headerRef}
  className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm"
>
  <nav className="w-full px-6 sm:px-12 lg:px-20 xl:px-32">
    <div className="flex h-16 lg:h-20 items-center justify-between">
            {/* Brand */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="h-9 w-9 rounded-2xl bg-rose-500 text-white grid place-items-center font-extrabold shadow-sm">
                SD
              </div>
              <div className="leading-tight">
                <div className="font-extrabold tracking-tight group-hover:opacity-90">SchoolDonate</div>
                <div className="text-[11px] text-slate-500 -mt-0.5">Help schools faster</div>
              </div>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {mainLinks.map((x) => (
                <NavLink
                  key={x.to}
                  to={x.to}
                  className={({ isActive }) =>
                    cx(
                      "px-3 py-2 rounded-xl text-sm font-semibold transition",
                      isActive
                        ? "bg-rose-500 text-white shadow-sm"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                    )
                  }
                >
                  {x.label}
                </NavLink>
              ))}

              {/* Group: How you can help */}
              <div className="relative group">
                <button className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition inline-flex items-center gap-2">
                  How you can help
                  <i className="bx bx-chevron-down text-lg" />
                </button>

                <div className="hidden group-hover:block absolute left-0 top-11 w-[420px] rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                  <div className="p-4 border-b border-slate-100">
                    <div className="font-extrabold text-slate-900">Get involved</div>
                    <div className="text-xs text-slate-500 mt-1">Choose a way to help schools faster.</div>
                  </div>
                  <div className="p-2 grid grid-cols-2 gap-1">
                    {helpLinks.map((l) => (
                      <Link
                        key={l.to}
                        to={l.to}
                        className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {/* Mobile menu button */}
              <button
                className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl hover:bg-slate-100 transition"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <i className="bx bx-menu text-2xl text-slate-700" />
              </button>

              {currentUser ? (
                <div ref={dropdownRef} className="relative flex items-center gap-2">
                  {/* Profile */}
                  <button
                    className="h-10 rounded-xl hover:bg-slate-100 transition inline-flex items-center gap-2 px-2"
                    onClick={() => setDropdownVisible((v) => !v)}
                    aria-label="User menu"
                  >
                    <div className="h-9 w-9 rounded-2xl bg-rose-100 text-rose-700 grid place-items-center font-extrabold text-xs">
                      {getInitials(currentUser?.name)}
                    </div>
                    <div className="hidden sm:block text-left leading-tight">
                      <div className="text-sm font-extrabold text-slate-900 max-w-[160px] truncate">
                        {currentUser?.name || "User"}
                      </div>
                      <div className="text-[11px] text-slate-500 -mt-0.5">
                        {currentUser?.userType === "donor" ? "Donor" : "School"}
                      </div>
                    </div>
                    <i className="bx bx-chevron-down text-lg text-slate-600 hidden sm:block" />
                  </button>

                  {/* Dropdown */}
                  {dropdownVisible && (
                    <div className="absolute right-0 top-12 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      <div className="p-4 border-b border-slate-100">
                        <div className="font-extrabold text-slate-900 truncate">{currentUser?.name || "User"}</div>
                        {currentUser?.email && (
                          <div className="text-xs text-slate-500 truncate">{currentUser.email}</div>
                        )}
                      </div>

                      <div className="p-2">
                        <Link
                          to={DashboardLink}
                          onClick={() => setDropdownVisible(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                        >
                          <i className="bx bx-grid-alt text-lg" />
                          Dashboard
                        </Link>

                        <Link
                          to="/account"
                          onClick={() => setDropdownVisible(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                        >
                          <i className="bx bx-cog text-lg" />
                          Settings
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                        >
                          <i className="bx bx-log-out text-lg" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
             <button
  onClick={() => setLoginOpen(true)}
  className="hidden sm:inline-flex items-center justify-center h-10 px-4 rounded-xl font-extrabold text-sm text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 transition"
>
  Login
</button>
              )}

              {/* Primary CTA */}
              <Link
                to={primaryCta.to}
                className="inline-flex items-center justify-center h-10 px-4 rounded-xl font-extrabold text-sm text-white bg-rose-500 hover:bg-rose-600 transition shadow-sm"
              >
                {primaryCta.label}
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[88%] max-w-sm bg-white shadow-2xl">
            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200">
              <div className="font-extrabold">Menu</div>
              <button
                className="h-10 w-10 rounded-xl hover:bg-slate-100 grid place-items-center"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <i className="bx bx-x text-2xl text-slate-700" />
              </button>
            </div>

            <div className="p-3">
              <div className="rounded-2xl border border-slate-200 p-2">
                {mainLinks.map((x) => (
                  <Link
                    key={x.to}
                    to={x.to}
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                  >
                    {x.label}
                  </Link>
                ))}
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 p-2">
                <div className="px-3 py-2 text-xs font-extrabold text-slate-500">How you can help</div>
                {helpLinks.map((x) => (
                  <Link
                    key={x.to}
                    to={x.to}
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                  >
                    {x.label}
                  </Link>
                ))}
              </div>

              {!currentUser ? (
               <button
  onClick={() => {
    setMobileOpen(false);
    setLoginOpen(true);
  }}
  className="mt-3 block h-11 w-full rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-sm"
>
  Login
</button>
              ) : (
                <Link
                  to={DashboardLink}
                  onClick={() => setMobileOpen(false)}
                  className="mt-3 block h-11 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-sm grid place-items-center"
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONTENT
          IMPORTANT: full-width pages (hero sections) can control their own max-width.
          If you want ALL pages constrained, change this to max-w-7xl container again.
      */}
      <main className="px-0">
        <Outlet />
      </main>

      {/* Footer */}
   <footer className="bg-gradient-to-br from-[#0B1B3A] via-[#0E2148] to-[#0B1B3A] text-white">

  <div className="mx-auto max-w-7xl px-6 sm:px-10 py-16">

    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">

      {/* Brand */}
      <div>
        <div className="text-xl font-extrabold tracking-tight">
          SchoolDonate
        </div>
        <p className="text-sm text-slate-300 mt-4 leading-relaxed max-w-xs">
          Verified schools, transparent evidence, and real measurable impact.
        </p>
      </div>

      {/* Get involved */}
      <div>
        <div className="text-sm font-extrabold uppercase tracking-wide text-white">
          Get involved
        </div>
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <Link className="block hover:text-white transition" to="/support-school">
            Donate money
          </Link>
          <Link className="block hover:text-white transition" to="/projects">
            Fund a project
          </Link>
          <Link className="block hover:text-white transition" to="/volunteer">
            Volunteer
          </Link>
        </div>
      </div>

      {/* Learn */}
      <div>
        <div className="text-sm font-extrabold uppercase tracking-wide text-white">
          Learn
        </div>
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <Link className="block hover:text-white transition" to="/about">
            About
          </Link>
          <Link className="block hover:text-white transition" to="/faq">
            FAQs
          </Link>
          <Link className="block hover:text-white transition" to="/blog">
            Updates
          </Link>
        </div>
      </div>

      {/* Contact */}
      <div>
        <div className="text-sm font-extrabold uppercase tracking-wide text-white">
          Contact
        </div>
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <div className="flex items-center gap-3">
            <i className="bx bx-envelope text-base" />
            support@schooldonate.lk
          </div>
          <div className="flex items-center gap-3">
            <i className="bx bx-map text-base" />
            Colombo, Sri Lanka
          </div>
        </div>
      </div>

    </div>

    {/* Bottom bar */}
    <div className="mt-14 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-400">
      <div>
        &copy; 2026 SchoolDonate. All Rights Reserved.
      </div>

      <div className="flex gap-6">
        <Link to="/privacy" className="hover:text-white transition">
          Privacy
        </Link>
        <Link to="/terms" className="hover:text-white transition">
          Terms
        </Link>
      </div>
    </div>

  </div>
</footer>
<LoginModal
  open={loginOpen}
  onClose={() => setLoginOpen(false)}
  setCurrentUser={setCurrentUser}
/>
    </div>
  );
};

export default Layout;