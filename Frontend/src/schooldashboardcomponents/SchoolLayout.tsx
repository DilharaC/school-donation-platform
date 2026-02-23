// src/components/SchoolLayout.tsx
import React, { useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import "../css/index.css";

// =======================
// Icons (same style)
// =======================
const Search = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const Bell = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const LayoutDashboard = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

const FileText = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </svg>
);

const Heart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const Settings = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const SchoolIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10h18" />
    <path d="M7 10v10" />
    <path d="M17 10v10" />
    <path d="M5 6l7-3 7 3" />
    <path d="M6 20h12" />
  </svg>
);

const ClipboardList = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 12h6" />
    <path d="M9 16h6" />
  </svg>
);

type NavItem = { icon: React.FC; label: string; to: string };

const schoolNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Overview", to: "/school/schooloverview" },
  { icon: SchoolIcon, label: "My School", to: "/school/myschool" },
  { icon: ClipboardList, label: "My Requests", to: "/school/myrequests" },
  { icon: Heart, label: "Donations", to: "/school/donations" },
  { icon: FileText, label: "Documents", to: "/school/documents" },
  { icon: Bell, label: "Notifications", to: "/school/notifications" },
  { icon: Settings, label: "Settings", to: "/school/settings" },

  // Optional: if admin access exists
  // { icon: LayoutDashboard, label: "Switch to Admin", to: "/overview" },
];

const SchoolLayout: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  // change title later using location pathname if you want
  const title = useMemo(() => "Hello School!", []);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col fixed inset-y-0 left-0">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <SchoolIcon />
            </div>
            <div>
              <p className="font-semibold leading-5">School</p>
              <p className="text-sm text-slate-300">Dashboard</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 py-4 space-y-1 flex-1">
          {schoolNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.label}
                to={item.to}
                end
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition
                  ${isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/60 hover:text-white"}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`${isActive ? "text-blue-400" : "text-slate-400"}`}>
                      <Icon />
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-400 mb-3">Quick Actions</p>
          <div className="space-y-2">
            <button className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-2 text-sm">
              + Create Request
            </button>
            <button className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-2 text-sm">
              Upload Document
            </button>
            <button className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-2 text-sm">
              View Donations
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-80">
                <span className="text-slate-500">
                  <Search />
                </span>
                <input
                  className="bg-transparent outline-none text-sm w-full text-slate-700"
                  placeholder="Search requests, donations..."
                />
              </div>

              {/* Notifications */}
              <button
                className="relative w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700"
                aria-label="Notifications"
              >
                <Bell />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-3 pl-2"
                  aria-label="Account menu"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-slate-900">School</p>
                    <p className="text-xs text-slate-500">Account</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold">
                    S
                  </div>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-900">School Account</p>
                      <p className="text-xs text-slate-500">Signed in</p>
                    </div>
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">
                      Profile
                    </button>
                    <div className="border-t border-slate-100" />
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-rose-600">
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SchoolLayout;