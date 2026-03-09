// src/components/MinistryLayout.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {  NavLink, Outlet, useNavigate } from "react-router-dom";
import "../css/index.css";

/** =======================
 *  API
 *  ======================= */
const API_ROOT = "http://localhost:8000";
const API_BASE = `${API_ROOT}/api`;

/** =======================
 *  Icons
 *  ======================= */
// const Search = () => (
//   <svg
//     xmlns="http://www.w3.org/2000/svg"
//     width="22"
//     height="22"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <circle cx="11" cy="11" r="8" />
//     <path d="m21 21-4.3-4.3" />
//   </svg>
// );

// const Bell = () => (
//   <svg
//     xmlns="http://www.w3.org/2000/svg"
//     width="22"
//     height="22"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
//     <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
//   </svg>
// );

const LayoutDashboard = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

const Users = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const Heart = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const TrendingUp = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const FileText = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </svg>
);

const DollarSign = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const School = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 10h18" />
    <path d="M7 10v10" />
    <path d="M17 10v10" />
    <path d="M5 6l7-3 7 3" />
    <path d="M6 20h12" />
  </svg>
);

type NavItem = { icon: React.FC; label: string; to: string };

const ministryNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Overview", to: "/ministry/overview" },
  { icon: School, label: "Schools", to: "/ministry/schools" },
  { icon: Users, label: "Donors", to: "/ministry/donors" },
  { icon: Heart, label: "Campaigns", to: "/ministry/campaigns" },
  { icon: DollarSign, label: "Donations", to: "/ministry/donations" },
  { icon: TrendingUp, label: "Analytics", to: "/ministry/analytics" },
  { icon: FileText, label: "Reports", to: "/ministry/reports" },
 
];

const cx = (...s: Array<string | false | null | undefined>) =>
  s.filter(Boolean).join(" ");

const initialsFrom = (name?: string | null) => {
  const s = (name || "").trim();
  if (!s) return "M";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "M";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
};

type OverviewRes = {
  ministry?: {
    ministry_id?: number;
    name?: string;
    email?: string | null;
  };
};

const MinistryLayout: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [ministryName, setMinistryName] = useState("Ministry");
  const [ministryEmail, setMinistryEmail] = useState("ministry@example.com");

  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const title = useMemo(() => `Hello ${ministryName}!`, [ministryName]);

  useEffect(() => {
    let alive = true;

    const loadMinistry = async () => {
      try {
        const res = await axios.get<OverviewRes>(`${API_BASE}/ministry/overview`, {
          withCredentials: true,
        });

        if (!alive) return;

        setMinistryName(res.data?.ministry?.name || "Ministry");
        setMinistryEmail(res.data?.ministry?.email || "ministry@example.com");
      } catch (error) {
        console.error("Failed to load ministry info:", error);
        if (!alive) return;
        setMinistryName("Ministry");
        
      }
    };

    loadMinistry();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // const onLogout = () => {
  //   localStorage.removeItem("token");
  //   localStorage.removeItem("user");
  //   localStorage.removeItem("auth");
  //   sessionStorage.removeItem("token");
  //   sessionStorage.removeItem("user");
  //   sessionStorage.removeItem("auth");
  //   setMenuOpen(false);
  //   navigate("/");
  // };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col fixed inset-y-0 left-0">
        <div className="px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <School />
            </div>
            <div>
              <p className="font-semibold leading-5">Ministry</p>
              <p className="text-sm text-slate-300">Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="px-3 py-4 space-y-1 flex-1">
          {ministryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === "/ministry"}
                className={({ isActive }) =>
                  cx(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition",
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? "text-blue-400" : "text-slate-400"}>
                      <Icon />
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-400 mb-3">Quick Actions</p>
          <div className="space-y-2">
            <button
              onClick={() => navigate("/ministry/schools")}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-2 text-sm"
            >
              Manage Schools
            </button>
         
            <button
              onClick={() => navigate("/ministry/reports")}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-2 text-sm"
            >
              Export Reports
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage schools, donors, campaigns, and reports
              </p>
            </div>

            <div className="flex items-center gap-3">
         

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-3 pl-2"
                  aria-label="Account menu"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold">
                    {initialsFrom(ministryName)}
                  </div>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-900">
                        {ministryName}
                      </p>
                      <p className="text-xs text-slate-500">{ministryEmail}</p>
                    </div>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/ministry/overview");
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700"
                    >
                      Overview
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/");
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700"
                    >
                      Home
                    </button>

                    <div className="border-t border-slate-100" />

                 
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MinistryLayout;