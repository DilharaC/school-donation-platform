"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Building2, Users, DollarSign, GraduationCap } from "lucide-react"

const stats = [
  {
    title: "Total National Funding",
    value: "$2.4B",
    change: "+12.3%",
    trend: "up",
    icon: DollarSign,
  },
  {
    title: "Schools Participating",
    value: "3,353",
    change: "+156",
    trend: "up",
    icon: Building2,
  },
  {
    title: "Total Donors",
    value: "186,000",
    change: "+8.2%",
    trend: "up",
    icon: Users,
  },
  {
    title: "Student Beneficiaries",
    value: "523,806",
    change: "+3.1%",
    trend: "up",
    icon: GraduationCap,
  },
]

export function MinisterStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="bg-card/50 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
              </div>
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  stat.icon === DollarSign
                    ? "bg-blue-500/10 text-blue-500"
                    : stat.icon === Building2
                      ? "bg-cyan-500/10 text-cyan-500"
                      : stat.icon === Users
                        ? "bg-purple-500/10 text-purple-500"
                        : "bg-green-500/10 text-green-500"
                }`}
              >
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4">
              {stat.trend === "up" ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ${stat.trend === "up" ? "text-green-500" : "text-red-500"}`}>
                {stat.change}
              </span>
              <span className="text-sm text-muted-foreground ml-1">vs last quarter</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
