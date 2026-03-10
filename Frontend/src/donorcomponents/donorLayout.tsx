// src/components/DonorLayout.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
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

const Bell = () => (
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
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

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

const Settings = () => (
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
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

type NavItem = { icon: React.FC; label: string; to: string };

const donorNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/donor" },
  { icon: DollarSign, label: "My Donations", to: "/donor/mydonations" },
  { icon: School, label: "Schools", to: "/donor/schools" },
  { icon: Bell, label: "Notifications", to: "/donor/donornotifications" },
  { icon: Settings, label: "Settings", to: "/donor/settings" },
];

const cx = (...s: Array<string | false | null | undefined>) =>
  s.filter(Boolean).join(" ");

const initialsFrom = (name?: string | null) => {
  const s = (name || "").trim();
  if (!s) return "D";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "D";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
};

type OverviewRes = {
  donor: {
    donor_id: number;
    name: string;
    email?: string | null;
  };
};

const DonorLayout: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  // const [searchText, setSearchText] = useState("");
  const [donorName, setDonorName] = useState("Donor");
  const [donorEmail, setDonorEmail] = useState("donor@example.com");

  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const title = useMemo(() => `Hello ${donorName}!`, [donorName]);

  useEffect(() => {
    let alive = true;

    const loadDonor = async () => {
      try {
        const res = await axios.get<OverviewRes>(`${API_BASE}/donor/overview`, {
          withCredentials: true,
        });

        if (!alive) return;

        setDonorName(res.data?.donor?.name || "Donor");
        setDonorEmail(res.data?.donor?.email || "donor@example.com");
      } catch (error) {
        console.error("Failed to load donor info:", error);
        if (!alive) return;
        setDonorName("Donor");
        setDonorEmail("donor@example.com");
      }
    };

    loadDonor();

    return () => {
      alive = false;
    };
  }, []);

  // auto close dropdown when clicking outside
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

  // const handleSearch = () => {
  //   const q = searchText.trim();
  //   if (!q) return;

  //   setMenuOpen(false);
  //   navigate(`/donor/schools?search=${encodeURIComponent(q)}`);
  // };

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
              <Heart />
            </div>
            <div>
              <p className="font-semibold leading-5">Donor</p>
              <p className="text-sm text-slate-300">Portal</p>
            </div>
          </div>
        </div>

        <nav className="px-3 py-4 space-y-1 flex-1">
          {donorNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === "/donor"}
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
              onClick={() => navigate("/donor/schools")}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-2 text-sm"
            >
              Browse Projects
            </button>
            <button
              onClick={() => navigate("/donor/mydonations")}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-2 text-sm"
            >
              View My Donations
            </button>
            <button
              onClick={() => navigate("/donor/settings")}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-2 text-sm"
            >
              Account Settings
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
                Support schools with verified needs
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/donor/donornotifications"
                className="relative w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700"
                aria-label="Notifications"
              >
                <Bell />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
              </Link>

              {/* Profile dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-3 pl-2"
                  aria-label="Account menu"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold">
                    {initialsFrom(donorName)}
                  </div>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-900">{donorName}</p>
                      <p className="text-xs text-slate-500">{donorEmail}</p>
                    </div>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/donor/settings");
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700"
                    >
                      Settings
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

export default DonorLayout;