"use client"

import { LayoutDashboard, Users, Heart, TrendingUp, Settings, FileText, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

const navItems = [
  { icon: LayoutDashboard, label: "Overview", active: true },
  { icon: Heart, label: "Campaigns", active: false },
  { icon: Users, label: "Donors", active: false },
  { icon: TrendingUp, label: "Analytics", active: false },
  { icon: FileText, label: "Reports", active: false },
  { icon: Bell, label: "Notifications", active: false },
  { icon: Settings, label: "Settings", active: false },
]

export function DashboardSidebar() {
  const [activeItem, setActiveItem] = useState("Overview")

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-sidebar-foreground">School Donations</h2>
              <p className="text-xs text-muted-foreground">Admin Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveItem(item.label)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                activeItem === item.label
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  )
}
