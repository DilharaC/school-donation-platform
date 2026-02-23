// src/components/Sidebar.tsx
import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Heart, Users, TrendingUp, FileText, Bell, Settings } from "./Icons";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/overview" },
  { icon: Heart, label: "Campaigns", path: "/Campaign" },
  { icon: Users, label: "Donors", path: "/Donors" },
  { icon: TrendingUp, label: "Analytics", path: "/analytics" },
  { icon: FileText, label: "Reports", path: "/reports" },
  { icon: Bell, label: "Notifications", path: "/notifications" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-40 flex flex-col">
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <div className="w-5 h-5 text-white">
                <Heart />
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">School Donations</h2>
              <p className="text-xs text-slate-500">Admin Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-col items-start justify-start px-3 py-2 gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `relative w-full flex items-center gap-3 px-3 h-9 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-blue-600"
                    : "text-slate-600 hover:bg-slate-50"
                }`
              }
            >
              <div className="w-4 h-4 shrink-0">
                <item.icon />
              </div>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
