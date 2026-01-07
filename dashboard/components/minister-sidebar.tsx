"use client"

import { Home, TrendingUp, Map, School, FileText, BarChart3, Settings, Globe } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Overview", href: "/minister", icon: Home },
  { name: "Regional Analysis", href: "/minister/regional", icon: Map },
  { name: "School Performance", href: "/minister/schools", icon: School },
  { name: "Policy Impact", href: "/minister/policy", icon: TrendingUp },
  { name: "National Trends", href: "/minister/trends", icon: Globe },
  { name: "Reports", href: "/minister/reports", icon: FileText },
  { name: "Analytics", href: "/minister/analytics", icon: BarChart3 },
  { name: "Settings", href: "/minister/settings", icon: Settings },
]

export function MinisterSidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <School className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-sidebar-foreground text-sm">Ministry of Education</h2>
            <p className="text-xs text-muted-foreground">Government Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
